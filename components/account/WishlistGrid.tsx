"use client"

import Link from "next/link"
import { ShoppingBag, Trash2 } from "lucide-react"

import ProductCard from "@/components/catalog/ProductCard"
import { toCartItemKind } from "@/lib/cart/mixedCart"
import { useCart } from "@/lib/cart/useCart"
import { isPurchasable } from "@/lib/catalog"
import { useWishlist } from "@/lib/wishlist/useWishlist"
import type { Product } from "@/types/product"
import { cn } from "@/lib/utils"

type WishlistGridProps = {
  products: Product[]
}

export default function WishlistGrid({ products }: WishlistGridProps) {
  const { addItem } = useCart()
  const { remove, productIds, isHydrated } = useWishlist()

  // Before hydrate, trust the server-rendered list; after, follow live IDs.
  const visible = isHydrated
    ? products.filter((product) => productIds.includes(product.id))
    : products

  if (visible.length === 0) {
    return <WishlistEmptyState />
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
      {visible.map((product) => {
        const purchasable = isPurchasable(product)
        const href = product.url || `/products/${product.slug}`

        function handleMoveToCart() {
          const status = toCartItemKind(product.status)
          if (!status || !purchasable) return
          addItem({
            id: product.id,
            title: product.title,
            image: product.image,
            price: product.price,
            status,
            slug: product.slug,
            url: product.url,
          })
          remove(product.id)
        }

        return (
          <li key={product.id} className="flex flex-col gap-2.5">
            <ProductCard product={product} showQuickActions density="default" />
            <div className="flex flex-wrap gap-2">
              <Link
                href={href}
                className="inline-flex h-9 flex-1 items-center justify-center rounded-full border border-black/[0.08] bg-white px-3 text-xs font-semibold text-black transition-colors hover:bg-black/[0.03]"
              >
                View product
              </Link>
              <button
                type="button"
                onClick={handleMoveToCart}
                disabled={!purchasable}
                className={cn(
                  "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors",
                  purchasable
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "cursor-not-allowed bg-neutral-100 text-black/40"
                )}
              >
                <ShoppingBag className="size-3.5" aria-hidden="true" />
                Move to cart
              </button>
              <button
                type="button"
                onClick={() => remove(product.id)}
                aria-label={`Remove ${product.title} from wishlist`}
                className="inline-flex size-9 items-center justify-center rounded-full border border-black/[0.08] text-black/55 transition-colors hover:bg-black/[0.03] hover:text-black"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function WishlistEmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-black/[0.1] bg-white px-6 py-14 text-center">
      <p className="text-base font-semibold tracking-tight text-black">
        Your wishlist is empty
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-black/55">
        Tap the heart on any product to save it here. Your list follows your
        account across devices.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-green-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-green-700"
      >
        Continue shopping
      </Link>
    </div>
  )
}
