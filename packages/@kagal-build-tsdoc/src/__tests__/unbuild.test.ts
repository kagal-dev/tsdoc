import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DuplicateEntryNameError,
  InvalidBuildEntryError,
  UnrecognisedBuildContextError,
} from '../errors';
import { extractEntryManifest } from '../extract';
import {
  asUnbuildContext,
  newUnbuildHooks,
  type UnbuildBuildHookContext,
  type UnbuildBuildHookEntry,
} from '../unbuild';

vi.mock('../extract', () => ({
  extractEntryManifest: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const ROOT = '/test-root';

/** Hook-context factory: entries, then the optional rest. */
function buildDoneContext(
  entries: UnbuildBuildHookEntry[],
  rest?: Partial<UnbuildBuildHookContext['options']>,
): UnbuildBuildHookContext {
  return {
    options: { entries, rootDir: ROOT, stub: false, ...rest },
  };
}

/** Run a fresh factory's `build:done` hook over the context. */
function runBuildDone(context: unknown): void {
  newUnbuildHooks()['build:done'](
    context as UnbuildBuildHookContext,
  );
}

describe('asUnbuildContext', () => {
  it('returns the value when `options.entries`/`rootDir`/`stub` shape matches', () => {
    const context = {
      options: { entries: [], rootDir: '/x', stub: false },
    };
    expect(asUnbuildContext(context)).toBe(context);
  });

  it('returns undefined for an obuild-shaped value', () => {
    expect(asUnbuildContext({
      pkgDir: '/x', pkg: { name: 'p' },
    })).toBeUndefined();
  });

  it('returns undefined when `options` is not an object', () => {
    expect(asUnbuildContext({ options: 'a string' })).toBeUndefined();
    expect(asUnbuildContext({ options: 42 })).toBeUndefined();
    // eslint-disable-next-line unicorn/no-null
    expect(asUnbuildContext({ options: null })).toBeUndefined();
  });

  it('returns undefined when `options.entries` is not an array', () => {
    expect(asUnbuildContext({
      options: { rootDir: '/x', stub: false },
    })).toBeUndefined();
    expect(asUnbuildContext({
      options: { entries: 42, rootDir: '/x', stub: false },
    })).toBeUndefined();
    expect(asUnbuildContext({
      options: { entries: 'a string', rootDir: '/x', stub: false },
    })).toBeUndefined();
  });

  it('returns undefined when `options.rootDir` is not a string', () => {
    expect(asUnbuildContext({
      options: { entries: [], stub: false },
    })).toBeUndefined();
    expect(asUnbuildContext({
      options: { entries: [], rootDir: 42, stub: false },
    })).toBeUndefined();
  });

  it('returns undefined when `options.stub` is not a boolean', () => {
    expect(asUnbuildContext({
      options: { entries: [], rootDir: '/x' },
    })).toBeUndefined();
    expect(asUnbuildContext({
      options: { entries: [], rootDir: '/x', stub: 'yes' },
    })).toBeUndefined();
    expect(asUnbuildContext({
      options: { entries: [], rootDir: '/x', stub: 1 },
    })).toBeUndefined();
  });

  it('returns undefined for unrecognised values', () => {
    expect(asUnbuildContext({})).toBeUndefined();
    // eslint-disable-next-line unicorn/no-null
    expect(asUnbuildContext(null)).toBeUndefined();
    expect(asUnbuildContext(undefined)).toBeUndefined();
    expect(asUnbuildContext('a string')).toBeUndefined();
  });
});

describe('newUnbuildHooks', () => {
  it('calls extractEntryManifest per entry with rootDir as projectFolder', () => {
    runBuildDone(buildDoneContext([
      { name: 'foo' },
      { name: 'bar' },
    ]));
    expect(extractEntryManifest).toHaveBeenCalledTimes(2);
    expect(extractEntryManifest).toHaveBeenNthCalledWith(1, {
      projectFolder: ROOT,
      entryName: 'foo',
      outDir: undefined,
    });
    expect(extractEntryManifest).toHaveBeenNthCalledWith(2, {
      projectFolder: ROOT,
      entryName: 'bar',
      outDir: undefined,
    });
  });

  it('keeps the path segments of a nested bundler-resolved name', () => {
    // unbuild names nested inputs by relative path minus the
    // `src/` prefix, e.g. `src/foo/bar.ts` → `foo/bar`.
    runBuildDone(buildDoneContext([{ name: 'foo/bar' }]));
    expect(extractEntryManifest).toHaveBeenCalledTimes(1);
    expect(extractEntryManifest).toHaveBeenCalledWith({
      projectFolder: ROOT,
      entryName: 'foo/bar',
      outDir: undefined,
    });
  });

  it('honours per-entry `outDir`', () => {
    runBuildDone(buildDoneContext([
      { name: 'foo', outDir: 'lib' },
    ]));
    expect(extractEntryManifest).toHaveBeenCalledWith({
      projectFolder: ROOT,
      entryName: 'foo',
      outDir: 'lib',
    });
  });

  it('throws when an entry lacks the bundler-resolved `name`', () => {
    expect(() => runBuildDone(buildDoneContext([{}])))
      .toThrow(InvalidBuildEntryError);
    expect(() => runBuildDone(buildDoneContext([
      { name: 42 as never },
    ]))).toThrow(InvalidBuildEntryError);
    expect(extractEntryManifest).not.toHaveBeenCalled();
  });

  it('does not call extractEntryManifest on empty entries', () => {
    runBuildDone(buildDoneContext([]));
    expect(extractEntryManifest).not.toHaveBeenCalled();
  });

  it('skips the entire call when `options.stub` is true', () => {
    runBuildDone(buildDoneContext(
      [{ name: 'foo' }, { name: 'bar' }],
      { stub: true },
    ));
    expect(extractEntryManifest).not.toHaveBeenCalled();
  });

  it('throws when ctx does not match unbuild shape', () => {
    expect(() => runBuildDone({})).toThrow(
      UnrecognisedBuildContextError,
    );
    expect(extractEntryManifest).not.toHaveBeenCalled();
  });

  it('throws on duplicate entry names', () => {
    expect(() => runBuildDone(buildDoneContext([
      { name: 'foo' },
      { name: 'foo' },
    ]))).toThrow(DuplicateEntryNameError);
  });

  it('reports the colliding name on the error', () => {
    let captured: unknown;
    try {
      runBuildDone(buildDoneContext([
        { name: 'utils' },
        { name: 'utils' },
      ]));
    } catch (error) {
      captured = error;
    }
    expect(captured).toBeInstanceOf(DuplicateEntryNameError);
    expect((captured as DuplicateEntryNameError).entryName)
      .toBe('utils');
  });

  it('stops calling extractEntryManifest at the first collision', () => {
    let threw = false;
    try {
      runBuildDone(buildDoneContext([
        { name: 'foo' },
        { name: 'bar' },
        { name: 'foo' },
      ]));
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    expect(extractEntryManifest).toHaveBeenCalledTimes(2);
    expect(extractEntryManifest).toHaveBeenNthCalledWith(1, {
      projectFolder: ROOT,
      entryName: 'foo',
      outDir: undefined,
    });
    expect(extractEntryManifest).toHaveBeenNthCalledWith(2, {
      projectFolder: ROOT,
      entryName: 'bar',
      outDir: undefined,
    });
  });
});
