import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type ContentCalloutProps = {
  children: ReactNode
  icon?: LucideIcon
  title?: string
  variant?: "note" | "important" | "info"
  className?: string
}

const VARIANT_STYLES = {
  note: "border-black/[0.06] bg-[#fafafa] dark:border-white/10 dark:bg-white/[0.03]",
  important:
    "border-green-600/20 bg-[#f3faf5] dark:border-green-500/25 dark:bg-green-500/[0.06]",
  info: "border-black/[0.06] bg-white dark:border-white/10 dark:bg-white/[0.02]",
} as const

/**
 * Soft callout for policy notes and support guidance.
 */
export default function ContentCallout({
  children,
  icon: Icon,
  title,
  variant = "note",
  className,
}: ContentCalloutProps) {
  return (
    <aside
      className={cn(
        "rounded-2xl border px-4 py-4 sm:px-5 sm:py-5",
        VARIANT_STYLES[variant],
        className
      )}
    >
      <div className="flex gap-3">
        {Icon ? (
          <Icon
            className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          {title ? (
            <p className="text-xs font-semibold tracking-[0.12em] text-black/45 uppercase dark:text-white/45">
              {title}
            </p>
          ) : null}
          <div
            className={cn(
              "text-sm leading-relaxed text-black/65 dark:text-white/65",
              title && "mt-1.5"
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </aside>
  )
}
