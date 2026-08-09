import CollectionBrowser from "@/components/catalog/CollectionBrowser"
import CollectionLanguageCards from "@/components/catalog/CollectionLanguageSelector"
import CollectionNavCards from "@/components/catalog/CollectionNavCards"
import type { BrowseFacet } from "@/lib/shopify/browseHierarchy"
import type { CollectionLanguageFacet } from "@/lib/shopify/collectionFacets"
import type { Product } from "@/types/product"

type CollectionBrowseSectionProps = {
  products: Product[]
  searchPlaceholder: string
  /** TCG cards for merchandising pages (Preorders / New Releases). */
  gameFacets?: BrowseFacet[]
  /** Base path for merchandising (`/preorders`) — used for TCG card links. */
  merchBasePath?: string
  selectedGame?: string | null
  requiresGamePick?: boolean
  languageFacets?: CollectionLanguageFacet[]
  /** Required for TCG language card links (`/{game}/{language}`). */
  gameHandle?: string
  /**
   * When set (merchandising), language cards link under
   * `{merchBasePath}/{game}/{language}` instead of `/{game}/{language}`.
   */
  languageBasePath?: string
  selectedLanguage?: string | null
  /** When true and no language is selected, hide the product grid. */
  requiresLanguagePick?: boolean
  /** Hide empty language cards instead of "Coming Soon". */
  hideEmptyLanguages?: boolean
}

export default function CollectionBrowseSection({
  products,
  searchPlaceholder,
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
}: CollectionBrowseSectionProps) {
  const showGameCards = Boolean(merchBasePath) && gameFacets.length >= 1
  const languageParent =
    languageBasePath ?? (gameHandle ? `/${gameHandle}` : null)
  const showLanguageCards =
    Boolean(languageParent) &&
    languageFacets.length >= 1 &&
    (!requiresGamePick || Boolean(selectedGame))

  const gameReady = !requiresGamePick || Boolean(selectedGame)
  const languageReady = !requiresLanguagePick || Boolean(selectedLanguage)
  const showProducts = gameReady && languageReady

  return (
    <div>
      {showGameCards && merchBasePath ? (
        <CollectionNavCards
          facets={gameFacets}
          hrefPrefix={merchBasePath}
          selectedSlug={selectedGame}
          heading="Shop by TCG"
          resetHref={merchBasePath}
          resetLabel="All TCGs"
          ariaLabel="Trading card games"
          className="mb-4 sm:mb-10"
          showComingSoon={false}
        />
      ) : null}

      {showLanguageCards && languageParent && gameHandle ? (
        <CollectionLanguageCards
          facets={languageFacets}
          gameHandle={gameHandle}
          basePath={languageParent}
          selectedLanguage={selectedLanguage}
          className="mb-4 sm:mb-10"
          showComingSoon={!hideEmptyLanguages}
        />
      ) : null}

      {showProducts ? (
        <CollectionBrowser
          products={products}
          searchPlaceholder={searchPlaceholder}
        />
      ) : null}
    </div>
  )
}
