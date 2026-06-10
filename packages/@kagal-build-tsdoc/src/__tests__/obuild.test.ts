import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DuplicateEntryNameError,
  HooksNotWiredError,
  InvalidBuildEntryError,
  UnrecognisedBuildContextError,
} from '../errors';
import { extractEntryManifest } from '../extract';
import {
  asOBuildContext,
  newOBuildHooks,
  type OBuildBuildHookContext,
  type OBuildBuildHookEntry,
} from '../obuild';

vi.mock('../extract', () => ({
  extractEntryManifest: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const ROOT = '/test-root';

const obuildContext: OBuildBuildHookContext = {
  pkgDir: ROOT,
  pkg: { name: 'p' },
};

/** Bundle-entry factory: input paths, then the optional rest. */
function bundleEntry(
  input: string | string[],
  rest?: Partial<OBuildBuildHookEntry>,
): OBuildBuildHookEntry {
  return { type: 'bundle', input, ...rest };
}

/** Capture entries and run `end`, as a full obuild build would. */
function runHooks(
  entries: OBuildBuildHookEntry[],
  context: unknown,
): void {
  const hooks = newOBuildHooks();
  hooks.entries(entries);
  hooks.end(context as OBuildBuildHookContext);
}

describe('asOBuildContext', () => {
  it('returns the value when both `pkgDir` and `pkg` are present', () => {
    const context = { pkgDir: '/x', pkg: { name: 'p' } };
    expect(asOBuildContext(context)).toBe(context);
  });

  it('returns undefined for an unbuild-shaped value', () => {
    expect(asOBuildContext({
      options: { entries: [], rootDir: '/x' },
    })).toBeUndefined();
  });

  it('returns undefined when only `pkgDir` is present', () => {
    expect(asOBuildContext({ pkgDir: '/x' })).toBeUndefined();
  });

  it('returns undefined when only `pkg` is present', () => {
    expect(asOBuildContext({ pkg: { name: 'p' } })).toBeUndefined();
  });

  it('returns undefined when `pkgDir` is not a string', () => {
    expect(asOBuildContext({
      pkgDir: 42, pkg: { name: 'p' },
    })).toBeUndefined();
  });

  it('returns undefined when `pkg` is not an object', () => {
    expect(asOBuildContext({ pkgDir: '/x', pkg: 'p' })).toBeUndefined();
    // eslint-disable-next-line unicorn/no-null
    expect(asOBuildContext({ pkgDir: '/x', pkg: null })).toBeUndefined();
  });

  it('returns undefined for unrecognised values', () => {
    expect(asOBuildContext({})).toBeUndefined();
    // eslint-disable-next-line unicorn/no-null
    expect(asOBuildContext(null)).toBeUndefined();
    expect(asOBuildContext(undefined)).toBeUndefined();
    expect(asOBuildContext(42)).toBeUndefined();
  });
});

describe('newOBuildHooks', () => {
  it('`end` throws when the `entries` hook never fired', () => {
    const hooks = newOBuildHooks();
    expect(() => hooks.end(obuildContext)).toThrow(
      HooksNotWiredError,
    );
    expect(extractEntryManifest).not.toHaveBeenCalled();
  });

  it('extracts the captured entries on `end`', () => {
    const hooks = newOBuildHooks();
    hooks.entries([bundleEntry(['./src/index.ts'])]);
    hooks.end(obuildContext);
    expect(extractEntryManifest).toHaveBeenCalledTimes(1);
    expect(extractEntryManifest).toHaveBeenCalledWith({
      projectFolder: ROOT,
      entryName: 'index',
      outDir: undefined,
    });
  });

  it('skips stub entries captured from a stub build', () => {
    const hooks = newOBuildHooks();
    hooks.entries([bundleEntry(['./src/index.ts'], { stub: true })]);
    hooks.end(obuildContext);
    expect(extractEntryManifest).not.toHaveBeenCalled();
  });

  it('each factory call captures independently', () => {
    const wired = newOBuildHooks();
    const unwired = newOBuildHooks();
    wired.entries([bundleEntry(['./src/index.ts'])]);
    wired.end(obuildContext);
    expect(() => unwired.end(obuildContext)).toThrow(
      HooksNotWiredError,
    );
    expect(extractEntryManifest).toHaveBeenCalledTimes(1);
  });

  it('calls extractEntryManifest per bundle entry with pkgDir as projectFolder', () => {
    runHooks(
      [
        bundleEntry(['./src/index.ts']),
        bundleEntry(['./src/bin.ts']),
      ],
      obuildContext,
    );
    expect(extractEntryManifest).toHaveBeenCalledTimes(2);
    expect(extractEntryManifest).toHaveBeenNthCalledWith(1, {
      projectFolder: ROOT,
      entryName: 'index',
      outDir: undefined,
    });
    expect(extractEntryManifest).toHaveBeenNthCalledWith(2, {
      projectFolder: ROOT,
      entryName: 'bin',
      outDir: undefined,
    });
  });

  it('expands a multi-input bundle entry into one call per input', () => {
    runHooks(
      [bundleEntry(['./src/index.ts', './src/cli.ts'])],
      obuildContext,
    );
    expect(extractEntryManifest).toHaveBeenCalledTimes(2);
    expect(extractEntryManifest).toHaveBeenNthCalledWith(1, {
      projectFolder: ROOT,
      entryName: 'index',
      outDir: undefined,
    });
    expect(extractEntryManifest).toHaveBeenNthCalledWith(2, {
      projectFolder: ROOT,
      entryName: 'cli',
      outDir: undefined,
    });
  });

  it('accepts a single-string `input`', () => {
    runHooks([bundleEntry('./src/index.ts')], obuildContext);
    expect(extractEntryManifest).toHaveBeenCalledTimes(1);
    expect(extractEntryManifest).toHaveBeenCalledWith({
      projectFolder: ROOT,
      entryName: 'index',
      outDir: undefined,
    });
  });

  it('honours per-entry `outDir`', () => {
    runHooks(
      [bundleEntry(['./src/index.ts'], { outDir: '/abs/out' })],
      obuildContext,
    );
    expect(extractEntryManifest).toHaveBeenCalledWith({
      projectFolder: ROOT,
      entryName: 'index',
      outDir: '/abs/out',
    });
  });

  it('skips stub entries while extracting the rest', () => {
    runHooks(
      [
        bundleEntry(['./src/index.ts'], { stub: true }),
        bundleEntry(['./src/bin.ts']),
      ],
      obuildContext,
    );
    expect(extractEntryManifest).toHaveBeenCalledTimes(1);
    expect(extractEntryManifest).toHaveBeenCalledWith({
      projectFolder: ROOT,
      entryName: 'bin',
      outDir: undefined,
    });
  });

  it('skips `transform` entries', () => {
    runHooks(
      [
        { type: 'transform', input: './src/' },
        bundleEntry(['./src/index.ts']),
      ],
      obuildContext,
    );
    expect(extractEntryManifest).toHaveBeenCalledTimes(1);
    expect(extractEntryManifest).toHaveBeenCalledWith({
      projectFolder: ROOT,
      entryName: 'index',
      outDir: undefined,
    });
  });

  it('throws on a hand-written name list (no `input`)', () => {
    expect(() =>
      runHooks([{ name: 'index' } as never], obuildContext),
    ).toThrow(InvalidBuildEntryError);
    expect(extractEntryManifest).not.toHaveBeenCalled();
  });

  it('throws on raw string entries', () => {
    expect(() =>
      runHooks(['./src/index.ts' as never], obuildContext),
    ).toThrow(InvalidBuildEntryError);
    expect(extractEntryManifest).not.toHaveBeenCalled();
  });

  it('throws on an empty `input` array', () => {
    expect(() =>
      runHooks([bundleEntry([])], obuildContext),
    ).toThrow(InvalidBuildEntryError);
    expect(extractEntryManifest).not.toHaveBeenCalled();
  });

  it('throws when an `input` array carries a non-string', () => {
    expect(() =>
      runHooks(
        [bundleEntry(['./src/index.ts', 42 as never])],
        obuildContext,
      ),
    ).toThrow(InvalidBuildEntryError);
    expect(extractEntryManifest).not.toHaveBeenCalled();
  });

  it('keeps the whole basename when input has no extension', () => {
    // a leading dot is not an extension separator: a dotfile
    // basename passes through whole
    runHooks(
      [bundleEntry(['./src/index', './src/.env'])],
      obuildContext,
    );
    expect(extractEntryManifest).toHaveBeenCalledTimes(2);
    expect(extractEntryManifest).toHaveBeenNthCalledWith(1, {
      projectFolder: ROOT,
      entryName: 'index',
      outDir: undefined,
    });
    expect(extractEntryManifest).toHaveBeenNthCalledWith(2, {
      projectFolder: ROOT,
      entryName: '.env',
      outDir: undefined,
    });
  });

  it('reports the offending entry on the error', () => {
    const offending = { name: 'index' };
    let captured: unknown;
    try {
      runHooks([offending as never], obuildContext);
    } catch (error) {
      captured = error;
    }
    expect(captured).toBeInstanceOf(InvalidBuildEntryError);
    expect((captured as InvalidBuildEntryError).entry)
      .toBe(offending);
  });

  it('does not call extractEntryManifest on empty entries', () => {
    runHooks([], obuildContext);
    expect(extractEntryManifest).not.toHaveBeenCalled();
  });

  it('throws when ctx does not match obuild shape', () => {
    expect(() =>
      runHooks([bundleEntry(['./src/index.ts'])], {}),
    ).toThrow(UnrecognisedBuildContextError);
    expect(extractEntryManifest).not.toHaveBeenCalled();
  });

  it('throws on duplicate derived names', () => {
    expect(() =>
      runHooks(
        [
          bundleEntry(['./src/index.ts']),
          bundleEntry(['./lib/index.ts']),
        ],
        obuildContext,
      ),
    ).toThrow(DuplicateEntryNameError);
  });
});
