import LoadingChrome from "@/components/ux/LoadingChrome"
import { CollectionPageSkeleton } from "@/components/ux/skeletons/CollectionPageSkeleton"

export default function NewReleasesLoading() {
  return (
    <LoadingChrome label="Loading new releases">
      <CollectionPageSkeleton />
    </LoadingChrome>
  )
}
