"use client"

import { cn } from "@/lib/utils"
import { ErrorIllustration } from "@/components/ux/EmptyIllustrations"

type ApiErrorStateProps = {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
  compact?: boolean
}

/**
 * Client-side failed-request recovery — never a white screen.
 */
export default function ApiErrorState({
  title = "We couldn't load this",
  description = "Check your connection and try again. Your cart and account data are safe.",
  onRetry,
  className,
  compact = false,
}: ApiErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center text-center animate-ux-fade",
        compact
          ? "rounded-[16px] border border-dashed border-black/[0.1] bg-white px-5 py-8"
          : "rounded-[20px] border border-dashed border-black/[0.1] bg-neutral-50/70 px-6 py-12",
        className
      )}
    >
      <ErrorIllustration className={compact ? "h-20" : undefined} />
      <h2 className="mt-3 text-base font-semibold tracking-tight text-black">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-black/55">
        {description}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-green-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600/40 focus-visible:ring-offset-2"
        >
          Try again
        </button>
      ) : null}
    </div>
  )
}
