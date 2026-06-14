// cspell:words taistamp

import path from 'node:path';
import url from 'node:url';

import { ApiItemKind, ApiPackage } from '@microsoft/api-extractor-model';
import { mount, type VueWrapper } from '@vue/test-utils';
import { beforeAll, describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';

import VueTSDoc, { providePrefix } from '../../index';
import APIPackageView from '../api-package-view.vue';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.resolve(HERE, '../../__tests__/fixtures');

function loadFixture(file: string): ApiPackage {
  return ApiPackage.loadFromJsonFile(path.join(FIXTURE_DIR, file));
}

function countMembers(pkg: ApiPackage, kind: ApiItemKind): number {
  return pkg.entryPoints
    .flatMap((entryPoint) => entryPoint.members)
    .filter((member) => member.kind === kind)
    .length;
}

function badgesReading(wrapper: VueWrapper, label: string): number {
  return wrapper.findAll('.api-badge')
    .filter((badge) => badge.text() === label)
    .length;
}

// Module-scoped render fn (no setup-closure dependency) so the
// providePrefix test can return it directly from `setup`.
const renderAPIPackageView = () => h(APIPackageView);

describe('APIPackageView', () => {
  it('renders the empty-state placeholder when no package is supplied', () => {
    const wrapper = mount(APIPackageView);
    const empty = wrapper.find('.api-empty');
    expect(empty.exists()).toBe(true);
    expect(empty.text()).toContain('No API package provided.');
  });

  it('honours the prefix set by app.use(VueTSDoc, { prefix })', () => {
    const wrapper = mount(APIPackageView, {
      global: { plugins: [[VueTSDoc, { prefix: 'kagal-tsdoc-' }]] },
    });
    expect(wrapper.find('.kagal-tsdoc-package').exists()).toBe(true);
    expect(wrapper.find('.kagal-tsdoc-empty').exists()).toBe(true);
    expect(wrapper.find('.api-package').exists()).toBe(false);
  });

  it('honours providePrefix from an ancestor setup (no plugin)', () => {
    // Mirrors the server-island case: a host component sets the
    // prefix for its subtree without the app-level plugin.
    const Host = defineComponent({
      setup() {
        providePrefix('kagal-tsdoc-');
        return renderAPIPackageView;
      },
    });
    const wrapper = mount(Host);
    expect(wrapper.find('.kagal-tsdoc-empty').exists()).toBe(true);
    expect(wrapper.find('.api-empty').exists()).toBe(false);
  });

  it('declares its component name', () => {
    expect(APIPackageView.name).toBe('APIPackageView');
  });
});

describe('APIPackageView with the ed25519-secret fixture', () => {
  let pkg: ApiPackage;

  beforeAll(() => {
    pkg = loadFixture('ed25519-secret.api.json');
  });

  it('renders the package display name', () => {
    const wrapper = mount(APIPackageView, { props: { package: pkg } });
    expect(wrapper.find('.api-package-name').text()).toBe(pkg.displayName);
  });

  it('dispatches every root function to APIFunctionView', () => {
    const wrapper = mount(APIPackageView, { props: { package: pkg } });
    const expected = countMembers(pkg, ApiItemKind.Function);
    expect(expected).toBeGreaterThan(0);
    expect(wrapper.findAll('.api-function').length).toBe(expected);
  });

  it('dispatches every root interface to APIInterfaceView', () => {
    const wrapper = mount(APIPackageView, { props: { package: pkg } });
    const expected = countMembers(pkg, ApiItemKind.Interface);
    expect(expected).toBeGreaterThan(0);
    expect(wrapper.findAll('.api-interface').length).toBe(expected);
  });

  it('recurses into interface members via APIMemberList', () => {
    const wrapper = mount(APIPackageView, { props: { package: pkg } });
    // PropertySignatures only exist inside interfaces in this fixture,
    // so finding any proves the recursion reached interface members.
    const properties = wrapper.findAll('.api-property-signature');
    expect(properties.length).toBeGreaterThan(0);
  });

  it('renders TypeAlias and Variable leaves', () => {
    const wrapper = mount(APIPackageView, { props: { package: pkg } });
    expect(wrapper.findAll('.api-type-alias').length)
      .toBe(countMembers(pkg, ApiItemKind.TypeAlias));
    expect(wrapper.findAll('.api-variable').length)
      .toBe(countMembers(pkg, ApiItemKind.Variable));
  });

  it('falls back to APIGenericItemView for kinds without a dedicated view', () => {
    const wrapper = mount(APIPackageView, { props: { package: pkg } });
    // IndexSignature lives inside an interface and has no per-kind view,
    // so it lands in the generic fallback while still receiving its own
    // kebab-cased section class.
    expect(wrapper.findAll('.api-index-signature').length).toBeGreaterThan(0);
  });

  it('renders documented function, interface, and type-alias summaries', () => {
    // Each summary string is unique to one member, so its presence in an
    // `.api-summary` proves that member's per-kind view wired summaryFor:
    // getRandom -> APIFunctionView, Verifier -> APIInterfaceView,
    // Ed25519Seed -> APITypeAliasView.
    const wrapper = mount(APIPackageView, { props: { package: pkg } });
    const summaries = wrapper.findAll('.api-summary').map((node) => node.text());
    expect(summaries).toContain(
      'Fill a fresh `Uint8Array` of the requested length with ' +
      'cryptographically secure random bytes via `crypto.getRandomValues`, ' +
      'subject to its length cap (typically 64 KiB).',
    );
    expect(summaries).toContain(
      'Pluggable abstraction over a public verifying key. Implementations ' +
      'check a candidate signature against a message and report the result ' +
      'as a boolean; the algorithm and key store are implementation details.',
    );
    // Ed25519Seed's full summary continues into an {@link}; assert the
    // plain lead sentence so the row doesn't pin link-rendering details.
    expect(summaries.some((text) =>
      text.startsWith('A 32-byte Ed25519 private seed (RFC 8032).'),
    )).toBe(true);
  });
});

describe('APIPackageView with the taistamp fixture', () => {
  it('renders the second fixture cleanly', () => {
    const pkg = loadFixture('taistamp.api.json');
    const wrapper = mount(APIPackageView, { props: { package: pkg } });
    expect(wrapper.find('.api-package-name').text()).toBe(pkg.displayName);
    expect(wrapper.findAll('.api-function').length)
      .toBe(countMembers(pkg, ApiItemKind.Function));
    expect(wrapper.findAll('.api-variable').length)
      .toBe(countMembers(pkg, ApiItemKind.Variable));
  });

  it('renders a documented variable summary', () => {
    // VERSION is an ApiVariable; its unique summary proves APIVariableView
    // renders the doc prose, not just the signature line.
    const pkg = loadFixture('taistamp.api.json');
    const wrapper = mount(APIPackageView, { props: { package: pkg } });
    const summaries = wrapper.findAll('.api-summary').map((node) => node.text());
    expect(summaries).toContain('Package version from package.json.');
  });
});

// shapes.api.json is a generated api-extractor fixture over a synthetic
// surface (abstract class with heritage + members, an enum, an interface)
// covering the per-kind views the published fixtures above don't exercise:
// class, method, enum.
describe('APIPackageView with the shapes fixture', () => {
  let pkg: ApiPackage;

  beforeAll(() => {
    pkg = loadFixture('shapes.api.json');
  });

  it('dispatches both classes to APIClassView', () => {
    const wrapper = mount(APIPackageView, { props: { package: pkg } });
    expect(countMembers(pkg, ApiItemKind.Class)).toBe(2);
    expect(wrapper.findAll('.api-class').length).toBe(2);
  });

  it('renders class heritage and the abstract badge', () => {
    const wrapper = mount(APIPackageView, { props: { package: pkg } });
    const text = wrapper.text();
    expect(text).toContain('extends');
    expect(text).toContain('Base');
    expect(text).toContain('implements');
    expect(text).toContain('Drawable');
    // Both Base and Shape are abstract.
    expect(badgesReading(wrapper, 'abstract')).toBe(2);
  });

  it('dispatches the enum and recurses into its members', () => {
    const wrapper = mount(APIPackageView, { props: { package: pkg } });
    expect(wrapper.findAll('.api-enum').length).toBe(1);
    expect(wrapper.findAll('.api-enum-member').length).toBe(3);
  });

  it('dispatches class methods to APIMethodView with a static badge', () => {
    const wrapper = mount(APIPackageView, { props: { package: pkg } });
    // area, draw, unit on Shape (kind Method); Drawable.draw is a
    // MethodSignature and renders under .api-method-signature instead.
    expect(wrapper.findAll('.api-method').length).toBe(3);
    expect(badgesReading(wrapper, 'static')).toBe(1);
  });

  it('renders a readonly class property', () => {
    const wrapper = mount(APIPackageView, { props: { package: pkg } });
    expect(wrapper.findAll('.api-property').length).toBe(1);
    expect(badgesReading(wrapper, 'readonly')).toBe(1);
  });

  it('reconstructs method signatures from parameters and return type', () => {
    const wrapper = mount(APIPackageView, { props: { package: pkg } });
    const text = wrapper.text();
    expect(text).toContain('area(): number');
    expect(text).toContain('draw(): void');
    expect(text).toContain('unit(): Shape');
  });

  it('renders a property type from its excerpt', () => {
    const wrapper = mount(APIPackageView, { props: { package: pkg } });
    expect(wrapper.text()).toContain('id: string');
  });

  it('renders TSDoc summary prose for documented members', () => {
    const wrapper = mount(APIPackageView, { props: { package: pkg } });
    const summaries = wrapper.findAll('.api-summary').map((node) => node.text());
    expect(summaries).toContain('Compute the area.');
    expect(summaries).toContain('The canonical unit shape.');
    expect(summaries).toContain('Stable identifier.');
  });

  it('renders the enum and class container summaries', () => {
    // Color (ApiEnum) -> APIEnumView and Shape (ApiClass) -> APIClassView
    // each render their own summary above their members.
    const wrapper = mount(APIPackageView, { props: { package: pkg } });
    const summaries = wrapper.findAll('.api-summary').map((node) => node.text());
    expect(summaries).toContain('Named colours.');
    expect(summaries).toContain('A drawable 2-D shape.');
  });
});
