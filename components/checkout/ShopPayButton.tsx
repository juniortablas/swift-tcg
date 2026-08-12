"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"

import {
  trackShopPayButtonViewed,
  trackShopPayCheckoutStarted,
  trackShopPayClicked,
  type ShopPayPlacement,
} from "@/lib/checkout/analytics"
import { loadShopPayScript } from "@/lib/shopify/shopPay"
import { cn } from "@/lib/utils"

type ShopPayButtonProps = {
  storeUrl: string
  /** Official `variants` attribute (`id` or `id:qty`, comma-separated). */
  variants: string
  placement: ShopPayPlacement
  /** CSS length for `--shop-pay-button-height`. */
  height?: string
  /** CSS length for `--shop-pay-button-border-radius`. */
  borderRadius?: string
  showDivider?: boolean
  className?: string
}

/**
 * Official Shopify Buy with Shop Pay web component.
 * Do not restyle colors, logo, or label — width/height/radius only.
 */
export default function ShopPayButton({
  storeUrl,
  variants,
  placement,
  height = "52px",
  borderRadius = "999px",
  showDivider = false,
  className,
}: ShopPayButtonProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const lastClickAt = useRef(0)
  const shopPayOff = useRef(false)
  const [ready, setReady] = useState(false)
  const [available, setAvailable] = useState(true)

  useEffect(() => {
    let cancelled = false
    loadShopPayScript()
      .then(() => {
        if (!cancelled) setReady(true)
      })
      .catch(() => {
        shopPayOff.current = true
        if (!cancelled) setAvailable(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (ready && !shopPayOff.current) setAvailable(true)
  }, [ready, variants])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !ready) return

    let timeout: number | undefined
    const observer = new MutationObserver(() => {
      window.clearTimeout(timeout)
      timeout = window.setTimeout(() => {
        if (!host.querySelector("shop-pay-button")) {
          shopPayOff.current = true
          setAvailable(false)
        }
      }, 400)
    })
    observer.observe(host, { childList: true, subtree: true })
    return () => {
      window.clearTimeout(timeout)
      observer.disconnect()
    }
  }, [ready, variants])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !ready || !available) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        trackShopPayButtonViewed(placement)
        observer.disconnect()
      },
      { threshold: 0.4 }
    )
    observer.observe(host)
    return () => observer.disconnect()
  }, [ready, available, placement])

  if (!storeUrl || !variants || !available) return null

  function handleClickCapture() {
    const now = Date.now()
    if (now - lastClickAt.current < 500) return
    lastClickAt.current = now
    trackShopPayClicked(placement)
    trackShopPayCheckoutStarted(placement)
  }

  return (
    <div className={cn("w-full", className)} role="group" aria-label="Shop Pay">
      {showDivider && ready ? (
        <div
          className="mt-3 mb-3 flex items-center gap-3"
          aria-hidden="true"
        >
          <span className="h-px flex-1 bg-black/[0.08]" />
          <span className="text-[11px] font-medium tracking-[0.12em] text-black/35 uppercase">
            or
          </span>
          <span className="h-px flex-1 bg-black/[0.08]" />
        </div>
      ) : null}

      <div
        key={variants}
        ref={hostRef}
        className="shop-pay-button-host w-full min-h-10 [&_shop-pay-button]:block [&_shop-pay-button]:w-full"
        style={
          {
            "--shop-pay-button-width": "100%",
            "--shop-pay-button-height": height,
            "--shop-pay-button-border-radius": borderRadius,
          } as CSSProperties
        }
        onClickCapture={handleClickCapture}
      >
        {ready ? (
          <shop-pay-button
            store-url={storeUrl}
            variants={variants}
            channel="headless"
          />
        ) : null}
      </div>
    </div>
  )
}
