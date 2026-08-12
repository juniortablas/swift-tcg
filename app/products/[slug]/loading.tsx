import LoadingChrome from "@/components/ux/LoadingChrome"
import { ProductPageSkeleton } from "@/components/ux/skeletons/ProductPageSkeleton"

export default function ProductLoading() {
  return (
    <LoadingChrome label="Loading product">
      <ProductPageSkeleton />
    </LoadingChrome>
  )
}
