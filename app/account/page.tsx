import Link from "next/link"
import type { Metadata } from "next"

import AccountShell from "@/components/account/AccountShell"
import OrdersTable from "@/components/account/OrdersTable"
import { getCustomerDashboard } from "@/lib/shopify/customerAccount"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
}

export default async function AccountDashboardPage() {
  const { customer, recentOrders } = await getCustomerDashboard()

  return (
    <AccountShell
      pathname="/account"
      title={customer.firstName ? `Hi, ${customer.firstName}` : "Your account"}
      description="Orders, addresses, and profile — signed in with Shopify Customer Accounts."
    >
      <div className="space-y-8">
        <section className="rounded-xl border border-black/[0.06] bg-white px-5 py-5">
          <h2 className="text-sm font-medium text-black">Profile</h2>
          <p className="mt-2 text-sm text-black/60">
            {customer.displayName}
            {customer.email ? (
              <>
                <span className="text-black/30"> · </span>
                {customer.email}
              </>
            ) : null}
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link
              href="/account/wishlist"
              className="font-medium text-indigo-700 hover:text-indigo-800"
            >
              Wishlist
            </Link>
            <Link
              href="/account/profile"
              className="font-medium text-indigo-700 hover:text-indigo-800"
            >
              Edit profile
            </Link>
            <Link
              href="/account/addresses"
              className="font-medium text-indigo-700 hover:text-indigo-800"
            >
              Manage addresses
            </Link>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-black">Recent orders</h2>
            <Link
              href="/account/orders"
              className="text-sm font-medium text-indigo-700 hover:text-indigo-800"
            >
              View all
            </Link>
          </div>
          <OrdersTable
            orders={recentOrders}
            emptyMessage="You haven’t placed an order yet."
          />
        </section>
      </div>
    </AccountShell>
  )
}
