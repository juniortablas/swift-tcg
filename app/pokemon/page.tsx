import CollectionView from "@/components/catalog/CollectionView"
import { getProducts } from "@/lib/catalog"

export default function PokemonCollectionPage() {
  const products = getProducts("pokemon")

  return (
    <CollectionView
      title="Pokémon"
      description="Authentic Japanese Pokémon TCG releases — factory sealed and imported for collectors in the United States."
      products={products}
    />
  )
}
