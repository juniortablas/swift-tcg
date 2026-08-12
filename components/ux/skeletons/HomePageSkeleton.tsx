import { ProductCardSkeleton } from "@/components/ux/ProductCardSkeleton"
import { Skeleton } from "@/components/ux/Skeleton"

export function HomePageSkeleton() {
  return (
    <div className="bg-white pb-12">
      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div className="mx-auto grid max-w-[1920px] lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="flex flex-col justify-center gap-4 px-4 py-8 sm:px-6 sm:py-12 lg:px-8 xl:px-10">
            <Skeleton className="h-3 w-28" tone="brand" />
            <Skeleton className="h-10 w-[90%] max-w-md sm:h-12" />
            <Skeleton className="h-10 w-[70%] max-w-sm sm:h-12" />
            <Skeleton className="mt-1 h-4 w-full max-w-md" />
            <div className="mt-2 flex gap-3">
              <Skeleton className="h-11 w-36 rounded-full" tone="brand" />
              <Skeleton className="h-11 w-28 rounded-full" />
            </div>
          </div>
          <Skeleton className="aspect-[16/10] w-full rounded-none sm:aspect-[21/9] lg:min-h-[280px] lg:aspect-auto" />
        </div>
      </section>

      <div className="mx-auto mt-6 flex max-w-[1920px] flex-col gap-10 px-4 sm:mt-12 sm:gap-12 sm:px-6 lg:px-8 xl:px-10">
        <RailSkeleton titleWidth="w-40" />
        <CategorySkeleton />
        <RailSkeleton titleWidth="w-48" />
      </div>
    </div>
  )
}

function RailSkeleton({ titleWidth }: { titleWidth: string }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between sm:mb-6">
        <Skeleton className={`h-7 ${titleWidth}`} />
        <Skeleton className="h-4 w-20" />
      </div>
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
    </section>
  )
}

function CategorySkeleton() {
  return (
    <section>
      <Skeleton className="mb-4 h-7 w-44 sm:mb-6" />
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton
            key={index}
            className="aspect-[4/3] w-full rounded-[16px] sm:rounded-[20px]"
          />
        ))}
      </div>
    </section>
  )
}
