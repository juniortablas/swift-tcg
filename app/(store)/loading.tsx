import LoadingChrome from "@/components/ux/LoadingChrome"
import { HomePageSkeleton } from "@/components/ux/skeletons/HomePageSkeleton"

export default function HomeLoading() {
  return (
    <LoadingChrome label="Loading homepage">
      <HomePageSkeleton />
    </LoadingChrome>
  )
}
