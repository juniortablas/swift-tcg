import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type ContentPageHeaderProps = {
  title: string
  description?: string
  children?: ReactNode
  className?: string
}

/**
 * Shared page title + optional lead for informational pages.
 */
export default function ContentPageHeader({
  title,
  description,
  children,
  className,
}: ContentPageHeaderProps) {
  return (
    <header className={cn("max-w-2xl", className)}>
      <h1 className="text-3xl font-semibold tracking-tight text-black sm:text-4xl dark:text-white">
        {title}
      </h1>
      {description ? (
        <p className="mt-4 text-[15px] leading-relaxed text-black/55 sm:mt-5 dark:text-white/55">
          {description}
        </p>
      ) : null}
      {children}
    </header>
  )
}
