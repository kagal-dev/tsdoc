// Stub-declaration redirect for extraction. A dependency left in
// its development-stub state (`unbuild --stub` and friends) ships a
// `types` entry that re-exports raw TypeScript source; api-extractor
// can only analyse declarations, so following the stub aborts deep
// inside its analyser. This module detects the stub by resolving
// what its re-exports actually land on, derives real declarations
// from that source with the analysis compiler, and returns tsconfig
// `paths` mappings that remap the dependency onto the derived
// declarations — extraction then proceeds as if the dependency were
// built.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import type * as TSModule from 'typescript';

import { UnbuiltDependencyError } from './errors';

/** The classic compiler namespace detection and emit run on. */
export type TypeScriptModule = typeof TSModule;

/**
 * Module-specifier to mirror-directory mappings in tsconfig
 * `paths` shape, remapping each stubbed dependency onto its
 * derived declarations. Each mapping targets the mirror package's
 * *directory*: resolution then consults the mirror's manifest,
 * which stamps the resolved file with the dependency's `packageId`
 * — the identity api-extractor matches against `bundledPackages`.
 * A file target would resolve but arrive anonymous, and the
 * re-exported symbols would be dropped as foreign.
 */
export type RedirectPaths = Record<string, string[]>;

/** Options for {@link redirectStubDependencies}. */
export interface RedirectStubOptions {
  /**
   * Effective compiler options of the consumer — resolution during
   * detection runs under them, so a stub is judged by the same
   * rules the analysis program would follow it with.
   */
  compilerOptions: TSModule.CompilerOptions
  /** Bundled dependency names (the manifest's `dependencies`). */
  dependencies: readonly string[]
  /** Rolled declaration whose imports name the dependencies. */
  entryFile: string
  /** Consumer package root; hosts the derived-declaration cache. */
  projectFolder: string
  /** The compiler namespace the analysis will run on. */
  ts: TypeScriptModule
}

/**
 * Matches declaration files; same shape api-extractor accepts
 * (`.d.ts`, `.d.mts`, `.d.cts`, and multi-part `.d.*.ts` forms).
 */
const DECLARATION_FILE_RE = /\.d(\.[^./\\]+)?\.(c|m)?ts$/i;

/** True for `.d.ts`/`.d.mts`/`.d.cts` (and `.d.*.ts`) paths. */
function isDeclarationFile(file: string): boolean {
  return DECLARATION_FILE_RE.test(file);
}

/** True for TypeScript *source* paths — `.ts` family, not `.d.*`. */
function isSourceFile(file: string): boolean {
  return /\.(c|m)?tsx?$/i.test(file) && !isDeclarationFile(file);
}

/**
 * Resolve a module specifier the way the analysis program would,
 * or `undefined` when it does not resolve. Detection must share
 * the compiler's own resolution because stubs disguise their
 * targets: modern unbuild stubs write the source specifier with a
 * `.js` extension, so only resolution reveals where it lands.
 */
function resolveModuleFile(
  ts: TypeScriptModule,
  specifier: string,
  containingFile: string,
  options: TSModule.CompilerOptions,
): string | undefined {
  return ts.resolveModuleName(specifier, containingFile, options, ts.sys)
    .resolvedModule?.resolvedFileName;
}

/**
 * A stubbed dependency: where its `types` entry resolved, and the
 * source file each of the stub's re-export specifiers lands on.
 * When the `types` entry itself is a source file the map is empty
 * and the entry is the single derivation target.
 */
interface StubScan {
  stubTargets: Map<string, string>
  typesFile: string
}

/**
 * Scan one dependency's resolved `types` for stub re-exports.
 * Returns `undefined` when the dependency does not resolve or its
 * declarations are genuinely built — the common case, left
 * entirely alone.
 */
function scanDependencyTypes(
  ts: TypeScriptModule,
  dependency: string,
  entryFile: string,
  options: TSModule.CompilerOptions,
): StubScan | undefined {
  const typesFile =
    resolveModuleFile(ts, dependency, entryFile, options);
  if (typesFile === undefined) {
    return undefined;
  }
  const stubTargets = new Map<string, string>();
  if (isSourceFile(typesFile)) {
    // `types` points straight at source — the entry itself is the
    // derivation target, no barrel to rewrite.
    return { stubTargets, typesFile };
  }
  if (!isDeclarationFile(typesFile)) {
    return undefined;
  }
  const info = ts.preProcessFile(
    readFileSync(typesFile, 'utf8'), true, false,
  );
  for (const imported of info.importedFiles) {
    const specifier = imported.fileName;
    if (!specifier.startsWith('.') && !path.isAbsolute(specifier)) {
      // another package's re-export; that package is scanned as a
      // dependency in its own right
      continue;
    }
    if (stubTargets.has(specifier)) {
      continue;
    }
    const target =
      resolveModuleFile(ts, specifier, typesFile, options);
    // Only source specifiers become derivation targets. A stub that
    // also re-exports a sibling *built* declaration would keep that
    // specifier verbatim in the barrel, and — since the whole
    // dependency is remapped into the mirror — resolve it against a
    // file never emitted there. `unbuild --stub` writes a single
    // `export *`, so this mixed shape does not arise in practice; a
    // stub that mixed source and pre-built re-exports would need the
    // built pieces copied into the mirror too.
    if (target !== undefined && isSourceFile(target)) {
      stubTargets.set(specifier, target);
    }
  }
  if (stubTargets.size === 0) {
    return undefined;
  }
  return { stubTargets, typesFile };
}

/** Identity of the package a resolved file belongs to. */
interface PackageIdentity {
  name: string
  root: string
  version: string
}

/**
 * The nearest named `package.json` at or above a resolved file —
 * the package the derived declarations must keep belonging to, so
 * api-extractor's metadata lookup attributes them correctly.
 */
function nearestPackageIdentity(
  fromFile: string,
): PackageIdentity | undefined {
  for (
    let dir = path.dirname(fromFile), parent = path.dirname(dir);
    dir !== parent;
    dir = parent, parent = path.dirname(dir)
  ) {
    const manifestPath = path.join(dir, 'package.json');
    if (!existsSync(manifestPath)) {
      continue;
    }
    const manifest: unknown = JSON.parse(
      readFileSync(manifestPath, 'utf8'),
    );
    if (
      typeof manifest === 'object' && manifest !== null &&
      'name' in manifest && typeof manifest.name === 'string'
    ) {
      const version =
        'version' in manifest && typeof manifest.version === 'string' ?
          manifest.version :
          '0.0.0';
      return { name: manifest.name, root: dir, version };
    }
  }
  return undefined;
}

/** Map a source path onto its declaration-output counterpart. */
function declarationPathFor(sourcePath: string): string {
  return sourcePath.replace(
    /\.(m|c)?tsx?$/,
    (_match, infix: string | undefined) => `.d.${infix ?? ''}ts`,
  );
}

/**
 * Map a declaration path onto the runtime-extension specifier that
 * resolves back to it from a sibling declaration (`.d.mts` is
 * imported as `.mjs`, `.d.ts` as `.js`).
 */
function runtimeSpecifierFor(declarationPath: string): string {
  return declarationPath.replace(
    /\.d\.(m|c)?ts$/,
    (_match, infix: string | undefined) => `.${infix ?? ''}js`,
  );
}

/** POSIX relative specifier from a directory to a file. */
function relativeSpecifier(fromDir: string, toFile: string): string {
  const relative = path.relative(fromDir, toFile)
    .split(path.sep).join('/');
  return relative.startsWith('.') ? relative : `./${relative}`;
}

/**
 * The dependency's own compiler options, when it carries a
 * tsconfig (a workspace sibling does) — its source is compiled the
 * way it would compile itself. An absent config, or one the
 * compiler cannot read or parse, falls back to bare options; the
 * forced emit overrides in {@link deriveDependencyMirror} apply
 * either way.
 */
function dependencyCompilerOptions(
  ts: TypeScriptModule,
  depRoot: string,
): TSModule.CompilerOptions {
  const configPath = path.join(depRoot, 'tsconfig.json');
  if (!existsSync(configPath)) {
    return {};
  }
  const { config, error } =
    ts.readConfigFile(configPath, ts.sys.readFile) as
      { config?: unknown; error?: unknown };
  if (error !== undefined || config === undefined) {
    return {};
  }
  return ts.parseJsonConfigFileContent(config, ts.sys, depRoot).options;
}

/** Absolute path of the derived declaration for a source file. */
function derivedDeclarationPath(
  depRoot: string,
  mirrorRoot: string,
  sourceFile: string,
): string {
  return path.join(
    mirrorRoot,
    declarationPathFor(path.relative(depRoot, sourceFile)),
  );
}

/**
 * Write the mirror's declaration entry: the stub's own text with
 * every source specifier rewritten to resolve to the derived
 * declaration instead, preserving the stub's export shape
 * (`export *`, `export { default }`, …).
 */
function writeMirrorBarrel(
  scan: StubScan,
  depRoot: string,
  mirrorRoot: string,
): string {
  const barrelPath = path.join(
    mirrorRoot, path.relative(depRoot, scan.typesFile),
  );
  let content = readFileSync(scan.typesFile, 'utf8');
  for (const [specifier, target] of scan.stubTargets) {
    const replacement = runtimeSpecifierFor(relativeSpecifier(
      path.dirname(barrelPath),
      derivedDeclarationPath(depRoot, mirrorRoot, target),
    ));
    content = content
      .replaceAll(`'${specifier}'`, `'${replacement}'`)
      .replaceAll(`"${specifier}"`, `"${replacement}"`);
  }
  mkdirSync(path.dirname(barrelPath), { recursive: true });
  writeFileSync(barrelPath, content);
  return barrelPath;
}

/**
 * Derive built declarations for one stubbed dependency into
 * `mirrorRoot`. The mirror replicates the package's layout — a
 * manifest whose `types` names the declaration entry, derived
 * declarations under their source-relative paths — so both the
 * stub's own relative re-exports and api-extractor's package
 * attribution keep working.
 *
 * @throws UnbuiltDependencyError when the compiler cannot derive
 * declarations from the stubbed source
 */
function deriveDependencyMirror(
  ts: TypeScriptModule,
  dependency: string,
  scan: StubScan,
  mirrorRoot: string,
): void {
  const identity = nearestPackageIdentity(scan.typesFile);
  if (identity === undefined) {
    throw new UnbuiltDependencyError(
      dependency, 'no package.json above its types entry',
    );
  }
  const directSource = isSourceFile(scan.typesFile);
  const targets = directSource ?
    [scan.typesFile] :
    [...scan.stubTargets.values()];

  const options: TSModule.CompilerOptions = {
    ...dependencyCompilerOptions(ts, identity.root),
    allowImportingTsExtensions: true,
    composite: false,
    declaration: true,
    // `declarationDir`/`outFile` from the dependency's own tsconfig
    // would divert the emitted declarations away from `outDir`,
    // stranding them where the derived-path check cannot find them;
    // clear both so every declaration lands under `mirrorRoot`.
    declarationDir: undefined,
    declarationMap: false,
    emitDeclarationOnly: true,
    incremental: false,
    noEmit: false,
    outDir: mirrorRoot,
    outFile: undefined,
    rootDir: identity.root,
    skipLibCheck: true,
    tsBuildInfoFile: undefined,
  };
  const program = ts.createProgram(targets, options);
  const emitted = program.emit();
  // Options, syntactic, and emit errors only — semantic diagnostics
  // (`getSemanticDiagnostics`/`getPreEmitDiagnostics`) are excluded
  // deliberately. Derivation is best-effort: a stub's source may
  // reference types that do not fully resolve in the mirror context
  // yet still emit usable declarations, and refusing on those would
  // reject stubs the redirect could otherwise rescue. Only the errors
  // that mean *no usable output* raise UnbuiltDependencyError; the
  // missing-declaration check below catches anything that slips
  // through.
  const failure = [
    ...program.getOptionsDiagnostics(),
    ...program.getSyntacticDiagnostics(),
    ...emitted.diagnostics,
  ].find((d) => d.category === ts.DiagnosticCategory.Error);
  if (failure !== undefined) {
    throw new UnbuiltDependencyError(
      dependency,
      ts.flattenDiagnosticMessageText(failure.messageText, ' '),
    );
  }
  for (const target of targets) {
    const derived =
      derivedDeclarationPath(identity.root, mirrorRoot, target);
    if (!existsSync(derived)) {
      throw new UnbuiltDependencyError(
        dependency,
        `no declaration derived for ${path.basename(target)}`,
      );
    }
  }

  const typesPath = directSource ?
    derivedDeclarationPath(identity.root, mirrorRoot, scan.typesFile) :
    writeMirrorBarrel(scan, identity.root, mirrorRoot);
  writeFileSync(
    path.join(mirrorRoot, 'package.json'),
    JSON.stringify({
      name: identity.name,
      version: identity.version,
      types: relativeSpecifier(mirrorRoot, typesPath),
    }),
  );
}

/**
 * Detect bundled dependencies whose `types` resolve to development
 * stubs and derive real declarations for each, returning `paths`
 * mappings that remap them onto the derived declarations — or
 * `undefined` when every dependency ships built declarations and
 * the compiler config can pass through untouched.
 *
 * The derived mirrors live under
 * `node_modules/.cache/kagal-build-tsdoc/` in the consumer
 * project; contents are overwritten on every run.
 *
 * @throws UnbuiltDependencyError when a stub is detected but
 * declarations cannot be derived from its source
 */
export function redirectStubDependencies(
  options: RedirectStubOptions,
): RedirectPaths | undefined {
  const { ts, entryFile } = options;
  // Detection resolves specifiers permissively: a stub written
  // with explicit `.ts` extensions must be recognised even when
  // the consumer's own config would reject importing them.
  const detectionOptions: TSModule.CompilerOptions = {
    ...options.compilerOptions,
    allowImportingTsExtensions: true,
  };
  // The trailing `node_modules` segment is load-bearing: the
  // compiler derives a resolved file's `packageId` from the
  // canonical `node_modules/<name>/` layout, for the mirror's
  // internal relative re-exports as much as for the mapped entry.
  // Without it those inner hops arrive anonymous, and
  // api-extractor drops their symbols as foreign instead of
  // matching them against `bundledPackages`.
  const cacheRoot = path.join(
    options.projectFolder,
    'node_modules', '.cache', 'kagal-build-tsdoc', 'node_modules',
  );
  const paths: RedirectPaths = {};
  let redirected = false;
  for (const dependency of options.dependencies) {
    const scan = scanDependencyTypes(
      ts, dependency, entryFile, detectionOptions,
    );
    if (scan === undefined) {
      continue;
    }
    const mirrorRoot = path.join(cacheRoot, dependency);
    deriveDependencyMirror(ts, dependency, scan, mirrorRoot);
    // Map the mirror *directory*, not its types file — see
    // {@link RedirectPaths} for why the distinction is
    // load-bearing.
    paths[dependency] = [mirrorRoot];
    redirected = true;
  }
  return redirected ? paths : undefined;
}
