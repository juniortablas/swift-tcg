import Link from "next/link"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type EmptyStateAction = {
  label: string
  href: string
  variant?: "primary" | "secondary"
}

type EmptyStateProps = {
  illustration: ReactNode
  title: string
  description: string
  actions?: EmptyStateAction[]
  className?: string
  compact?: boolean
}

/**
 * Shared empty-state shell: illustration, helpful copy, and CTAs.
 */
export default function EmptyState({
  illustration,
  title,
  description,
  actions = [],
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center animate-ux-fade",
        compact
          ? "rounded-[16px] border border-dashed border-black/[0.1] bg-white px-5 py-10"
          : "rounded-[20px] border border-dashed border-black/[0.1] bg-neutral-50/70 px-6 py-12 sm:py-16",
        className
      )}
      role="status"
    >
      <div className="mb-4 sm:mb-5">{illustration}</div>
      <h2 className="text-base font-semibold tracking-tight text-black sm:text-lg">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-black/55">
        {description}
      </p>
      {actions.length > 0 ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actions.map((action) => {
            const primary = action.variant !== "secondary"
            return (
              <Link
                key={`${action.href}:${action.label}`}
                href={action.href}
                className={cn(
                  "inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600/40 focus-visible:ring-offset-2",
                  primary
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "border border-black/[0.1] bg-white text-black/80 hover:bg-black/[0.03]"
                )}
              >
                {action.label}
              </Link>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
