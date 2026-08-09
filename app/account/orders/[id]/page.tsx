import type { Metadata } from "next"
import { notFound } from "next/navigation"

import AccountShell from "@/components/account/AccountShell"
import OrderDetailView from "@/components/account/OrderDetailView"
import { getCustomerOrderById } from "@/lib/shopify/customerAccount"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params
  const order = await getCustomerOrderById(decodeURIComponent(id)).catch(
    () => null
  )
  return {
    title: order ? `${order.name} | Swift TCG` : "Order | Swift TCG",
    robots: { index: false, follow: false },
  }
}

export default async function AccountOrderDetailPage({ params }: PageProps) {
  const { id } = await params
  const orderId = decodeURIComponent(id)
  const order = await getCustomerOrderById(orderId)
  if (!order) notFound()

  return (
    <AccountShell
      pathname="/account/orders"
      title={order.name}
      description="Order details from your Shopify customer account."
    >
      <OrderDetailView order={order} />
    </AccountShell>
  )
}
