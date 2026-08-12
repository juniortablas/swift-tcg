import type { Metadata } from "next"

import AccountShell from "@/components/account/AccountShell"
import WishlistGrid, {
  WishlistEmptyState,
} from "@/components/account/WishlistGrid"
import { getShopifyProductsByIds } from "@/lib/shopify"
import { getWishlistSnapshot, WishlistAuthError } from "@/lib/wishlist/server"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Wishlist",
  robots: { index: false, follow: false },
}

export default async function AccountWishlistPage() {
  let productIds: string[] = []

  try {
    const snapshot = await getWishlistSnapshot()
    productIds = snapshot.productIds
  } catch (error) {
    if (!(error instanceof WishlistAuthError)) {
      throw error
    }
  }

  const products =
    productIds.length > 0 ? await getShopifyProductsByIds(productIds) : []

  return (
    <AccountShell
      pathname="/account/wishlist"
      title="Wishlist"
      description="Products you've saved — synced to your Shopify customer account."
    >
      {products.length === 0 ? (
        <WishlistEmptyState />
      ) : (
        <WishlistGrid products={products} />
      )}
    </AccountShell>
  )
}
