import { cn } from "@/lib/utils"

type SkeletonProps = {
  className?: string
  /** Soft green-tinted shimmer for brand-forward surfaces. */
  tone?: "neutral" | "brand"
}

/**
 * Lightweight shimmer block. Pure CSS — safe in Server Components.
 * Honors `prefers-reduced-motion` via globals.css.
 */
export function Skeleton({ className, tone = "neutral" }: SkeletonProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-block overflow-hidden rounded-md",
        tone === "brand" ? "bg-green-600/[0.08]" : "bg-black/[0.06]",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-skeleton-shimmer",
        "after:bg-gradient-to-r after:from-transparent after:via-white/55 after:to-transparent",
        className
      )}
    />
  )
}

export function SkeletonText({
  className,
  lines = 1,
}: {
  className?: string
  lines?: number
}) {
  return (
    <span className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={cn(
            "h-3 w-full",
            index === lines - 1 && lines > 1 ? "w-2/3" : "w-full"
          )}
        />
      ))}
    </span>
  )
}
