import type { Metadata } from "next"

import AccountShell from "@/components/account/AccountShell"
import AccountReviewsList, {
  ReviewsEmptyState,
} from "@/components/account/AccountReviewsList"
import { getMyReviews, ReviewsAuthError } from "@/lib/reviews/server"
import { getShopifyProductsByIds } from "@/lib/shopify"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Reviews",
  robots: { index: false, follow: false },
}

export default async function AccountReviewsPage() {
  let reviews: Awaited<ReturnType<typeof getMyReviews>> = []

  try {
    reviews = await getMyReviews()
  } catch (error) {
    if (!(error instanceof ReviewsAuthError)) {
      throw error
    }
  }

  const productIds = [...new Set(reviews.map((review) => review.productId))]
  const products =
    productIds.length > 0 ? await getShopifyProductsByIds(productIds) : []
  const byId = new Map(products.map((product) => [product.id, product]))

  const items = reviews.map((review) => ({
    review,
    product: byId.get(review.productId) ?? null,
  }))

  return (
    <AccountShell
      pathname="/account/reviews"
      title="Reviews"
      description="Reviews you've submitted — pending items can be deleted until approved."
    >
      {items.length === 0 ? (
        <ReviewsEmptyState />
      ) : (
        <AccountReviewsList items={items} />
      )}
    </AccountShell>
  )
}
