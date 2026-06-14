import {
  ApiNamespace,
  ExcerptTokenKind,
  ReleaseTag,
} from '@microsoft/api-extractor-model';
import { TSDocParser } from '@microsoft/tsdoc';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import APIGenericItemView from '../api-generic-item-view.vue';

const tsdoc = new TSDocParser();

// Parse a one-line summary into the `DocComment` api-extractor attaches
// to a documented item; undefined for an undocumented one.
function docFor(summary?: string) {
  return summary === undefined ?
    undefined :
    tsdoc.parseString(`/**\n * ${summary}\n */`).docComment;
}

// `Namespace` has no dedicated view, so it dispatches to the fallback
// `APIGenericItemView`. Build one the way api-extractor models it: a
// single content token spanning the declaration, plus name, release
// tag, and the optional doc comment.
function makeNamespace(name: string, summary?: string): ApiNamespace {
  return new ApiNamespace({
    name,
    docComment: docFor(summary),
    releaseTag: ReleaseTag.Public,
    isExported: true,
    excerptTokens: [
      { kind: ExcerptTokenKind.Content, text: `namespace ${name}` },
    ],
  });
}

describe('APIGenericItemView', () => {
  it('renders the kind label and the display name', () => {
    const wrapper = mount(APIGenericItemView, {
      props: { item: makeNamespace('utils') },
    });
    expect(wrapper.find('.api-kind').text()).toBe('Namespace');
    expect(wrapper.find('h3').text()).toContain('utils');
  });

  it('renders the doc summary for a documented item', () => {
    const wrapper = mount(APIGenericItemView, {
      props: { item: makeNamespace('utils', 'Shared helpers.') },
    });
    const summary = wrapper.find('.api-summary');
    expect(summary.exists()).toBe(true);
    expect(summary.text()).toBe('Shared helpers.');
  });

  it('renders no summary paragraph for an undocumented item', () => {
    const wrapper = mount(APIGenericItemView, {
      props: { item: makeNamespace('utils') },
    });
    expect(wrapper.find('.api-summary').exists()).toBe(false);
  });

  it('declares its component name', () => {
    expect(APIGenericItemView.name).toBe('APIGenericItemView');
  });
});
