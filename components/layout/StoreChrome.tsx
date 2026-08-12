import type { ReactNode } from "react"

import AnnouncementBar from "@/components/layout/AnnouncementBar"
import Footer from "@/components/layout/Footer"
import Navbar from "@/components/layout/Navbar"
import AccountAuthErrorBanner from "@/components/ux/AccountAuthErrorBanner"
import OfflineBanner from "@/components/ux/OfflineBanner"
import { CustomerSessionProvider } from "@/lib/account/CustomerSessionProvider"
import { CartProvider } from "@/lib/cart/CartProvider"
import { BackInStockProvider } from "@/lib/back-in-stock/BackInStockProvider"
import { WishlistProvider } from "@/lib/wishlist/WishlistProvider"
import { getShopChromeSettings } from "@/lib/shopify/content"
import { getShopPayStoreUrl } from "@/lib/shopify/shopPay"

/**
 * Store layout chrome — no customer cookie reads.
 * Auth hydrates client-side via CustomerSessionProvider so HTML stays cacheable.
 */
export default async function StoreChrome({
  children,
}: {
  children: ReactNode
}) {
  const shop = await getShopChromeSettings()
  const shopPayStoreUrl = getShopPayStoreUrl()

  return (
    <CustomerSessionProvider>
      <CartProvider>
        <WishlistProvider>
          <BackInStockProvider>
            <AnnouncementBar />
            <AccountAuthErrorBanner />
            <Navbar shopPayStoreUrl={shopPayStoreUrl} />
            {children}
            <Footer socialLinks={shop.contact.social} />
            <OfflineBanner />
          </BackInStockProvider>
        </WishlistProvider>
      </CartProvider>
    </CustomerSessionProvider>
  )
}
