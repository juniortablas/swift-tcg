"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, Search, User, X } from "lucide-react"

import BrandLogo from "@/components/brand/BrandLogo"
import CartButton from "@/components/cart/CartButton"
import CartDrawer from "@/components/cart/CartDrawer"
import SearchDialog from "@/components/search/SearchDialog"
import { Button } from "@/components/ui/button"
import { getCustomerLoginHref } from "@/lib/account/customerLogin"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Pokémon", href: "/pokemon" },
  { label: "One Piece", href: "/one-piece" },
  { label: "Preorders", href: "/preorders" },
  { label: "New Releases", href: "/new-releases", badge: "NEW" },
  { label: "About", href: "/pages/about" },
] as const

type NavbarProps = {
  /** Shopify New Customer Accounts session present. */
  isLoggedIn?: boolean
}

export default function Navbar({ isLoggedIn = false }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const accountHref = isLoggedIn ? "/account" : getCustomerLoginHref("/account")
  const accountLabel = isLoggedIn ? "Account" : "Login"

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white">
        <div className="relative mx-auto flex h-12 w-full max-w-[1920px] items-center justify-between px-3 sm:h-20 sm:px-6 lg:px-8 xl:px-10">
          <Link
            href="/"
            className="relative z-10 flex shrink-0 items-center"
            aria-label="Swift TCG home"
          >
            <BrandLogo height={36} priority />
          </Link>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 lg:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-black/75 transition-colors hover:text-black"
              >
                {link.label}
                {"badge" in link && link.badge ? (
                  <span className="rounded-full bg-green-600 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white uppercase">
                    {link.badge}
                  </span>
                ) : null}
              </a>
            ))}
          </nav>

          <div className="relative z-10 flex items-center gap-0.5 sm:gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search"
              aria-keyshortcuts="Meta+K Control+K"
              className="size-11 text-black/70 hover:text-black sm:size-8"
              onClick={() => setSearchOpen(true)}
            >
              <Search />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              aria-label={accountLabel}
              className="size-11 text-black/70 hover:text-black sm:size-8 md:hidden"
              render={<Link href={accountHref} />}
            >
              <User />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hidden h-8 px-2.5 text-sm font-medium text-black/70 hover:text-black md:inline-flex"
              render={<Link href={accountHref} />}
            >
              {accountLabel}
            </Button>

            <CartButton className="hidden md:inline-flex" />
            <CartButton iconOnly className="size-11 sm:size-8 md:hidden" />

            <Button
              variant="ghost"
              size="icon"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className="size-11 text-black/70 hover:text-black sm:size-8 lg:hidden"
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "border-t border-black/[0.06] bg-white lg:hidden",
            mobileOpen ? "block" : "hidden"
          )}
        >
          <nav className="mx-auto flex max-w-[1920px] flex-col gap-0.5 px-4 py-3 sm:px-6 sm:py-4 lg:px-8 xl:px-10">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-3 text-[15px] font-medium text-black/80 transition-colors hover:bg-black/5 hover:text-black"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
                {"badge" in link && link.badge ? (
                  <span className="rounded-full bg-green-600 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white uppercase">
                    {link.badge}
                  </span>
                ) : null}
              </a>
            ))}

            <Link
              href={accountHref}
              className="mt-1 inline-flex min-h-11 items-center rounded-lg px-3 py-3 text-[15px] font-medium text-black/80 transition-colors hover:bg-black/5 hover:text-black"
              onClick={() => setMobileOpen(false)}
            >
              {accountLabel}
            </Link>

            <CartButton
              className="mt-2 h-11 w-full justify-center"
              onOpen={() => setMobileOpen(false)}
            />
          </nav>
        </div>
      </header>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <CartDrawer />
    </>
  )
}
