import type { Metadata } from "next"
import { notFound } from "next/navigation"

import CollectionView from "@/components/catalog/CollectionView"
import {
  merchCollectionMetadata,
  merchCollectionPath,
} from "@/lib/seo"
import { loadMerchCollectionPage } from "@/lib/shopify/merchPages"

type PageProps = {
  params: Promise<{ game: string; language: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { game, language } = await params
  const data = await loadMerchCollectionPage({
    merchKey: "new-releases",
    gameHandle: game,
    languageSlug: language,
  })
  if (!data || !data.selectedGame || !data.selectedLanguage) {
    return {
      title: "New Releases not found",
      robots: { index: false, follow: false },
    }
  }
  return merchCollectionMetadata(data)
}

export default async function NewReleasesLanguagePage({ params }: PageProps) {
  const { game, language } = await params
  const data = await loadMerchCollectionPage({
    merchKey: "new-releases",
    gameHandle: game,
    languageSlug: language,
  })
  if (!data || !data.selectedGame || !data.selectedLanguage) notFound()

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
      gameHandle={data.selectedGame}
      languageBasePath={`${data.basePath}/${data.selectedGame}`}
      selectedLanguage={data.selectedLanguage}
      selectedLanguageLabel={data.selectedLanguageLabel}
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
        { name: data.presentation.title, path: data.basePath },
        {
          name: data.selectedGameLabel || data.selectedGame,
          path: `${data.basePath}/${data.selectedGame}`,
        },
        {
          name: data.selectedLanguageLabel || data.selectedLanguage,
          path,
        },
      ]}
    />
  )
}
