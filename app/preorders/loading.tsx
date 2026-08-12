import LoadingChrome from "@/components/ux/LoadingChrome"
import { CollectionPageSkeleton } from "@/components/ux/skeletons/CollectionPageSkeleton"

export default function PreordersLoading() {
  return (
    <LoadingChrome label="Loading preorders">
      <CollectionPageSkeleton />
    </LoadingChrome>
  )
}
