import LoadingChrome from "@/components/ux/LoadingChrome"
import { CollectionPageSkeleton } from "@/components/ux/skeletons/CollectionPageSkeleton"

export default function CollectionLoading() {
  return (
    <LoadingChrome label="Loading collection">
      <CollectionPageSkeleton />
    </LoadingChrome>
  )
}
