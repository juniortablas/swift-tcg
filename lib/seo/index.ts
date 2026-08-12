export {
  SITE_NAME,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_KEYWORDS,
  THEME_COLOR,
  getSiteOrigin,
  absoluteUrl,
} from "./config"

export { stripHtml, truncateMeta } from "./html"

export {
  buildPageMetadata,
  buildProductMetadata,
  productMetaDescription,
  productMetaTitle,
  productKeywords,
  type BuildPageMetadataInput,
} from "./metadata"

export {
  tcgCollectionMetadata,
  merchCollectionMetadata,
  tcgCollectionPath,
  merchCollectionPath,
} from "./collectionMetadata"

export {
  serializeJsonLd,
  breadcrumbListJsonLd,
  organizationJsonLd,
  websiteJsonLd,
  productJsonLd,
  collectionPageJsonLd,
  type BreadcrumbItem,
  type JsonLd,
} from "./jsonld"
