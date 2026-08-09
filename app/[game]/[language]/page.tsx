import { notFound } from "next/navigation"

import CollectionView from "@/components/catalog/CollectionView"
import { loadTcgCollectionPage } from "@/lib/shopify/tcgPages"

type PageProps = {
  params: Promise<{ game: string; language: string }>
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
    />
  )
}
