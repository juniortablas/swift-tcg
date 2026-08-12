import { ProductCardSkeleton } from "@/components/ux/ProductCardSkeleton"
import { Skeleton } from "@/components/ux/Skeleton"

export function ProductPageSkeleton() {
  return (
    <main className="bg-white">
      <div className="mx-auto w-full max-w-[1920px] px-3 pt-3 pb-6 sm:px-6 sm:pt-8 sm:pb-12 lg:px-8 lg:pt-10 lg:pb-14 xl:px-10">
        {/* Breadcrumb */}
        <div className="mb-3 flex items-center gap-2 sm:mb-8">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-32" />
        </div>

        <section className="lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)] lg:items-start lg:gap-10 xl:gap-14">
          {/* Gallery */}
          <div className="min-w-0">
            <Skeleton className="aspect-square w-full rounded-[17px]" />
            <div className="mt-3 flex gap-2">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton
                  key={index}
                  className="size-16 shrink-0 rounded-xl sm:size-20"
                />
              ))}
            </div>
          </div>

          {/* Buy box */}
          <aside className="mt-4 space-y-4 lg:mt-0">
            <Skeleton className="h-5 w-24 rounded-full" tone="brand" />
            <Skeleton className="h-8 w-[92%] sm:h-9" />
            <Skeleton className="h-8 w-[70%] sm:h-9" />
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-12 w-full rounded-full" tone="brand" />
            <Skeleton className="h-12 w-full rounded-full" />
            <div className="space-y-2.5 border-t border-black/[0.06] pt-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Skeleton className="size-4 rounded-full" />
                  <Skeleton className="h-3 w-48" />
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="mt-8 space-y-4 sm:mt-14">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </section>
      </div>

      {/* Recommendations */}
      <div className="border-t border-black/[0.05] px-4 pt-8 pb-10 sm:px-6 sm:pt-12 lg:px-8 xl:px-10">
        <div className="mx-auto max-w-[1920px]">
          <Skeleton className="mb-5 h-7 w-48" />
          <div className="flex gap-2 overflow-hidden sm:gap-4">
            {Array.from({ length: 5 }, (_, index) => (
              <div
                key={index}
                className="w-[calc((100%-0.5rem)/2.2)] shrink-0 sm:w-[260px] lg:w-[calc((100%-4rem)/5)]"
              >
                <ProductCardSkeleton density="rail" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
