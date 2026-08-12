export type CollectionId =
  | "pokemon"
  | "one-piece"
  | "preorders"
  | "new-releases"

export type CollectionHeroImage = {
  src: string
  alt: string
  className: string
  /**
   * When set by Storefront CMS, CollectionHero shows this image only on that
   * viewport. Collage fallbacks omit `media` and keep their coded classNames.
   */
  media?: "desktop" | "mobile"
}

/** Presentation fields shared by static and dynamic TCG collection pages. */
export type CollectionPresentation = {
  title: string
  description: string
  breadcrumb: string
  searchPlaceholder: string
  atmosphere: string
  images: readonly CollectionHeroImage[]
}

export type CollectionConfig = CollectionPresentation & {
  id: CollectionId
}

export const COLLECTIONS: Record<CollectionId, CollectionConfig> = {
  pokemon: {
    id: "pokemon",
    title: "Pokémon TCG",
    breadcrumb: "Pokémon",
    description:
      "Authentic Japanese Pokémon booster boxes, starter decks, accessories, and new releases.",
    searchPlaceholder: "Search Pokémon products...",
    atmosphere:
      "bg-[radial-gradient(ellipse_at_85%_15%,rgba(233,213,255,0.55)_0%,transparent_42%),radial-gradient(ellipse_at_15%_100%,rgba(126,34,206,0.4)_0%,transparent_48%),linear-gradient(125deg,#2e1065_0%,#6b21a8_40%,#a21caf_100%)]",
    images: [
      {
        src: "/products/mega-symphonia.webp",
        alt: "Japanese Pokémon sealed product",
        className:
          "absolute -right-[4%] top-[55%] h-[175%] w-auto -translate-y-1/2 rotate-3 object-contain drop-shadow-[0_28px_48px_rgba(0,0,0,0.55)] sm:top-1/2 sm:h-[195%] sm:-right-[2%] lg:h-[210%]",
      },
      {
        src: "/products/30th-celebration.webp",
        alt: "Japanese Pokémon sealed product",
        className:
          "absolute right-[26%] top-[58%] hidden h-[130%] w-auto -translate-y-1/2 -rotate-8 object-contain opacity-80 drop-shadow-[0_20px_36px_rgba(0,0,0,0.4)] md:block",
      },
    ],
  },
  "one-piece": {
    id: "one-piece",
    title: "One Piece TCG",
    breadcrumb: "One Piece",
    description:
      "Japanese One Piece Card Game sealed product — booster boxes, starter decks, and premium collections.",
    searchPlaceholder: "Search One Piece products...",
    atmosphere:
      "bg-[radial-gradient(ellipse_at_85%_10%,rgba(254,215,170,0.55)_0%,transparent_42%),radial-gradient(ellipse_at_10%_95%,rgba(185,28,28,0.5)_0%,transparent_48%),linear-gradient(125deg,#7f1d1d_0%,#c2410c_42%,#ea580c_100%)]",
    images: [
      {
        src: "/products/awakening-of-the-new-era.webp",
        alt: "Japanese One Piece sealed product",
        className:
          "absolute -right-[6%] top-1/2 h-[165%] w-auto -translate-y-1/2 -rotate-2 object-contain drop-shadow-[0_28px_48px_rgba(0,0,0,0.55)] sm:h-[180%] sm:-right-[4%]",
      },
      {
        src: "/products/emperors-in-the-new-world.webp",
        alt: "One Piece Card Game sealed collection",
        className:
          "absolute right-[30%] top-[54%] hidden h-[115%] w-auto -translate-y-1/2 rotate-6 object-contain opacity-65 drop-shadow-[0_20px_36px_rgba(0,0,0,0.4)] md:block",
      },
    ],
  },
  preorders: {
    id: "preorders",
    title: "Preorders",
    breadcrumb: "Preorders",
    description:
      "Secure Japan’s next sealed releases before they land — clear ship windows and California fulfillment.",
    searchPlaceholder: "Search preorder products...",
    atmosphere:
      "bg-[radial-gradient(ellipse_at_70%_30%,rgba(253,224,71,0.28)_0%,transparent_45%),linear-gradient(125deg,#020617_0%,#1e293b_48%,#334155_100%)]",
    images: [
      {
        src: "/products/30th-celebration.webp",
        alt: "Upcoming Japanese Pokémon preorder product",
        className:
          "absolute right-[18%] top-[48%] h-[130%] w-auto -translate-y-1/2 -rotate-10 object-contain opacity-70 drop-shadow-[0_20px_36px_rgba(0,0,0,0.45)]",
      },
      {
        src: "/products/egghead-crisis.webp",
        alt: "Upcoming Japanese TCG preorder products",
        className:
          "absolute -right-[8%] top-1/2 h-[160%] w-auto -translate-y-1/2 rotate-8 object-contain drop-shadow-[0_28px_48px_rgba(0,0,0,0.5)] sm:h-[175%]",
      },
    ],
  },
  "new-releases": {
    id: "new-releases",
    title: "New Releases",
    breadcrumb: "New Releases",
    description:
      "The latest Japanese TCG arrivals across Pokémon and One Piece — factory sealed and ready to ship.",
    searchPlaceholder: "Search new releases...",
    atmosphere:
      "bg-[radial-gradient(ellipse_at_80%_20%,rgba(134,239,172,0.28)_0%,transparent_42%),linear-gradient(125deg,#052e16_0%,#14532d_45%,#166534_100%)]",
    images: [
      {
        src: "/products/white-flare.webp",
        alt: "New Japanese Pokémon TCG release",
        className:
          "absolute right-[22%] top-[50%] hidden h-[125%] w-auto -translate-y-1/2 -rotate-6 object-contain opacity-70 drop-shadow-[0_20px_36px_rgba(0,0,0,0.4)] md:block",
      },
      {
        src: "/products/romance-dawn.webp",
        alt: "Newest Japanese TCG arrivals",
        className:
          "absolute -right-[6%] top-1/2 h-[165%] w-auto -translate-y-1/2 rotate-3 object-contain drop-shadow-[0_28px_48px_rgba(0,0,0,0.5)] sm:h-[180%]",
      },
    ],
  },
}
