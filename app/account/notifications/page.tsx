import type { Metadata } from "next"

import AccountShell from "@/components/account/AccountShell"
import NotificationsList, {
  NotificationsEmptyState,
  type NotificationRow,
} from "@/components/account/NotificationsList"
import {
  getBackInStockSnapshot,
  BisAuthError,
} from "@/lib/back-in-stock/server"
import { getShopifyProductsByIds } from "@/lib/shopify"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
}

export default async function AccountNotificationsPage() {
  let rows: NotificationRow[] = []

  try {
    const snapshot = await getBackInStockSnapshot()
    const productIds = snapshot.subscriptions.map((s) => s.productId)
    const products =
      productIds.length > 0 ? await getShopifyProductsByIds(productIds) : []
    const byId = new Map(products.map((product) => [product.id, product]))

    rows = snapshot.subscriptions
      .map((subscription) => {
        const product = byId.get(subscription.productId)
        if (!product) return null
        return {
          product,
          subscribedAt: subscription.subscribedAt,
        }
      })
      .filter((row): row is NotificationRow => Boolean(row))
  } catch (error) {
    if (!(error instanceof BisAuthError)) {
      throw error
    }
  }

  return (
    <AccountShell
      pathname="/account/notifications"
      title="Notifications"
      description="Back-in-stock alerts synced to your Shopify customer account."
    >
      {rows.length === 0 ? (
        <NotificationsEmptyState />
      ) : (
        <NotificationsList rows={rows} />
      )}
    </AccountShell>
  )
}
