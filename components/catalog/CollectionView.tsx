import CollectionBrowseSection from "@/components/catalog/CollectionBrowseSection"
import CollectionHero from "@/components/catalog/CollectionHero"
import Newsletter from "@/components/home/Newsletter"
import StoreChrome from "@/components/layout/StoreChrome"
import CollectionJsonLd from "@/components/seo/CollectionJsonLd"
import type { CollectionPresentation } from "@/lib/catalog"
import type { BreadcrumbItem } from "@/lib/seo"
import type { BrowseFacet } from "@/lib/shopify/browseHierarchy"
import type { CollectionLanguageFacet } from "@/lib/shopify/collectionFacets"
import type { Product } from "@/types/product"

type CollectionViewProps = {
  presentation: CollectionPresentation
  products: Product[]
  /** Parent / merch product count for the hero. */
  heroProductCount?: number
  /** TCG cards for merchandising pages. */
  gameFacets?: BrowseFacet[]
  merchBasePath?: string
  selectedGame?: string | null
  selectedGameLabel?: string | null
  requiresGamePick?: boolean
  languageFacets?: CollectionLanguageFacet[]
  /** Required for TCG language card links (`/{game}/{language}`). */
  gameHandle?: string
  /** Merchandising language base (`/preorders/pokemon`). */
  languageBasePath?: string
  selectedLanguage?: string | null
  requiresLanguagePick?: boolean
  selectedLanguageLabel?: string | null
  hideEmptyLanguages?: boolean
  /** Canonical path for CollectionPage JSON-LD. */
  canonicalPath?: string
  collectionDescription?: string
  collectionImage?: string | null
  breadcrumbs?: BreadcrumbItem[]
}

export default function CollectionView({
  presentation,
  products,
  heroProductCount,
  gameFacets = [],
  merchBasePath,
  selectedGame = null,
  requiresGamePick = false,
  languageFacets = [],
  gameHandle,
  languageBasePath,
  selectedLanguage = null,
  requiresLanguagePick = false,
  hideEmptyLanguages = false,
  canonicalPath,
  collectionDescription,
  collectionImage,
  breadcrumbs,
}: CollectionViewProps) {
  const count = heroProductCount ?? products.length
  const path = canonicalPath || "/"
  const description =
    collectionDescription?.trim() || presentation.description
  const crumbs: BreadcrumbItem[] = breadcrumbs?.length
    ? breadcrumbs
    : [
        { name: "Home", path: "/" },
        { name: presentation.breadcrumb || presentation.title, path },
      ]

  return (
    <StoreChrome>
      <CollectionJsonLd
        name={presentation.title}
        description={description}
        path={path}
        image={collectionImage || presentation.images[0]?.src}
        breadcrumbs={crumbs}
      />
      <main className="bg-white">
        <div className="mx-auto max-w-[1920px] px-4 pt-3 pb-6 sm:px-6 sm:pt-8 sm:pb-12 lg:px-8 lg:pt-10 lg:pb-14 xl:px-10">
          <CollectionHero collection={presentation} productCount={count} />

          <div className="mt-4 sm:mt-10">
            <CollectionBrowseSection
              products={products}
              searchPlaceholder={presentation.searchPlaceholder}
              gameFacets={gameFacets}
              merchBasePath={merchBasePath}
              selectedGame={selectedGame}
              requiresGamePick={requiresGamePick}
              languageFacets={languageFacets}
              gameHandle={gameHandle}
              languageBasePath={languageBasePath}
              selectedLanguage={selectedLanguage}
              requiresLanguagePick={requiresLanguagePick}
              hideEmptyLanguages={hideEmptyLanguages}
            />
          </div>
        </div>

        <div className="flex flex-col gap-5 border-t border-black/[0.05] pt-5 pb-6 sm:gap-10 sm:pt-12 sm:pb-12 lg:pt-14 lg:pb-14">
          <Newsletter />
        </div>
      </main>
    </StoreChrome>
  )
}
