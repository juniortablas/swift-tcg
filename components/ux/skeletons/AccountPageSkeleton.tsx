import { Skeleton } from "@/components/ux/Skeleton"

export function AccountPageSkeleton() {
  return (
    <div className="relative isolate">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_top,_rgba(22,163,74,0.07),_transparent_60%)]"
      />
      <div className="relative mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 xl:px-10">
        <Skeleton className="h-3 w-36" tone="brand" />
        <Skeleton className="mt-3 h-9 w-48 sm:h-10" />
        <Skeleton className="mt-3 h-4 w-72 max-w-full" />

        <div className="mt-8 grid gap-8 sm:mt-10 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-10">
          <aside className="hidden space-y-2 lg:block">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-9 w-full rounded-lg" />
            ))}
          </aside>
          <div className="min-w-0 space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-[17px] border border-black/[0.06]"
                >
                  <Skeleton className="aspect-[7/8] w-full rounded-none" />
                  <div className="space-y-2 p-3">
                    <Skeleton className="h-3 w-[85%]" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
