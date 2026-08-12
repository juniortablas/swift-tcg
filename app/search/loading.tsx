import LoadingChrome from "@/components/ux/LoadingChrome"
import { SearchPageSkeleton } from "@/components/ux/skeletons/SearchPageSkeleton"

export default function SearchLoading() {
  return (
    <LoadingChrome label="Loading search results">
      <SearchPageSkeleton />
    </LoadingChrome>
  )
}
