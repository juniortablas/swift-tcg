"use client"

import Image from "next/image"
import Link from "next/link"
import { Trash2 } from "lucide-react"

import { useBackInStock } from "@/lib/back-in-stock/useBackInStock"
import { formatUsdPrice } from "@/lib/pricing"
import type { Product } from "@/types/product"
import { cn } from "@/lib/utils"

export type NotificationRow = {
  product: Product
  subscribedAt: string
}

type NotificationsListProps = {
  rows: NotificationRow[]
}

function formatSubscribedDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function stockLabel(product: Product): { label: string; className: string } {
  if (product.status === "instock" || product.status === "preorder") {
    return {
      label: product.status === "preorder" ? "Preorder" : "In stock",
      className: "bg-green-600/10 text-green-700",
    }
  }
  if (product.status === "soldout") {
    return {
      label: "Sold out",
      className: "bg-neutral-500/10 text-neutral-600",
    }
  }
  return {
    label: "Unavailable",
    className: "bg-black/[0.04] text-black/50",
  }
}

export default function NotificationsList({ rows }: NotificationsListProps) {
  const { unsubscribe, productIds, isHydrated } = useBackInStock()

  const visible = isHydrated
    ? rows.filter((row) => productIds.includes(row.product.id))
    : rows

  if (visible.length === 0) {
    return <NotificationsEmptyState />
  }

  return (
    <ul className="divide-y divide-black/[0.06] overflow-hidden rounded-xl border border-black/[0.06] bg-white">
      {visible.map(({ product, subscribedAt }) => {
        const href = product.url || `/products/${product.slug}`
        const stock = stockLabel(product)

        return (
          <li
            key={product.id}
            className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:gap-4 sm:p-4"
          >
            <Link
              href={href}
              className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-[#f4f6f5] sm:size-24"
            >
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.title}
                  fill
                  sizes="96px"
                  className="object-contain p-1.5"
                />
              ) : null}
            </Link>

            <div className="min-w-0 flex-1">
              <Link
                href={href}
                className="line-clamp-2 text-sm font-semibold tracking-tight text-black hover:underline sm:text-[15px]"
              >
                {product.title}
              </Link>
              <p className="mt-1 text-xs text-black/50">
                Subscribed {formatSubscribedDate(subscribedAt)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.06em] uppercase",
                    stock.className
                  )}
                >
                  {stock.label}
                </span>
                <span className="text-sm font-medium text-black/70">
                  {formatUsdPrice(product.price)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:flex-col sm:items-stretch">
              <Link
                href={href}
                className="inline-flex h-9 flex-1 items-center justify-center rounded-full border border-black/[0.08] bg-white px-3 text-xs font-semibold text-black transition-colors hover:bg-black/[0.03] sm:flex-none"
              >
                View product
              </Link>
              <button
                type="button"
                onClick={() => unsubscribe(product.id)}
                aria-label={`Remove alert for ${product.title}`}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-black/[0.08] px-3 text-xs font-semibold text-black/55 transition-colors hover:bg-black/[0.03] hover:text-black"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Remove
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function NotificationsEmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-black/[0.1] bg-white px-6 py-14 text-center">
      <p className="text-base font-semibold tracking-tight text-black">
        No stock alerts yet
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-black/55">
        When a product is sold out, tap Notify Me on the product page. We&apos;ll
        email you when it returns — alerts sync with your Shopify account.
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
