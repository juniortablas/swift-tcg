import { ProductCardSkeletonGrid } from "@/components/ux/ProductCardSkeleton"
import { Skeleton } from "@/components/ux/Skeleton"

export function CollectionPageSkeleton() {
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-[1920px] px-4 pt-3 pb-6 sm:px-6 sm:pt-8 sm:pb-12 lg:px-8 lg:pt-10 lg:pb-14 xl:px-10">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[16px] sm:rounded-[24px]">
          <Skeleton
            className="block min-h-[128px] w-full rounded-[16px] sm:min-h-[250px] sm:rounded-[24px] lg:min-h-[280px]"
            tone="brand"
          />
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-end px-3.5 py-4 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
            <Skeleton className="h-8 w-48 bg-white/25 sm:h-10 sm:w-72" />
            <Skeleton className="mt-3 h-3 w-64 max-w-[80%] bg-white/20" />
            <Skeleton className="mt-3 h-3 w-24 bg-white/15" />
          </div>
        </section>

        <div className="mt-4 sm:mt-10">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-black/[0.06] pb-4">
            <Skeleton className="h-10 flex-1 rounded-full sm:max-w-xs" />
            <Skeleton className="h-10 w-28 rounded-full lg:hidden" />
            <Skeleton className="ml-auto h-10 w-36 rounded-full" />
            <Skeleton className="hidden h-10 w-24 rounded-full sm:block" />
          </div>

          <div className="mt-3 lg:mt-8 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[260px_minmax(0,1fr)] xl:gap-10">
            {/* Filters */}
            <aside className="hidden lg:block">
              <div className="space-y-5">
                <Skeleton className="h-5 w-24" />
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="space-y-2.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-9 w-full rounded-lg" />
                    <Skeleton className="h-9 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            </aside>

            {/* Product grid — preserves collection spacing */}
            <div className="min-w-0">
              <ProductCardSkeletonGrid count={8} />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
