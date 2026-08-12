import Link from "next/link"

import EmptyState from "@/components/ux/EmptyState"
import { PackageEmptyIllustration } from "@/components/ux/EmptyIllustrations"
import {
  formatAccountDate,
  formatAccountMoney,
  formatStatusLabel,
} from "@/lib/account/format"
import type { AccountOrderSummary } from "@/types/account"

type OrdersTableProps = {
  orders: AccountOrderSummary[]
  emptyMessage?: string
}

export default function OrdersTable({
  orders,
  emptyMessage = "When you place an order, it will appear here with tracking and status updates.",
}: OrdersTableProps) {
  if (orders.length === 0) {
    return (
      <EmptyState
        illustration={<PackageEmptyIllustration />}
        title="No orders yet"
        description={emptyMessage}
        actions={[
          { label: "Browse new releases", href: "/new-releases" },
          {
            label: "Shop Pokémon",
            href: "/pokemon",
            variant: "secondary",
          },
        ]}
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-black/[0.06] bg-white">
      <ul className="divide-y divide-black/[0.06]">
        {orders.map((order) => (
          <li key={order.id}>
            <Link
              href={`/account/orders/${encodeURIComponent(order.id)}`}
              className="flex flex-col gap-2 px-4 py-4 transition-colors hover:bg-black/[0.02] sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div className="min-w-0">
                <p className="font-medium text-black">{order.name}</p>
                <p className="mt-0.5 text-sm text-black/50">
                  {formatAccountDate(order.processedAt)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="text-black/55">
                  {formatStatusLabel(order.fulfillmentStatus)}
                </span>
                <span className="font-medium text-black">
                  {formatAccountMoney(order.totalPrice)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
