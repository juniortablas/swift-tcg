import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export type FeatureCardItem = {
  icon: LucideIcon
  title: string
  description: string
}

type FeatureCardsProps = {
  items: ReadonlyArray<FeatureCardItem>
  className?: string
  columns?: 2 | 3
}

/**
 * Icon + title + short copy cards for informational pages.
 */
export default function FeatureCards({
  items,
  className,
  columns = 2,
}: FeatureCardsProps) {
  return (
    <ul
      className={cn(
        "grid gap-3 sm:gap-4",
        columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2",
        className
      )}
    >
      {items.map(({ icon: Icon, title, description }) => (
        <li
          key={title}
          className="rounded-2xl border border-black/[0.06] bg-[#fafafa] p-5 sm:p-6 dark:border-white/10 dark:bg-white/[0.03]"
        >
          <Icon
            className="size-5 text-indigo-600 dark:text-indigo-400"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <h3 className="mt-3.5 text-[15px] font-semibold tracking-tight text-black dark:text-white">
            {title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-black/55 dark:text-white/55">
            {description}
          </p>
        </li>
      ))}
    </ul>
  )
}
