import {
  ApiEnumMember,
  ExcerptTokenKind,
  ReleaseTag,
} from '@microsoft/api-extractor-model';
import { TSDocParser } from '@microsoft/tsdoc';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import APIEnumMemberView from '../api-enum-member-view.vue';

const tsdoc = new TSDocParser();

// Parse a one-line summary into the `DocComment` node graph
// api-extractor attaches to a documented item; undefined for an
// undocumented member.
function docFor(summary?: string) {
  return summary === undefined ?
    undefined :
    tsdoc.parseString(`/**\n * ${summary}\n */`).docComment;
}

// Build an ApiEnumMember the way api-extractor models one: members with
// a literal value carry a two-token excerpt (`Name = ` + value) and an
// initialiser range; a member whose value the .d.ts could not emit (a
// computed, non-constant member such as `Derived = base + 1`) carries
// just the name token and no initialiser range.
function makeEnumMember(
  name: string,
  initializer?: string,
  summary?: string,
): ApiEnumMember {
  const docComment = docFor(summary);
  if (initializer === undefined) {
    return new ApiEnumMember({
      name,
      docComment,
      releaseTag: ReleaseTag.Public,
      excerptTokens: [{ kind: ExcerptTokenKind.Content, text: name }],
    });
  }
  return new ApiEnumMember({
    name,
    docComment,
    releaseTag: ReleaseTag.Public,
    excerptTokens: [
      { kind: ExcerptTokenKind.Content, text: `${name} = ` },
      { kind: ExcerptTokenKind.Content, text: initializer },
    ],
    initializerTokenRange: { startIndex: 1, endIndex: 2 },
  });
}

describe('APIEnumMemberView', () => {
  it('renders a member with an initialiser as name = value', () => {
    const wrapper = mount(APIEnumMemberView, {
      props: { item: makeEnumMember('Small', '100') },
    });
    expect(wrapper.find('code').text()).toBe('Small = 100');
  });

  it('renders a computed member with no initialiser as the bare name', () => {
    // The model carries no initialiser excerpt, so there is no trailing
    // ` = `; the fixture-driven tests only cover valued members, so this
    // is the sole exercise of the fallback branch.
    const wrapper = mount(APIEnumMemberView, {
      props: { item: makeEnumMember('Derived') },
    });
    expect(wrapper.find('code').text()).toBe('Derived');
    // An undocumented member renders no summary paragraph.
    expect(wrapper.find('.api-summary').exists()).toBe(false);
  });

  it('renders the doc summary for a documented member', () => {
    const wrapper = mount(APIEnumMemberView, {
      props: { item: makeEnumMember('Primary', '0', 'The primary colour.') },
    });
    const summary = wrapper.find('.api-summary');
    expect(summary.exists()).toBe(true);
    expect(summary.text()).toBe('The primary colour.');
  });

  it('declares its component name', () => {
    expect(APIEnumMemberView.name).toBe('APIEnumMemberView');
  });
});
