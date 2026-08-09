import type { ReactNode } from "react"

type ContentShellProps = {
  children: ReactNode
}

/**
 * Shared max-width / padding for informational content pages.
 */
export default function ContentShell({ children }: ContentShellProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 xl:px-10">
      {children}
    </div>
  )
}
