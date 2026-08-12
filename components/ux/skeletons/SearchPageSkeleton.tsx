import { ProductCardSkeletonGrid } from "@/components/ux/ProductCardSkeleton"
import { Skeleton } from "@/components/ux/Skeleton"

export function SearchPageSkeleton() {
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-[1920px] px-4 pt-6 pb-10 sm:px-6 sm:pt-10 sm:pb-14 lg:px-8 xl:px-10">
        <Skeleton className="h-8 w-56 sm:h-9 sm:w-72" />
        <Skeleton className="mt-3 h-4 w-40" />
        <div className="mt-8">
          <ProductCardSkeletonGrid count={10} variant="compact" className="xl:grid-cols-5" />
        </div>
      </div>
    </main>
  )
}
