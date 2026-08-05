import CollectionView from "@/components/catalog/CollectionView"
import { getProducts } from "@/lib/catalog"

export default function OnePieceCollectionPage() {
  const products = getProducts("onepiece")

  return (
    <CollectionView
      title="One Piece"
      description="Japanese One Piece Card Game products — sealed releases sourced for U.S. collectors and stores."
      products={products}
    />
  )
}
