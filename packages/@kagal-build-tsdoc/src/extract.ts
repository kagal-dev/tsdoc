import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import type {
  Extractor as ExtractorClass,
  ExtractorConfig as ExtractorConfigClass,
} from '@microsoft/api-extractor';
import type * as TSModule from 'typescript';

import {
  redirectStubDependencies,
  type TypeScriptModule,
} from './redirect';
import {
  type ConcreteNewlineKind,
  type NewlineKind,
  resolveNewlineKind,
  serialiseJSON,
} from './utils';

/** Runtime shape of the lazily-required `@microsoft/api-extractor`. */
interface APIExtractorModule {
  Extractor: typeof ExtractorClass
  ExtractorConfig: typeof ExtractorConfigClass
}

/** `require` rooted at this module, for resolving api-extractor. */
const requireHere = createRequire(import.meta.url);

/**
 * Resolve a package's entry from a project folder, or `undefined`
 * when it is not installed there. Pure resolution — does not load.
 */
function resolveFrom(
  projectFolder: string,
  request: string,
): string | undefined {
  try {
    return createRequire(path.join(projectFolder, 'package.json'))
      .resolve(request);
  } catch {
    return undefined;
  }
}

/**
 * The bundled compiler's entry — api-extractor's own `typescript`
 * resolution, read through its main so it tracks that dependency's
 * install. This is the pinned engine the alias grafts over and the
 * analysis falls back to.
 */
function resolveBundledTypeScriptEntry(): string {
  const aeMain = requireHere.resolve('@microsoft/api-extractor');
  return createRequire(aeMain).resolve('typescript');
}

/**
 * Read the version of the `typescript` the consumer resolves, via
 * its `package.json`. Undefined when that read fails: 7.0.x exports
 * `./package.json` explicitly while 5.9/6.0 ship no exports map, so
 * a failed read means an install we do not recognise — treated as
 * "version unknown" and left to the safe fallback.
 */
function consumerTypeScriptVersion(
  projectFolder: string,
): string | undefined {
  const manifest = resolveFrom(projectFolder, 'typescript/package.json');
  if (manifest === undefined) {
    return undefined;
  }
  try {
    const { version } = requireHere(manifest) as { version?: unknown };
    return typeof version === 'string' ? version : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The adoptable-engine range: compilers that still expose the
 * classic JS `ts.*` API, `>=5.9 <7`. Two-sided by design — a 4.x
 * install is no more adoptable than TS7's native stub. This is the
 * alias gate, deliberately narrower than the peer range (which
 * declares who may *install* us, not what we hand api-extractor).
 */
function isAdoptableEngine(version: string): boolean {
  const [major, minor] = version
    .split('.', 2)
    .map((part) => Number.parseInt(part, 10));
  if (!Number.isInteger(major) || !Number.isInteger(minor)) {
    return false;
  }
  if (major === 6) {
    return true;
  }
  return major === 5 && minor >= 9;
}

/**
 * Duck-type the classic compiler namespace: a genuine engine
 * exposes `createProgram` and a `version` string. TS7's main export
 * is a version stub with neither — and this also catches any future
 * not-a-compiler resolution shape, not just that one.
 */
function exposesClassicCompiler(exports: unknown): boolean {
  if (typeof exports !== 'object' || exports === null) {
    return false;
  }
  const ts = exports as { createProgram?: unknown; version?: unknown };
  return typeof ts.createProgram === 'function' &&
    typeof ts.version === 'string';
}

/**
 * Make api-extractor analyse with the compiler the *consumer*
 * installed — the same TypeScript that emitted the declarations —
 * rather than the version api-extractor pins. api-extractor binds
 * whatever `typescript` resolves from its own module, so a mismatch
 * leaves it parsing the consumer's `.d.ts` with a foreign engine and
 * emitting a version-mismatch notice that advises upgrading API
 * Extractor. Aligning the engine keeps analysis on the compiler that
 * produced the declarations and clears that notice.
 *
 * The alias is primed in the shared CommonJS module cache *before*
 * api-extractor is first required, so its analyser modules capture
 * the consumer's compiler when they evaluate `require('typescript')`
 * at load time. A no-op when the consumer ships no TypeScript,
 * already resolves to the same install, or resolves an engine
 * outside the adoptable range — a TS7 consumer's `typescript` is a
 * version stub, not a compiler, so it is left to the bundled engine
 * deliberately rather than grafted in to crash api-extractor.
 *
 * The alias is process-global and load-once: it mutates a shared
 * module-cache slot that is never restored, and api-extractor
 * captures whichever compiler is aliased the first time its analyser
 * loads. One extraction process therefore serves a single consumer
 * engine — a second consumer pinned to a different engine in the same
 * process keeps the first. Callers run one build process per
 * consumer, so this holds in practice; it is a constraint to
 * preserve, not a latent bug to work around.
 */
function preferConsumerTypeScript(projectFolder: string): void {
  const consumerEntry = resolveFrom(projectFolder, 'typescript');
  if (consumerEntry === undefined) {
    return;
  }
  const bundledEntry = resolveBundledTypeScriptEntry();
  if (bundledEntry === consumerEntry) {
    return;
  }
  // Cheap pre-check: only adopt an engine inside the adoptable
  // range. An unknown version resolves to `undefined` and skips the
  // alias — the safe path, falling back to the bundled compiler.
  const version = consumerTypeScriptVersion(projectFolder);
  if (version === undefined || !isAdoptableEngine(version)) {
    return;
  }
  // Load the consumer compiler under its own path, then alias the
  // bundled path's cache slot to that same module record so every
  // `require('typescript')` resolving to the bundled path returns
  // the consumer's exports.
  requireHere(consumerEntry);
  // Belt-and-braces: a successful require always populates the
  // cache, and the loaded module must expose the classic compiler
  // namespace before its slot is grafted over the bundled path.
  // Skipping the alias falls back to the pinned compiler rather
  // than crashing.
  const consumerModule = requireHere.cache[consumerEntry];
  if (
    consumerModule !== undefined &&
    exposesClassicCompiler(consumerModule.exports)
  ) {
    requireHere.cache[bundledEntry] = consumerModule;
  }
}

/**
 * Lazily load api-extractor after aliasing the consumer's
 * TypeScript into the module cache — see
 * {@link preferConsumerTypeScript}. The lazy load is load-bearing:
 * a static import would evaluate api-extractor's analyser modules
 * (and capture its pinned compiler) before the alias is in place.
 */
function loadAPIExtractor(projectFolder: string): APIExtractorModule {
  preferConsumerTypeScript(projectFolder);
  return requireHere('@microsoft/api-extractor') as APIExtractorModule;
}

/**
 * The compiler namespace analysis runs on: api-extractor's own
 * `typescript` resolution, read *after* {@link loadAPIExtractor}
 * has primed the cache — the consumer's adopted engine when the
 * alias applied, the bundled compiler otherwise. The stub redirect
 * derives declarations with this same engine so what it derives is
 * what the analysis parses.
 */
function loadAnalysisTypeScript(): TypeScriptModule {
  const bundledEntry = resolveBundledTypeScriptEntry();
  return requireHere(bundledEntry) as TypeScriptModule;
}

/** Consumer tsconfig, parsed to its effective compiler options. */
interface ParsedTSConfig {
  /** Effective options, extends chain applied. */
  options: TSModule.CompilerOptions
  /** Base directory relative `paths` entries resolve against. */
  pathsBase: string
}

/**
 * Parse the consumer's tsconfig with the analysis engine, for the
 * stub redirect: detection resolves modules under the consumer's
 * effective options, and any pre-existing `paths` must survive the
 * override merge. `undefined` when the file cannot be read or
 * parsed — api-extractor reports that on its own terms.
 */
function parseConsumerTSConfig(
  ts: TypeScriptModule,
  tsconfigPath: string,
): ParsedTSConfig | undefined {
  const { config, error } =
    ts.readConfigFile(tsconfigPath, ts.sys.readFile) as
      { config?: unknown; error?: unknown };
  if (error !== undefined || config === undefined) {
    return undefined;
  }
  const basePath = path.dirname(tsconfigPath);
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, basePath);
  const pathsBase = parsed.options.pathsBasePath;
  return {
    options: parsed.options,
    pathsBase: typeof pathsBase === 'string' ? pathsBase : basePath,
  };
}

/**
 * Merge redirect mappings over the consumer's own `paths`, making
 * the consumer's relative entries absolute — the override's base
 * path differs from the config the entries were written in, so
 * only absolute entries keep their meaning across the move.
 */
function mergeRedirectPaths(
  consumer: ParsedTSConfig,
  redirects: Record<string, string[]>,
): Record<string, string[]> {
  const merged: Record<string, string[]> = {};
  for (const [pattern, entries] of
    Object.entries(consumer.options.paths ?? {})) {
    merged[pattern] = entries.map((entry) =>
      path.isAbsolute(entry) ?
        entry :
        path.resolve(consumer.pathsBase, entry));
  }
  return { ...merged, ...redirects };
}

/** api-extractor `compiler` configuration, either shape. */
interface CompilerConfig {
  overrideTsconfig?: object
  tsconfigFilePath?: string
}

/**
 * Compose api-extractor's `compiler` configuration: the consumer's
 * tsconfig as-is, or — when a bundled dependency's `types` resolves
 * to a development stub — an override extending that tsconfig with
 * `paths` mappings that remap each stubbed dependency onto
 * declarations derived from its source (see ./redirect), so
 * analysis parses compiled declarations instead of following the
 * stub into raw source.
 *
 * Must run after {@link loadAPIExtractor}: the redirect derives
 * declarations with the engine the analysis will use, and that is
 * only settled once the consumer-compiler alias has been decided.
 *
 * @throws UnbuiltDependencyError when a stub is detected but
 * declarations cannot be derived from its source
 */
function resolveCompilerConfig(
  projectFolder: string,
  entryFile: string,
  tsconfigPath: string,
  dependencies: readonly string[],
): CompilerConfig {
  const passthrough = { tsconfigFilePath: tsconfigPath };
  if (dependencies.length === 0) {
    return passthrough;
  }
  const ts = loadAnalysisTypeScript();
  const consumer = parseConsumerTSConfig(ts, tsconfigPath);
  if (consumer === undefined) {
    return passthrough;
  }
  const redirects = redirectStubDependencies({
    compilerOptions: consumer.options,
    dependencies,
    entryFile,
    projectFolder,
    ts,
  });
  if (redirects === undefined) {
    return passthrough;
  }
  return {
    overrideTsconfig: {
      extends: path.resolve(tsconfigPath),
      compilerOptions: {
        paths: mergeRedirectPaths(consumer, redirects),
      },
    },
  };
}

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
   * Line endings for the written manifest. The manifest is
   * consumer territory, so the default follows the host OS rather
   * than api-extractor's CRLF default — the file matches whatever
   * the consuming repo normalises to. Force `'lf'`/`'crlf'` to
   * pin it regardless of platform.
   *
   * @defaultValue `'os'`
   */
  newlineKind?: NewlineKind
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
  newlineKind: ConcreteNewlineKind,
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
  writeFileSync(outputPath, serialiseJSON(root, newlineKind));
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
 * A bundled dependency still in its development-stub state —
 * declarations re-exporting TypeScript source, as `unbuild --stub`
 * writes — is not followed into source: declarations are derived
 * from that source with the analysis compiler and the dependency
 * is remapped onto them, so extraction completes as if it were
 * built (see ./redirect).
 *
 * Analysis runs on the TypeScript that the package at
 * {@link ExtractEntryOptions.projectFolder} resolves — not the
 * version api-extractor bundles — so declarations are parsed by
 * the same compiler that emitted them.
 *
 * Caller-owned: this helper handles one entry. The caller (a
 * bundler hook or a script) iterates its own entry list and
 * invokes this per entry.
 *
 * @throws UnbuiltDependencyError when a stubbed dependency's
 * declarations cannot be derived from its source
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

  // The manifest is consumer territory, not ours: the helper
  // defaults to the host OS's native line endings (rather than
  // api-extractor's CRLF default) for anything but an explicit
  // `'lf'`/`'crlf'`, so the file matches whatever the consuming
  // repo normalises to and the same concrete kind feeds both the
  // extractor write and the import-path rewrite.
  const newlineKind = resolveNewlineKind(options.newlineKind);

  const { Extractor, ExtractorConfig } =
    loadAPIExtractor(options.projectFolder);

  const bundledPackages = bundledPackagesFromManifest(packageFullPath);
  const compiler = resolveCompilerConfig(
    options.projectFolder, entryFile, tsconfigPath, bundledPackages,
  );

  const config = ExtractorConfig.prepare({
    configObject: {
      projectFolder: options.projectFolder,
      mainEntryPointFilePath: entryFile,
      newlineKind,
      bundledPackages,
      compiler,
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
    injectEntryImportPath(outputPath, entryName, newlineKind);
  }

  return { outputPath, warningCount: result.warningCount };
}
