import type { Nuxt } from '@nuxt/schema';
import { runWithNuxtContext } from '@nuxt/kit';
import { describe, expect, it } from 'vitest';

import module, { VERSION } from '..';

import type { ModuleOptions } from '..';
import pkg from '../../package.json' with { type: 'json' };

it('VERSION matches package.json', () => {
  expect(VERSION).toEqual(pkg.version);
});

describe('default export (Nuxt module)', () => {
  it('exposes the expected meta', async () => {
    expect(module).toBeTypeOf('function');
    const getMeta = (module as {
      getMeta?: () => Promise<{
        configKey?: string
        name?: string
      }>
    }).getMeta;
    expect(getMeta).toBeTypeOf('function');
    const meta = await getMeta!();
    expect(meta.name).toBe('@kagal/nuxt-tsdoc');
    expect(meta.configKey).toBe('tsdoc');
  });
});

/**
 * Minimal stand-in for the bits of the Nuxt instance `setup()`
 * touches, plus a `hook` recorder so `addComponent`'s
 * `components:extend` callback can be inspected.
 */
interface NuxtStub {
  hook(name: string, callback: (...arguments_: unknown[]) => void): void
  hooks: Map<string, (...arguments_: unknown[]) => void>
  options: {
    components?: unknown[]
    experimental: { componentIslands?: boolean }
    rootDir: string
    runtimeConfig: {
      tsdoc?: {
        prefix: string
        sources: { name: string; path: string }[]
      }
    }
    vite: { ssr?: { external?: string[] | true } }
  }
}

function makeNuxtStub(): NuxtStub {
  const hooks = new Map<string, (...arguments_: unknown[]) => void>();
  return {
    hooks,
    options: {
      rootDir: '/test/root',
      runtimeConfig: {},
      experimental: {},
      vite: {},
    },
    hook(name, callback) {
      hooks.set(name, callback);
    },
  };
}

async function runSetup(
  stub: NuxtStub,
  options: Partial<ModuleOptions>,
): Promise<void> {
  const nuxt = stub as unknown as Nuxt;
  // The module applies its own defaults via the schema, so a partial
  // is fine at runtime; the cast bridges the stricter call signature.
  await runWithNuxtContext(nuxt, () => module(options as ModuleOptions, nuxt));
}

describe('setup', () => {
  it('resolves sources, wires runtime config, and registers the component', async () => {
    const stub = makeNuxtStub();
    await runSetup(stub, {
      sources: [
        { name: 'abs', path: '/abs/x.api.json' },
        { name: 'rel', path: './rel/y.api.json' },
      ],
      prefix: 'kagal-tsdoc-',
    });

    // Absolute paths pass through; relative paths resolve against
    // the Nuxt root.
    expect(stub.options.runtimeConfig.tsdoc).toEqual({
      prefix: 'kagal-tsdoc-',
      sources: [
        { name: 'abs', path: '/abs/x.api.json' },
        { name: 'rel', path: '/test/root/rel/y.api.json' },
      ],
    });

    // Islands enabled and the model library kept out of the client.
    expect(stub.options.experimental.componentIslands).toBe(true);
    expect(stub.options.vite.ssr?.external).toEqual([
      '@microsoft/api-extractor-model',
    ]);

    // The server component is registered via `components:extend`.
    const extend = stub.hooks.get('components:extend');
    expect(extend).toBeTypeOf('function');
    const components: Record<string, unknown>[] = [];
    extend!(components);
    expect(components).toHaveLength(1);
    const [component] = components;
    expect(component.name).toBe('APIPackage');
    expect(component.mode).toBe('server');
    expect(String(component.filePath)).toMatch(/api-package\.server\.vue$/);
  });

  it('defaults the prefix to "api-"', async () => {
    const stub = makeNuxtStub();
    await runSetup(stub, { sources: [] });
    expect(stub.options.runtimeConfig.tsdoc?.prefix).toBe('api-');
  });

  it('extends an existing vite.ssr.external array', async () => {
    const stub = makeNuxtStub();
    stub.options.vite.ssr = { external: ['existing-pkg'] };
    await runSetup(stub, { sources: [] });
    expect(stub.options.vite.ssr?.external).toEqual([
      'existing-pkg',
      '@microsoft/api-extractor-model',
    ]);
  });

  it('leaves vite.ssr.external untouched when it is already true', async () => {
    const stub = makeNuxtStub();
    stub.options.vite.ssr = { external: true };
    await runSetup(stub, { sources: [] });
    expect(stub.options.vite.ssr?.external).toBe(true);
  });

  it('throws on invalid options', async () => {
    const stub = makeNuxtStub();
    await expect(
      runSetup(stub, { sources: [{ name: '', path: '' }] }),
    ).rejects.toThrow('Invalid module options');
  });
});
