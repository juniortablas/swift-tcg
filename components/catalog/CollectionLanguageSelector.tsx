"use client"

import CollectionNavCards from "@/components/catalog/CollectionNavCards"
import type { CollectionLanguageFacet } from "@/lib/shopify/collectionFacets"

type CollectionLanguageCardsProps = {
  facets: CollectionLanguageFacet[]
  gameHandle: string
  /** Optional base path for merchandising pages (`/preorders/pokemon`). */
  basePath?: string
  selectedLanguage?: string | null
  className?: string
  showComingSoon?: boolean
}

/**
 * Language navigation for TCG and merchandising collection pages.
 */
export default function CollectionLanguageCards({
  facets,
  gameHandle,
  basePath,
  selectedLanguage = null,
  className,
  showComingSoon = true,
}: CollectionLanguageCardsProps) {
  const languageBase = basePath ?? `/${gameHandle}`

  return (
    <CollectionNavCards
      facets={facets}
      hrefPrefix={languageBase}
      selectedSlug={selectedLanguage}
      heading="Shop by Language"
      resetHref={languageBase}
      resetLabel="All languages"
      ariaLabel="Languages"
      className={className}
      showComingSoon={showComingSoon}
    />
  )
}
