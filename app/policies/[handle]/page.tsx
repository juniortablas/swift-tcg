import type { Metadata } from "next"
import { notFound } from "next/navigation"

import ContentShell from "@/components/content/ContentShell"
import PolicyPageContent from "@/components/content/PolicyPageContent"
import StoreChrome from "@/components/layout/StoreChrome"
import { getShopifyPolicyByHandle } from "@/lib/shopify/content"
import type { ShopPolicyKind } from "@/types/content"

type PageProps = {
  params: Promise<{ handle: string }>
}

const KIND_BY_HANDLE: Record<string, ShopPolicyKind> = {
  "privacy-policy": "privacyPolicy",
  "refund-policy": "refundPolicy",
  "shipping-policy": "shippingPolicy",
  "terms-of-service": "termsOfService",
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { handle } = await params
  const policy = await getShopifyPolicyByHandle(handle)
  if (!policy) {
    return { title: "Policy not found" }
  }

  return {
    title: policy.title,
  }
}

export default async function ShopifyPolicyPage({ params }: PageProps) {
  const { handle } = await params
  const policy = await getShopifyPolicyByHandle(handle)
  if (!policy) notFound()

  const kind =
    KIND_BY_HANDLE[policy.handle] ??
    KIND_BY_HANDLE[handle] ??
    policy.kind

  return (
    <StoreChrome>
      <main className="bg-white dark:bg-background">
        <ContentShell>
          <PolicyPageContent
            title={policy.title}
            bodyHtml={policy.bodyHtml}
            kind={kind}
          />
        </ContentShell>
      </main>
    </StoreChrome>
  )
}
