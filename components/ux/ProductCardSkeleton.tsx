import { Skeleton } from "@/components/ux/Skeleton"
import { cn } from "@/lib/utils"

type ProductCardSkeletonProps = {
  variant?: "featured" | "compact"
  density?: "default" | "rail"
  className?: string
}

/** Matches ProductCard aspect + spacing to prevent layout shift. */
export function ProductCardSkeleton({
  variant = "featured",
  density = "default",
  className,
}: ProductCardSkeletonProps) {
  const compact = variant === "compact"
  const rail = density === "rail" && !compact

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-[12px] border border-black/[0.06] bg-white sm:rounded-[17px]",
        className
      )}
    >
      <Skeleton
        className={cn(
          "block w-full rounded-none",
          compact
            ? "aspect-[7/8]"
            : rail
              ? "aspect-[4/5] sm:aspect-[7/8]"
              : "aspect-square sm:aspect-[7/8]"
        )}
      />
      <div
        className={cn(
          "flex flex-1 flex-col gap-2",
          compact ? "px-2.5 pt-2 pb-2.5" : "px-3 pt-2.5 pb-3 sm:px-4 sm:pt-3 sm:pb-4"
        )}
      >
        <Skeleton className="h-3 w-[88%]" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="mt-1 h-3.5 w-1/3" />
      </div>
    </div>
  )
}

export function ProductCardSkeletonGrid({
  count = 8,
  variant = "featured",
  className,
}: {
  count?: number
  variant?: "featured" | "compact"
  className?: string
}) {
  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4",
        className
      )}
    >
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="min-w-0">
          <ProductCardSkeleton variant={variant} />
        </li>
      ))}
    </ul>
  )
}
