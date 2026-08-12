import JsonLd from "@/components/seo/JsonLd"
import {
  breadcrumbListJsonLd,
  productJsonLd,
  type BreadcrumbItem,
} from "@/lib/seo"
import type { ProductReview, ReviewSummary } from "@/lib/reviews/types"
import type { Product } from "@/types/product"

/**
 * Product + Offer (+ AggregateRating / Review when available) and BreadcrumbList.
 * Always emits Product schema so rich results work with zero reviews.
 */
export default function ProductJsonLd({
  product,
  summary,
  reviews = [],
  breadcrumbs,
}: {
  product: Product
  summary?: ReviewSummary | null
  reviews?: ProductReview[]
  breadcrumbs: BreadcrumbItem[]
}) {
  return (
    <JsonLd
      data={[
        productJsonLd({ product, summary, reviews }),
        breadcrumbListJsonLd(breadcrumbs),
      ]}
    />
  )
}
