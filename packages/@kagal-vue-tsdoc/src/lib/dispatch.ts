// Maps an `ApiItemKind` to the presentational Vue component
// responsible for rendering that kind's header. The recursive
// `APIItemView` consults this registry via `<component :is>`.

import type { Component } from 'vue';
import { ApiItemKind } from '@microsoft/api-extractor-model';

import APIClassView from '../components/api-class-view.vue';
import APIEnumView from '../components/api-enum-view.vue';
import APIFunctionView from '../components/api-function-view.vue';
import APIGenericItemView from '../components/api-generic-item-view.vue';
import APIInterfaceView from '../components/api-interface-view.vue';
import APIMethodView from '../components/api-method-view.vue';
import APIPropertyView from '../components/api-property-view.vue';
import APITypeAliasView from '../components/api-type-alias-view.vue';
import APIVariableView from '../components/api-variable-view.vue';

let registry: Partial<Record<ApiItemKind, Component>> | undefined;

// The registry is materialised lazily on first lookup so that the
// circular module graph between `api-item-view` ↔ `dispatch` ↔ the
// per-kind components has fully evaluated before any binding is
// captured — no risk of an in-flight `default` slipping in as
// `undefined`.
function getRegistry(): Partial<Record<ApiItemKind, Component>> {
  registry ??= {
    [ApiItemKind.Class]: APIClassView,
    [ApiItemKind.Interface]: APIInterfaceView,
    [ApiItemKind.Function]: APIFunctionView,
    [ApiItemKind.Method]: APIMethodView,
    [ApiItemKind.MethodSignature]: APIMethodView,
    [ApiItemKind.Property]: APIPropertyView,
    [ApiItemKind.PropertySignature]: APIPropertyView,
    [ApiItemKind.Enum]: APIEnumView,
    [ApiItemKind.TypeAlias]: APITypeAliasView,
    [ApiItemKind.Variable]: APIVariableView,
  };
  return registry;
}

/**
 * Presentational component for an `ApiItem` of the given kind.
 * Falls back to `APIGenericItemView` for kinds without a
 * dedicated view — every node still renders, and unknown
 * containers still recurse into their members.
 */
export function componentForKind(kind: ApiItemKind): Component {
  return getRegistry()[kind] ?? APIGenericItemView;
}
