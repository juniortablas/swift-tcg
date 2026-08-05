import CollectionView from "@/components/catalog/CollectionView"
import { getProducts } from "@/lib/catalog"

export default function NewReleasesPage() {
  // Catalog order from SORA is newest-first; combine both games.
  const products = [...getProducts("pokemon"), ...getProducts("onepiece")]

  return (
    <CollectionView
      title="New Releases"
      description="The latest Japanese TCG arrivals across Pokémon and One Piece."
      products={products}
    />
  )
}
