import type { ReactNode } from "react"

import AccountNav from "@/components/account/AccountNav"

type AccountShellProps = {
  title: string
  description?: string
  pathname: string
  children: ReactNode
}

/**
 * Shared chrome for the Swift TCG account area.
 */
export default function AccountShell({
  title,
  description,
  pathname,
  children,
}: AccountShellProps) {
  return (
    <div className="relative isolate">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_top,_rgba(22,163,74,0.07),_transparent_60%)]"
      />
      <div className="relative mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 xl:px-10">
        <header className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.16em] text-indigo-700 uppercase">
            Swift TCG Account
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-black sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 text-[15px] leading-relaxed text-black/55">
              {description}
            </p>
          ) : null}
        </header>

        <div className="mt-8 grid gap-8 sm:mt-10 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-10">
          <AccountNav pathname={pathname} />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  )
}
