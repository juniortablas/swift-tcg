import { notFound } from "next/navigation"

import CollectionView from "@/components/catalog/CollectionView"
import { loadMerchCollectionPage } from "@/lib/shopify/merchPages"

type PageProps = {
  params: Promise<{ game: string; language: string }>
}

export default async function NewReleasesLanguagePage({ params }: PageProps) {
  const { game, language } = await params
  const data = await loadMerchCollectionPage({
    merchKey: "new-releases",
    gameHandle: game,
    languageSlug: language,
  })
  if (!data || !data.selectedGame || !data.selectedLanguage) notFound()

  return (
    <CollectionView
      presentation={data.presentation}
      products={data.products}
      heroProductCount={data.heroProductCount}
      gameFacets={data.gameFacets}
      merchBasePath={data.basePath}
      selectedGame={data.selectedGame}
      selectedGameLabel={data.selectedGameLabel}
      requiresGamePick={data.requiresGamePick}
      languageFacets={data.languageFacets}
      gameHandle={data.selectedGame}
      languageBasePath={`${data.basePath}/${data.selectedGame}`}
      selectedLanguage={data.selectedLanguage}
      selectedLanguageLabel={data.selectedLanguageLabel}
      requiresLanguagePick={data.requiresLanguagePick}
      hideEmptyLanguages
    />
  )
}
