import { notFound } from "next/navigation"

import CollectionView from "@/components/catalog/CollectionView"
import { loadMerchCollectionPage } from "@/lib/shopify/merchPages"

export default async function PreordersPage() {
  const data = await loadMerchCollectionPage({ merchKey: "preorders" })
  if (!data) notFound()

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
      requiresLanguagePick={data.requiresLanguagePick}
      hideEmptyLanguages
    />
  )
}
