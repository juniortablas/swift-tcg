"use client"

/**
 * Add-to-bag control for product cards (client island).
 */

import { ShoppingBag } from "lucide-react"

import { toCartItemKind } from "@/lib/cart/mixedCart"
import { useCart } from "@/lib/cart/useCart"
import { getPurchaseCtaLabel, isPurchasable } from "@/lib/catalog"
import { trackWeeklyRestockLimitReached, trackWeeklyRestockReserved } from "@/lib/product/analytics"
import {
  isWeeklyRestockProduct,
  weeklyRestockAddableQuantity,
} from "@/lib/product/weeklyRestock"
import type { Product } from "@/types/product"

export default function ProductCardAddToCart({
  product,
}: {
  product: Product
}) {
  const { addItem, items } = useCart()
  const purchasable = isPurchasable(product)
  const canReserveMore = weeklyRestockAddableQuantity(product, items) > 0

  function handleAddToCart(event: React.MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    if (!purchasable) return
    if (isWeeklyRestockProduct(product) && !canReserveMore) {
      trackWeeklyRestockLimitReached(product)
      return
    }
    const status = toCartItemKind(product.status)
    if (!status) return
    if (isWeeklyRestockProduct(product)) {
      trackWeeklyRestockReserved(product)
    }
    addItem({
      id: product.id,
      title: product.title,
      image: product.image,
      price: product.price,
      status,
      slug: product.slug,
      url: product.url,
    })
  }

  return (
    <button
      type="button"
      onClick={handleAddToCart}
      disabled={!purchasable || !canReserveMore}
      className="pointer-events-auto inline-flex h-8 items-center justify-center gap-1 rounded-full bg-green-600 text-[11px] font-semibold text-white shadow-[0_8px_20px_-10px_rgba(22,163,74,0.55)] transition-transform duration-200 hover:scale-[1.02] hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-neutral-400 disabled:hover:scale-100 sm:h-10 sm:gap-1.5 sm:text-sm"
    >
      {purchasable ? (
        <ShoppingBag className="size-3 sm:size-3.5" aria-hidden="true" />
      ) : null}
      {getPurchaseCtaLabel(product, "card")}
    </button>
  )
}
