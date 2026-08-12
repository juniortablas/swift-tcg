"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const SCROLL_EDGE_PX = 2

export default function CarouselScroller({
  children,
  label,
  gapClassName = "gap-2.5",
  gapPx = 10,
}: {
  children: ReactNode
  label: string
  /** @deprecated Overflow is measured; kept for call-site compatibility. */
  showNext?: boolean
  gapClassName?: string
  /** Pixel gap used when scrolling by one card. */
  gapPx?: number
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    const maxScroll = scrollWidth - clientWidth
    setCanScrollLeft(scrollLeft > SCROLL_EDGE_PX)
    setCanScrollRight(maxScroll > SCROLL_EDGE_PX && scrollLeft < maxScroll - SCROLL_EDGE_PX)
  }, [])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    updateScrollState()

    el.addEventListener("scroll", updateScrollState, { passive: true })
    const ro = new ResizeObserver(() => updateScrollState())
    ro.observe(el)
    for (const child of el.children) {
      if (child instanceof HTMLElement) ro.observe(child)
    }

    return () => {
      el.removeEventListener("scroll", updateScrollState)
      ro.disconnect()
    }
  }, [updateScrollState, children])

  function scrollByCard(direction: 1 | -1) {
    const el = scrollerRef.current
    if (!el) return
    const card = el.querySelector<HTMLElement>("[data-carousel-item]")
    const amount = card ? card.offsetWidth + gapPx : el.clientWidth * 0.8
    el.scrollBy({ left: amount * direction, behavior: "smooth" })
  }

  const arrowClassName =
    "absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 rounded-full border-[#ECECEC] bg-white shadow-[0_8px_24px_-12px_rgba(0,0,0,0.2)] transition-transform duration-200 hover:scale-[1.03] hover:bg-white lg:inline-flex"

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        className={cn(
          "flex overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden",
          gapClassName
        )}
      >
        {children}
      </div>

      {canScrollLeft ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Scroll ${label} left`}
          onClick={() => scrollByCard(-1)}
          className={cn(arrowClassName, "left-0 -translate-x-1/2")}
        >
          <ChevronLeft className="size-5" />
        </Button>
      ) : null}

      {canScrollRight ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Scroll ${label} right`}
          onClick={() => scrollByCard(1)}
          className={cn(arrowClassName, "right-0 translate-x-1/2")}
        >
          <ChevronRight className="size-5" />
        </Button>
      ) : null}
    </div>
  )
}
