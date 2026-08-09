import { notFound } from "next/navigation"

import CollectionView from "@/components/catalog/CollectionView"
import { loadTcgCollectionPage } from "@/lib/shopify/tcgPages"

type PageProps = {
  params: Promise<{ game: string }>
}

export default async function TcgGamePage({ params }: PageProps) {
  const { game } = await params
  const data = await loadTcgCollectionPage({ gameHandle: game })
  if (!data) notFound()

  return (
    <CollectionView
      presentation={data.presentation}
      products={data.products}
      heroProductCount={data.parentProducts.length}
      languageFacets={data.languageFacets}
      gameHandle={data.gameHandle}
      selectedLanguage={data.selectedLanguage}
      requiresLanguagePick={data.requiresLanguagePick}
    />
  )
}
