"use client"

import Link from "next/link"

import BrandLogo from "@/components/brand/BrandLogo"
import { ErrorIllustration } from "@/components/ux/EmptyIllustrations"
import { Button } from "@/components/ui/button"

const SUPPORT_MAILTO = "mailto:support@swifttcg.com"

type ErrorRecoveryProps = {
  title?: string
  description?: string
  onRetry?: () => void
  showHome?: boolean
  showSupport?: boolean
  /** Optional secondary action (e.g. Sign in). */
  secondaryHref?: string
  secondaryLabel?: string
  /** When true, render a full-viewport branded shell (global-error). */
  fullPage?: boolean
}

/**
 * Friendly recovery UI — never exposes stack traces or raw error messages.
 */
export default function ErrorRecovery({
  title = "Something went wrong",
  description = "We hit an unexpected snag loading this page. You can try again, or head back to the storefront.",
  onRetry,
  showHome = true,
  showSupport = true,
  secondaryHref,
  secondaryLabel,
  fullPage = false,
}: ErrorRecoveryProps) {
  const content = (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center px-6 py-16 text-center animate-ux-fade">
      <ErrorIllustration />
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-black sm:text-3xl">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-black/55 sm:text-[15px]">
        {description}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {onRetry ? (
          <Button
            type="button"
            onClick={onRetry}
            className="h-11 rounded-full bg-indigo-600 px-6 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Try again
          </Button>
        ) : null}
        {secondaryHref && secondaryLabel ? (
          <Button
            variant="outline"
            className="h-11 rounded-full px-6"
            render={<Link href={secondaryHref} />}
          >
            {secondaryLabel}
          </Button>
        ) : null}
        {showHome ? (
          <Button
            variant="outline"
            className="h-11 rounded-full px-6"
            render={<Link href="/" />}
          >
            Back to Home
          </Button>
        ) : null}
        {showSupport ? (
          <Button
            variant="ghost"
            className="h-11 rounded-full px-6"
            render={<a href={SUPPORT_MAILTO} />}
          >
            Contact Support
          </Button>
        ) : null}
      </div>
    </div>
  )

  if (!fullPage) return content

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-white text-black">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,#DCFCE7_0%,transparent_55%)]"
      />
      <header className="relative z-10 flex justify-center pt-10">
        <Link href="/" aria-label="Swift TCG home">
          <BrandLogo height={48} priority />
        </Link>
      </header>
      <div className="relative z-10 flex flex-1 items-center justify-center">
        {content}
      </div>
    </div>
  )
}
