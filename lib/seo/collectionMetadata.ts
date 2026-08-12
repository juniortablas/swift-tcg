/**
 * Collection route metadata helpers (TCG + merch).
 */

import type { Metadata } from "next"

import { buildPageMetadata, stripHtml, truncateMeta } from "@/lib/seo"
import type { MerchCollectionPayload } from "@/lib/shopify/merchPages"
import type { TcgCollectionPayload } from "@/lib/shopify/tcgPages"

function collectionDescription(options: {
  seoDescription: string | null
  shopifyDescription: string | null
  presentationDescription: string
  languageLabel?: string | null
  gameLabel?: string | null
}): string {
  if (options.seoDescription?.trim()) {
    return truncateMeta(options.seoDescription)
  }

  const shopify = stripHtml(options.shopifyDescription)
  if (shopify) return truncateMeta(shopify)

  const prefix = [options.languageLabel, options.gameLabel]
    .filter(Boolean)
    .join(" ")

  if (prefix) {
    return truncateMeta(
      `${prefix} — ${options.presentationDescription}`
    )
  }

  return truncateMeta(options.presentationDescription)
}

export function tcgCollectionMetadata(
  data: TcgCollectionPayload
): Metadata {
  const languageLabel = data.selectedLanguage
    ? data.languageFacets.find((f) => f.slug === data.selectedLanguage)?.label
    : null

  const titleParts = [
    languageLabel,
    data.shopifySeoTitle?.trim() || data.presentation.title,
  ].filter(Boolean)

  const path = data.selectedLanguage
    ? `/${data.gameHandle}/${data.selectedLanguage}`
    : `/${data.gameHandle}`

  const description = collectionDescription({
    seoDescription: data.shopifySeoDescription,
    shopifyDescription: data.shopifyDescription,
    presentationDescription: data.presentation.description,
    languageLabel,
  })

  return buildPageMetadata({
    title: titleParts.join(" "),
    description,
    path,
    image: data.collectionImageUrl,
    imageAlt: data.collectionImageAlt || data.presentation.title,
  })
}

export function merchCollectionMetadata(
  data: MerchCollectionPayload
): Metadata {
  const titleParts = [
    data.selectedLanguageLabel,
    data.selectedGameLabel,
    data.shopifySeoTitle?.trim() || data.presentation.title,
  ].filter(Boolean)

  let path = data.basePath
  if (data.selectedGame) {
    path = `${data.basePath}/${data.selectedGame}`
    if (data.selectedLanguage) {
      path = `${path}/${data.selectedLanguage}`
    }
  }

  const description = collectionDescription({
    seoDescription: data.shopifySeoDescription,
    shopifyDescription: data.shopifyDescription,
    presentationDescription: data.presentation.description,
    languageLabel: data.selectedLanguageLabel,
    gameLabel: data.selectedGameLabel,
  })

  return buildPageMetadata({
    title: titleParts.join(" "),
    description,
    path,
    image: data.collectionImageUrl,
    imageAlt: data.collectionImageAlt || data.presentation.title,
  })
}

export function tcgCollectionPath(data: TcgCollectionPayload): string {
  return data.selectedLanguage
    ? `/${data.gameHandle}/${data.selectedLanguage}`
    : `/${data.gameHandle}`
}

export function merchCollectionPath(data: MerchCollectionPayload): string {
  if (!data.selectedGame) return data.basePath
  if (!data.selectedLanguage) return `${data.basePath}/${data.selectedGame}`
  return `${data.basePath}/${data.selectedGame}/${data.selectedLanguage}`
}
