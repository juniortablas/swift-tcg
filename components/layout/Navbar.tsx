"use client"

import { useState } from "react"
import { Menu, Search, X } from "lucide-react"

import CartButton from "@/components/cart/CartButton"
import CartDrawer from "@/components/cart/CartDrawer"
import SearchDialog from "@/components/search/SearchDialog"
import { Button } from "@/components/ui/button"
import { CartProvider } from "@/lib/cart/CartProvider"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { label: "Pokemon", href: "#pokemon" },
  { label: "One Piece", href: "#one-piece" },
  { label: "Preorders", href: "#preorders" },
  { label: "About", href: "#about" },
] as const

function NavbarContent() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-black/10 bg-white/80 backdrop-blur-md">
        <div className="relative mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-6">
          <a
            href="/"
            className="relative z-10 shrink-0 text-xl font-bold tracking-tight text-black"
          >
            Swift&nbsp;TCG
          </a>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-black/70 transition-colors hover:text-black"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="relative z-10 flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search"
              aria-keyshortcuts="Meta+K Control+K"
              className="text-black/70 hover:text-black"
              onClick={() => setSearchOpen(true)}
            >
              <Search />
            </Button>

            <CartButton className="hidden md:inline-flex" />
            <CartButton iconOnly className="md:hidden" />

            <Button
              variant="ghost"
              size="icon"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className="text-black/70 hover:text-black md:hidden"
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "border-t border-black/10 bg-white/95 backdrop-blur-md md:hidden",
            mobileOpen ? "block" : "hidden"
          )}
        >
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-black/80 transition-colors hover:bg-black/5 hover:text-black"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}

            <CartButton
              className="mt-3 w-full justify-center"
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

export default function Navbar() {
  return (
    <CartProvider>
      <NavbarContent />
    </CartProvider>
  )
}
