import type { ReactNode } from "react"

import AnnouncementBar from "@/components/layout/AnnouncementBar"
import Footer from "@/components/layout/Footer"
import Navbar from "@/components/layout/Navbar"
import { CartProvider } from "@/lib/cart/CartProvider"
import { BackInStockProvider } from "@/lib/back-in-stock/BackInStockProvider"
import { WishlistProvider } from "@/lib/wishlist/WishlistProvider"
import { getShopContentSettings } from "@/lib/shopify/content"
import { isCustomerLoggedIn } from "@/lib/shopify/customerAccount"

export default async function StoreChrome({
  children,
}: {
  children: ReactNode
}) {
  const [shop, loggedIn] = await Promise.all([
    getShopContentSettings(),
    isCustomerLoggedIn().catch(() => false),
  ])

  return (
    <CartProvider customerLoggedIn={loggedIn}>
      <WishlistProvider customerLoggedIn={loggedIn}>
        <BackInStockProvider customerLoggedIn={loggedIn}>
          <AnnouncementBar />
          <Navbar isLoggedIn={loggedIn} />
          {children}
          <Footer socialLinks={shop.contact.social} />
        </BackInStockProvider>
      </WishlistProvider>
    </CartProvider>
  )
}
