import JsonLd from "@/components/seo/JsonLd"
import { productJsonLd } from "@/lib/seo"
import type { ProductReview, ReviewSummary } from "@/lib/reviews/types"
import type { Product } from "@/types/product"

/**
 * Legacy PDP review schema helper.
 * Prefer `ProductJsonLd` (Product + Offer + breadcrumbs). This still emits
 * full Product schema via the shared builder when reviews exist.
 */
export default function ReviewsJsonLd({
  product,
  summary,
  reviews = [],
}: {
  product: Product
  summary: ReviewSummary
  reviews?: ProductReview[]
}) {
  if (summary.count <= 0) return null

  return (
    <JsonLd data={productJsonLd({ product, summary, reviews })} />
  )
}
