import type { Metadata } from "next"
import { notFound } from "next/navigation"

import ContentPageView from "@/components/content/ContentPageView"
import ContentShell from "@/components/content/ContentShell"
import StoreChrome from "@/components/layout/StoreChrome"
import JsonLd from "@/components/seo/JsonLd"
import {
  breadcrumbListJsonLd,
  buildPageMetadata,
  stripHtml,
} from "@/lib/seo"
import { getShopifyPageByHandle } from "@/lib/shopify/content"

type PageProps = {
  params: Promise<{ handle: string }>
}

const WIDE_HANDLES = new Set(["about", "contact"])

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { handle } = await params
  const page = await getShopifyPageByHandle(handle)
  if (!page) {
    return { title: "Page not found", robots: { index: false, follow: false } }
  }

  const path = `/pages/${page.handle}`
  const description =
    page.seo.description ||
    page.bodySummary ||
    stripHtml(page.bodyHtml) ||
    undefined

  return buildPageMetadata({
    title: page.seo.title || page.title,
    description,
    path,
  })
}

export default async function ShopifyContentPage({ params }: PageProps) {
  const { handle } = await params
  const page = await getShopifyPageByHandle(handle)
  if (!page) notFound()

  const wide = WIDE_HANDLES.has(page.handle)
  const path = `/pages/${page.handle}`

  return (
    <StoreChrome>
      <JsonLd
        data={breadcrumbListJsonLd([
          { name: "Home", path: "/" },
          { name: page.title, path },
        ])}
      />
      <main className="bg-white dark:bg-background">
        {wide ? (
          <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 xl:px-10">
            <ContentPageView
              handle={page.handle}
              title={page.title}
              bodyHtml={page.bodyHtml}
              contact={page.contact}
            />
          </div>
        ) : (
          <ContentShell>
            <ContentPageView
              handle={page.handle}
              title={page.title}
              bodyHtml={page.bodyHtml}
              contact={page.contact}
            />
          </ContentShell>
        )}
      </main>
    </StoreChrome>
  )
}
