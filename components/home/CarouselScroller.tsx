"use client"

import { useRef, type ReactNode } from "react"
import { ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function CarouselScroller({
  children,
  label,
  showNext = true,
  gapClassName = "gap-2.5",
  gapPx = 10,
}: {
  children: ReactNode
  label: string
  showNext?: boolean
  gapClassName?: string
  /** Pixel gap used when scrolling by one card. */
  gapPx?: number
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)

  function scrollNext() {
    const el = scrollerRef.current
    if (!el) return
    const card = el.querySelector<HTMLElement>("[data-carousel-item]")
    const amount = card ? card.offsetWidth + gapPx : el.clientWidth * 0.8
    el.scrollBy({ left: amount, behavior: "smooth" })
  }

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

      {showNext ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Scroll ${label}`}
          onClick={scrollNext}
          className="absolute top-1/2 right-0 z-10 hidden size-11 -translate-y-1/2 translate-x-1/2 rounded-full border-[#ECECEC] bg-white shadow-[0_8px_24px_-12px_rgba(0,0,0,0.2)] transition-transform duration-200 hover:scale-[1.03] hover:bg-white lg:inline-flex"
        >
          <ChevronRight className="size-5" />
        </Button>
      ) : null}
    </div>
  )
}
