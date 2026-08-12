import type { Metadata } from "next"
import { notFound } from "next/navigation"

import CollectionView from "@/components/catalog/CollectionView"
import {
  merchCollectionMetadata,
  merchCollectionPath,
} from "@/lib/seo"
import { loadMerchCollectionPage } from "@/lib/shopify/merchPages"

export async function generateMetadata(): Promise<Metadata> {
  const data = await loadMerchCollectionPage({ merchKey: "new-releases" })
  if (!data) {
    return { title: "New Releases" }
  }
  return merchCollectionMetadata(data)
}

export default async function NewReleasesPage() {
  const data = await loadMerchCollectionPage({ merchKey: "new-releases" })
  if (!data) notFound()

  const path = merchCollectionPath(data)

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
      canonicalPath={path}
      collectionDescription={
        data.shopifySeoDescription ||
        data.shopifyDescription ||
        data.presentation.description
      }
      collectionImage={data.collectionImageUrl}
      breadcrumbs={[
        { name: "Home", path: "/" },
        { name: data.presentation.title, path },
      ]}
    />
  )
}
