import type { Metadata } from "next"

import AccountShell from "@/components/account/AccountShell"
import OrdersTable from "@/components/account/OrdersTable"
import { getCustomerOrders } from "@/lib/shopify/customerAccount"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Orders",
  robots: { index: false, follow: false },
}

export default async function AccountOrdersPage() {
  const { orders } = await getCustomerOrders({ first: 25 })

  return (
    <AccountShell
      pathname="/account/orders"
      title="Orders"
      description="Your Swift TCG order history from Shopify."
    >
      <OrdersTable orders={orders} />
    </AccountShell>
  )
}
