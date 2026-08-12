import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import CollectionView from "@/components/catalog/CollectionView"
import {
  tcgCollectionMetadata,
  tcgCollectionPath,
} from "@/lib/seo"
import {
  loadTcgCollectionPage,
  tcgLanguageHandleRedirect,
} from "@/lib/shopify/tcgPages"

type PageProps = {
  params: Promise<{ game: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { game } = await params
  if (tcgLanguageHandleRedirect(game)) {
    return { robots: { index: false, follow: true } }
  }
  const data = await loadTcgCollectionPage({ gameHandle: game })
  if (!data) {
    return { title: "Collection not found", robots: { index: false, follow: false } }
  }
  return tcgCollectionMetadata(data)
}

export default async function TcgGamePage({ params }: PageProps) {
  const { game } = await params
  const languageRedirect = tcgLanguageHandleRedirect(game)
  if (languageRedirect) redirect(languageRedirect)

  const data = await loadTcgCollectionPage({ gameHandle: game })
  if (!data) notFound()

  const path = tcgCollectionPath(data)

  return (
    <CollectionView
      presentation={data.presentation}
      products={data.products}
      heroProductCount={data.parentProducts.length}
      languageFacets={data.languageFacets}
      gameHandle={data.gameHandle}
      selectedLanguage={data.selectedLanguage}
      requiresLanguagePick={data.requiresLanguagePick}
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
          path,
        },
      ]}
    />
  )
}
