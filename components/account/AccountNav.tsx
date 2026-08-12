import Link from "next/link"

import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/account", label: "Dashboard", match: "exact" as const },
  { href: "/account/orders", label: "Orders", match: "prefix" as const },
  { href: "/account/wishlist", label: "Wishlist", match: "exact" as const },
  {
    href: "/account/notifications",
    label: "Notifications",
    match: "exact" as const,
  },
  { href: "/account/reviews", label: "Reviews", match: "exact" as const },
  { href: "/account/addresses", label: "Addresses", match: "exact" as const },
  { href: "/account/profile", label: "Profile", match: "exact" as const },
] as const

type AccountNavProps = {
  pathname: string
}

function isActive(pathname: string, href: string, match: "exact" | "prefix") {
  if (match === "exact") return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function AccountNav({ pathname }: AccountNavProps) {
  return (
    <nav
      aria-label="Account"
      className="flex gap-1 overflow-x-auto border-b border-black/[0.06] pb-px sm:flex-col sm:gap-0.5 sm:overflow-visible sm:border-b-0 sm:border-r sm:pr-6"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href, item.match)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors sm:min-h-10",
              active
                ? "bg-black/[0.04] text-black"
                : "text-black/55 hover:bg-black/[0.03] hover:text-black"
            )}
          >
            {item.label}
          </Link>
        )
      })}
      {/* Plain <a>: Next.js <Link> prefetches /account/logout and would clear the session. */}
      <a
        href="/account/logout"
        className="shrink-0 rounded-lg px-3 py-2.5 text-sm font-medium text-black/55 transition-colors hover:bg-black/[0.03] hover:text-black sm:mt-3 sm:min-h-10"
      >
        Logout
      </a>
    </nav>
  )
}
