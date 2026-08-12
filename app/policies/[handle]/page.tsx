import type { Metadata } from "next"
import { notFound } from "next/navigation"

import ContentShell from "@/components/content/ContentShell"
import PolicyPageContent from "@/components/content/PolicyPageContent"
import StoreChrome from "@/components/layout/StoreChrome"
import JsonLd from "@/components/seo/JsonLd"
import {
  breadcrumbListJsonLd,
  buildPageMetadata,
  stripHtml,
  truncateMeta,
} from "@/lib/seo"
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

const POLICY_FALLBACK_DESCRIPTIONS: Record<string, string> = {
  "privacy-policy":
    "Read how Swift TCG collects, uses, and protects your personal information.",
  "refund-policy":
    "Swift TCG refund and return policy for sealed Japanese TCG orders.",
  "shipping-policy":
    "Shipping timelines, carriers, and fulfillment details for Swift TCG orders.",
  "terms-of-service":
    "Terms of service for shopping at Swift TCG.",
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { handle } = await params
  const policy = await getShopifyPolicyByHandle(handle)
  if (!policy) {
    return { title: "Policy not found", robots: { index: false, follow: false } }
  }

  const path = `/policies/${policy.handle}`
  const fromBody = stripHtml(policy.bodyHtml)
  const description =
    fromBody ||
    POLICY_FALLBACK_DESCRIPTIONS[policy.handle] ||
    `${policy.title} — Swift TCG`

  return buildPageMetadata({
    title: policy.title,
    description: truncateMeta(description),
    path,
  })
}

export default async function ShopifyPolicyPage({ params }: PageProps) {
  const { handle } = await params
  const policy = await getShopifyPolicyByHandle(handle)
  if (!policy) notFound()

  const kind =
    KIND_BY_HANDLE[policy.handle] ??
    KIND_BY_HANDLE[handle] ??
    policy.kind
  const path = `/policies/${policy.handle}`

  return (
    <StoreChrome>
      <JsonLd
        data={breadcrumbListJsonLd([
          { name: "Home", path: "/" },
          { name: policy.title, path },
        ])}
      />
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
