import type { Metadata } from "next"
import { notFound } from "next/navigation"

import CollectionView from "@/components/catalog/CollectionView"
import {
  tcgCollectionMetadata,
  tcgCollectionPath,
} from "@/lib/seo"
import { loadTcgCollectionPage } from "@/lib/shopify/tcgPages"

type PageProps = {
  params: Promise<{ game: string; language: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { game, language } = await params
  const data = await loadTcgCollectionPage({
    gameHandle: game,
    languageSlug: language,
  })
  if (!data || !data.selectedLanguage) {
    return { title: "Collection not found", robots: { index: false, follow: false } }
  }
  return tcgCollectionMetadata(data)
}

export default async function TcgLanguagePage({ params }: PageProps) {
  const { game, language } = await params
  const data = await loadTcgCollectionPage({
    gameHandle: game,
    languageSlug: language,
  })
  if (!data || !data.selectedLanguage) notFound()

  const selectedFacet = data.languageFacets.find(
    (facet) => facet.slug === data.selectedLanguage
  )
  const path = tcgCollectionPath(data)

  return (
    <CollectionView
      presentation={data.presentation}
      products={data.products}
      heroProductCount={data.products.length}
      languageFacets={data.languageFacets}
      gameHandle={data.gameHandle}
      selectedLanguage={data.selectedLanguage}
      requiresLanguagePick={data.requiresLanguagePick}
      selectedLanguageLabel={selectedFacet?.label ?? data.selectedLanguage}
      canonicalPath={path}
      collectionDescription={
        data.shopifySeoDescription ||
        data.shopifyDescription ||
        data.presentation.description
      }
      collectionImage={data.collectionImageUrl}
      breadcrumbs={[
        { name: "Home", path: "/" },
        {
          name: data.presentation.breadcrumb || data.presentation.title,
          path: `/${data.gameHandle}`,
        },
        {
          name: selectedFacet?.label ?? data.selectedLanguage,
          path,
        },
      ]}
    />
  )
}
