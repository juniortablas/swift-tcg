import type { Metadata } from "next"

import CollectionView from "@/components/catalog/CollectionView"
import {
  merchCollectionMetadata,
  merchCollectionPath,
} from "@/lib/seo"
import { loadMerchCollectionPage } from "@/lib/shopify/merchPages"

export async function generateMetadata(): Promise<Metadata> {
  const data = await loadMerchCollectionPage({ merchKey: "preorders" })
  if (!data) {
    return { title: "Preorders" }
  }
  return merchCollectionMetadata(data)
}

export default async function PreordersPage() {
  const data = await loadMerchCollectionPage({ merchKey: "preorders" })
  if (!data) return null

  const path = merchCollectionPath(data)

  return (
    <CollectionView
      presentation={data.presentation}
      products={data.products}
      heroProductCount={data.heroProductCount}
      gameFacets={data.gameFacets}
      merchBasePath={data.basePath}
      selectedGame={data.selectedGame}
      requiresGamePick={data.requiresGamePick}
      languageFacets={data.languageFacets}
      languageBasePath={
        data.selectedGame ? `${data.basePath}/${data.selectedGame}` : undefined
      }
      selectedLanguage={data.selectedLanguage}
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
