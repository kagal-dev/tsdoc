// The api-extractor-model surface a reader needs, re-exported with
// proper-cased acronyms: upstream spells `Api` (`ApiPackage`), this
// façade presents the same symbols as `API*` (`APIPackage`). Each
// alias carries every meaning of the upstream symbol — class, type,
// enum, or mixin function plus its `isBaseClassOf` namespace — so a
// consumer works with the model through this package alone.
// api-extractor-model's writer-side construction and save surface is
// not re-exported here; producing manifests is the write path's
// concern, `@kagal/build-tsdoc`.

// The model graph: the containers and base classes every loaded
// manifest decomposes into.
export {
  ApiDeclaredItem as APIDeclaredItem,
  ApiDocumentedItem as APIDocumentedItem,
  ApiEntryPoint as APIEntryPoint,
  ApiItem as APIItem,
  ApiItemKind as APIItemKind,
  ApiModel as APIModel,
  ApiPackage as APIPackage,
  ApiPropertyItem as APIPropertyItem,
} from '@microsoft/api-extractor-model';

// The per-kind items `APIItemKind` dispatches over.
export {
  ApiCallSignature as APICallSignature,
  ApiClass as APIClass,
  ApiConstructor as APIConstructor,
  ApiConstructSignature as APIConstructSignature,
  ApiEnum as APIEnum,
  ApiEnumMember as APIEnumMember,
  ApiFunction as APIFunction,
  ApiIndexSignature as APIIndexSignature,
  ApiInterface as APIInterface,
  ApiMethod as APIMethod,
  ApiMethodSignature as APIMethodSignature,
  ApiNamespace as APINamespace,
  ApiProperty as APIProperty,
  ApiPropertySignature as APIPropertySignature,
  ApiTypeAlias as APITypeAlias,
  ApiVariable as APIVariable,
} from '@microsoft/api-extractor-model';

// The capability mixins — `APIStaticMixin.isBaseClassOf(item)` is
// how a reader narrows an item beyond its kind.
export {
  ApiAbstractMixin as APIAbstractMixin,
  ApiExportedMixin as APIExportedMixin,
  ApiInitializerMixin as APIInitializerMixin,
  ApiItemContainerMixin as APIItemContainerMixin,
  ApiNameMixin as APINameMixin,
  ApiOptionalMixin as APIOptionalMixin,
  ApiParameterListMixin as APIParameterListMixin,
  ApiProtectedMixin as APIProtectedMixin,
  ApiReadonlyMixin as APIReadonlyMixin,
  ApiReleaseTagMixin as APIReleaseTagMixin,
  ApiReturnTypeMixin as APIReturnTypeMixin,
  ApiStaticMixin as APIStaticMixin,
  ApiTypeParameterListMixin as APITypeParameterListMixin,
} from '@microsoft/api-extractor-model';

// Excerpts, signature parts, and the member-search results.
export {
  EnumMemberOrder,
  Excerpt,
  ExcerptToken,
  ExcerptTokenKind,
  FindApiItemsMessageId as FindAPIItemsMessageID,
  HeritageType,
  Parameter,
  ReleaseTag,
  SourceLocation,
  TypeParameter,
} from '@microsoft/api-extractor-model';

export type {
  IExcerptToken,
  IExcerptTokenRange,
  IFindApiItemsMessage as IFindAPIItemsMessage,
  IFindApiItemsResult as IFindAPIItemsResult,
  IResolveDeclarationReferenceResult,
} from '@microsoft/api-extractor-model';
