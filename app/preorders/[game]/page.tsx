import { notFound } from "next/navigation"

import CollectionView from "@/components/catalog/CollectionView"
import { loadMerchCollectionPage } from "@/lib/shopify/merchPages"

type PageProps = {
  params: Promise<{ game: string }>
}

export default async function PreordersGamePage({ params }: PageProps) {
  const { game } = await params
  const data = await loadMerchCollectionPage({
    merchKey: "preorders",
    gameHandle: game,
  })
  if (!data || !data.selectedGame) notFound()

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
