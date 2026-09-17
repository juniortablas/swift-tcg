import Image from "next/image"
import Link from "next/link"

import {
  formatAccountDate,
  formatAccountMoney,
  formatStatusLabel,
} from "@/lib/account/format"
import type { AccountAddress, AccountOrderDetail } from "@/types/account"

function AddressBlock({
  title,
  address,
}: {
  title: string
  address: AccountAddress | null
}) {
  if (!address) return null
  return (
    <div>
      <h3 className="text-sm font-medium text-black">{title}</h3>
      <div className="mt-2 space-y-0.5 text-sm text-black/60">
        {address.formatted.length > 0
          ? address.formatted.map((line) => <p key={line}>{line}</p>)
          : (
              <>
                {address.address1 ? <p>{address.address1}</p> : null}
                {address.city ? (
                  <p>
                    {[address.city, address.province, address.zip]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                ) : null}
                {address.country ? <p>{address.country}</p> : null}
              </>
            )}
      </div>
    </div>
  )
}

export default function OrderDetailView({ order }: { order: AccountOrderDetail }) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-black/50">
            Placed {formatAccountDate(order.processedAt)}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-black/60">
            <span>{formatStatusLabel(order.fulfillmentStatus)}</span>
            {order.financialStatus ? (
              <span>{formatStatusLabel(order.financialStatus)}</span>
            ) : null}
          </div>
        </div>
        <a
          href={order.statusPageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-indigo-700 hover:text-indigo-800"
        >
          View order status
        </a>
      </div>

      <div className="overflow-hidden rounded-xl border border-black/[0.06] bg-white">
        <ul className="divide-y divide-black/[0.06]">
          {order.lineItems.map((line) => (
            <li
              key={line.id}
              className="flex gap-4 px-4 py-4 sm:px-5"
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-black/[0.03]">
                {line.imageUrl ? (
                  <Image
                    src={line.imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-black">{line.name}</p>
                {line.variantTitle ? (
                  <p className="mt-0.5 text-sm text-black/50">{line.variantTitle}</p>
                ) : null}
                <p className="mt-1 text-sm text-black/50">Qty {line.quantity}</p>
              </div>
              <p className="shrink-0 text-sm font-medium text-black">
                {formatAccountMoney(line.totalPrice)}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        <AddressBlock title="Shipping" address={order.shippingAddress} />
        <AddressBlock title="Billing" address={order.billingAddress} />
      </div>

      <dl className="space-y-2 rounded-xl border border-black/[0.06] bg-white px-5 py-4 text-sm">
        {order.subtotal ? (
          <div className="flex justify-between gap-4">
            <dt className="text-black/55">Subtotal</dt>
            <dd className="font-medium text-black">
              {formatAccountMoney(order.subtotal)}
            </dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt className="text-black/55">Shipping</dt>
          <dd className="font-medium text-black">
            {formatAccountMoney(order.totalShipping)}
          </dd>
        </div>
        {order.totalTax ? (
          <div className="flex justify-between gap-4">
            <dt className="text-black/55">Tax</dt>
            <dd className="font-medium text-black">
              {formatAccountMoney(order.totalTax)}
            </dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4 border-t border-black/[0.06] pt-2">
          <dt className="font-medium text-black">Total</dt>
          <dd className="font-semibold text-black">
            {formatAccountMoney(order.totalPrice)}
          </dd>
        </div>
      </dl>

      <Link
        href="/account/orders"
        className="inline-flex text-sm font-medium text-black/60 hover:text-black"
      >
        ← Back to orders
      </Link>
    </div>
  )
}
