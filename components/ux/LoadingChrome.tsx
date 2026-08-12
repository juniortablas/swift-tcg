import Link from "next/link"

import BrandLogo from "@/components/brand/BrandLogo"

/**
 * Lightweight store header for route `loading.tsx` fallbacks.
 * Avoids StoreChrome providers / Shopify fetches so loading stays instant.
 */
export default function LoadingChrome({
  children,
  label = "Loading page",
}: {
  children: React.ReactNode
  label?: string
}) {
  return (
    <div
      className="flex min-h-dvh flex-col bg-white"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white">
        <div className="mx-auto flex h-12 w-full max-w-[1920px] items-center px-3 sm:h-20 sm:px-6 lg:px-8 xl:px-10">
          <Link
            href="/"
            className="flex shrink-0 items-center"
            aria-label="Swift TCG home"
          >
            <BrandLogo height={36} priority />
          </Link>
        </div>
      </header>
      <div className="animate-ux-fade flex-1">{children}</div>
    </div>
  )
}
