import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { Extractor, ExtractorConfig } from '@microsoft/api-extractor';

/**
 * Options for {@link extractEntryManifest}. Every override is
 * optional; the helper composes sensible `dist/<entryName>.*`
 * defaults from {@link ExtractEntryOptions.projectFolder}
 * when an override is omitted.
 */
export interface ExtractEntryOptions {
  /**
   * Rolled declaration file the extractor parses. Overrides the
   * default `<projectFolder>/dist/<entryName>.d.mts`.
   */
  entryFile?: string
  /**
   * Entry name. Drives the default declaration and output paths
   * (`<projectFolder>/dist/<entryName>.d.mts` and
   * `<projectFolder>/dist/<entryName>.api.json`).
   *
   * @defaultValue `'index'`
   */
  entryName?: string
  /**
   * Output directory holding the rolled declaration and the
   * manifest. Replaces the `dist` segment of the default
   * `entryFile`/`outputPath`; resolved against
   * {@link ExtractEntryOptions.projectFolder} when relative.
   *
   * @defaultValue `'dist'`
   */
  outDir?: string
  /**
   * Where the API manifest is written. Overrides the default
   * `<projectFolder>/dist/<entryName>.api.json`.
   */
  outputPath?: string
  /**
   * Package manifest path. Overrides the default
   * `<projectFolder>/package.json`. Its `dependencies` keys
   * drive dependency bundling.
   */
  packageFullPath?: string
  /** Package root. Used as api-extractor's `<projectFolder>`. */
  projectFolder: string
  /**
   * Compiler config for api-extractor. Overrides the default
   * `<projectFolder>/tsconfig.json`.
   */
  tsconfigPath?: string
}

/** Result of a successful {@link extractEntryManifest} call. */
export interface ExtractEntryResult {
  /** Absolute path of the written API manifest. */
  outputPath: string
  /** Warnings reported by api-extractor (errors throw). */
  warningCount: number
}

/** Effective paths composed by {@link resolveEntryPaths}. */
interface ResolvedEntryPaths {
  entryFile: string
  entryName: string
  outputPath: string
  packageFullPath: string
  tsconfigPath: string
}

/**
 * Compose the effective paths from {@link ExtractEntryOptions},
 * filling the documented `dist/<entryName>.*` defaults for any
 * omitted override. Pure path math — no filesystem access.
 */
function resolveEntryPaths(
  options: ExtractEntryOptions,
): ResolvedEntryPaths {
  const entryName = options.entryName ?? 'index';
  const outDir = path.resolve(
    options.projectFolder,
    options.outDir ?? 'dist',
  );
  return {
    entryFile: options.entryFile ??
      path.join(outDir, `${entryName}.d.mts`),
    entryName,
    outputPath: options.outputPath ??
      path.join(outDir, `${entryName}.api.json`),
    packageFullPath: options.packageFullPath ??
      path.join(options.projectFolder, 'package.json'),
    tsconfigPath: options.tsconfigPath ??
      path.join(options.projectFolder, 'tsconfig.json'),
  };
}

/**
 * Runtime dependency names from the package manifest, for
 * api-extractor's `bundledPackages`. A symbol re-exported from
 * a dependency is part of the package contract, so every
 * runtime dependency is bundled — api-extractor inlines the
 * referenced declarations into the doc model as if they were
 * declared in the package, and dependencies the entry never
 * references are a no-op.
 */
function bundledPackagesFromManifest(
  packageFullPath: string,
): string[] {
  const manifest: unknown = JSON.parse(
    readFileSync(packageFullPath, 'utf8'),
  );
  if (
    typeof manifest === 'object' &&
    manifest !== null &&
    'dependencies' in manifest &&
    typeof manifest.dependencies === 'object' &&
    manifest.dependencies !== null
  ) {
    return Object.keys(manifest.dependencies);
  }
  return [];
}

/**
 * Rewrite the `<fromPrefix>` of every `canonicalReference` string
 * at or beneath {@link node}, in place. Used to graft an entry
 * point's import path onto the references the doc model stores
 * verbatim (the excerpt-token links it reads back as-is rather
 * than rebuilding from the item hierarchy).
 */
function rewriteCanonicalReferences(
  node: unknown,
  fromPrefix: string,
  toPrefix: string,
): void {
  if (Array.isArray(node)) {
    for (const item of node) {
      rewriteCanonicalReferences(item, fromPrefix, toPrefix);
    }
    return;
  }
  if (typeof node !== 'object' || node === null) {
    return;
  }
  const record = node as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    if (
      key === 'canonicalReference' &&
      typeof value === 'string' &&
      value.startsWith(fromPrefix)
    ) {
      record[key] = toPrefix + value.slice(fromPrefix.length);
    } else {
      rewriteCanonicalReferences(value, fromPrefix, toPrefix);
    }
  }
}

/**
 * Disambiguate a non-default entry by grafting its name onto the
 * doc model's entry point as an import path. api-extractor emits
 * one entry point per invocation with an empty import path, so
 * every entry sharing a manifest collides on `@scope/pkg!` when a
 * consumer merges the per-entry models. Setting the entry point's
 * name (its `importPath`) to {@link entryName} makes the model
 * rebuild each member's canonical reference as
 * `@scope/pkg/<entry>!`, and the excerpt-token links — stored
 * rather than rebuilt — are rewritten to match. The package name
 * itself is untouched, so the package keeps its real identity and
 * consumers key by the entry point.
 */
function injectEntryImportPath(
  outputPath: string,
  entryName: string,
): void {
  const root = JSON.parse(readFileSync(outputPath, 'utf8')) as {
    members?: { name?: string }[]
    name?: unknown
  };
  const packageName = root.name;
  const entryPoint = root.members?.[0];
  if (typeof packageName !== 'string' || entryPoint === undefined) {
    return;
  }
  entryPoint.name = entryName;
  rewriteCanonicalReferences(
    entryPoint,
    `${packageName}!`,
    `${packageName}/${entryName}!`,
  );
  writeFileSync(outputPath, JSON.stringify(root, undefined, 2) + '\n');
}

/**
 * Run api-extractor against a single rolled declaration file and
 * write the resulting API model to disk. Returns `undefined` when
 * the entry file is missing — stub builds skip declarations, so
 * callers can invoke this unconditionally from a build hook.
 *
 * Runtime dependencies are bundled: a symbol re-exported from
 * a dependency is part of the package contract, so its
 * declaration is documented as part of the package itself
 * rather than dropped as foreign.
 *
 * Caller-owned: this helper handles one entry. The caller (a
 * bundler hook or a script) iterates its own entry list and
 * invokes this per entry.
 *
 * @throws when api-extractor reports any error
 */
export function extractEntryManifest(
  options: ExtractEntryOptions,
): ExtractEntryResult | undefined {
  const {
    entryFile,
    entryName,
    outputPath,
    packageFullPath,
    tsconfigPath,
  } = resolveEntryPaths(options);

  if (!existsSync(entryFile)) {
    return undefined;
  }

  const config = ExtractorConfig.prepare({
    configObject: {
      projectFolder: options.projectFolder,
      mainEntryPointFilePath: entryFile,
      bundledPackages: bundledPackagesFromManifest(packageFullPath),
      compiler: { tsconfigFilePath: tsconfigPath },
      docModel: { enabled: true, apiJsonFilePath: outputPath },
      apiReport: { enabled: false },
      dtsRollup: { enabled: false },
    },
    configObjectFullPath: undefined,
    packageJsonFullPath: packageFullPath,
  });

  const result = Extractor.invoke(config, {
    localBuild: true,
    showVerboseMessages: false,
  });

  if (!result.succeeded) {
    throw new Error(
      `api-extractor failed for ${entryFile}: ` +
      `${result.errorCount} errors, ${result.warningCount} warnings`,
    );
  }

  // The default `index` entry keeps the bare package reference;
  // every other entry is grafted onto the entry point's import
  // path so its symbols carry a distinct `@scope/pkg/<entry>!`
  // canonical reference.
  if (entryName !== 'index') {
    injectEntryImportPath(outputPath, entryName);
  }

  return { outputPath, warningCount: result.warningCount };
}
