"use client"

import Image from "next/image"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react"

import { cn } from "@/lib/utils"

type ProductGalleryProps = {
  images: string[]
  title: string
}

export default function ProductGallery({ images, title }: ProductGalleryProps) {
  const sources = images.length > 0 ? images : []
  const [active, setActive] = useState(0)
  const [fading, setFading] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const [origin, setOrigin] = useState("50% 50%")
  const touchStartX = useRef<number | null>(null)
  const didSwipe = useRef(false)

  const count = sources.length
  const current = sources[active] ?? sources[0]

  const goTo = useCallback(
    (index: number) => {
      if (count === 0) return
      const next = (index + count) % count
      if (next === active) return
      setFading(true)
      window.setTimeout(() => {
        setActive(next)
        setFading(false)
        setZoomed(false)
      }, 150)
    },
    [active, count]
  )

  useEffect(() => {
    if (!lightbox) return

    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setLightbox(false)
      if (event.key === "ArrowRight") goTo(active + 1)
      if (event.key === "ArrowLeft") goTo(active - 1)
    }

    window.addEventListener("keydown", onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [lightbox, active, goTo])

  function onMainMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!zoomed) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    setOrigin(`${x}% ${y}%`)
  }

  function onTouchStart(event: ReactPointerEvent<HTMLDivElement>) {
    touchStartX.current = event.clientX
    didSwipe.current = false
  }

  function onTouchEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (touchStartX.current == null || count < 2) return
    const delta = event.clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < 48) return
    didSwipe.current = true
    goTo(delta < 0 ? active + 1 : active - 1)
  }

  function openLightbox() {
    if (didSwipe.current) {
      didSwipe.current = false
      return
    }
    setLightbox(true)
  }

  function onThumbKey(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      goTo(index)
    }
  }

  if (!current) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-[17px] bg-white text-sm text-black/40">
        No image available
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
        {count > 1 ? (
          <div
            className="order-2 flex gap-2 overflow-x-auto pb-1 lg:order-1 lg:max-h-[min(72vh,640px)] lg:flex-col lg:overflow-y-auto lg:overflow-x-visible lg:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Product images"
          >
            {sources.map((src, index) => (
              <button
                key={`${src}-${index}`}
                type="button"
                role="tab"
                aria-selected={index === active}
                aria-label={`View image ${index + 1}`}
                onClick={() => goTo(index)}
                onKeyDown={(event) => onThumbKey(event, index)}
                className={cn(
                "relative size-[3.75rem] shrink-0 overflow-hidden rounded-xl border bg-white transition-all duration-200 sm:size-[4.5rem]",
                  index === active
                    ? "border-green-600 shadow-[0_0_0_1px_rgba(22,163,74,0.35)]"
                    : "border-black/8 hover:border-black/20"
                )}
              >
                <Image
                  src={src}
                  alt=""
                  width={96}
                  height={96}
                  loading="lazy"
                  sizes="72px"
                  className="size-full scale-[1.06] object-contain p-1"
                />
              </button>
            ))}
          </div>
        ) : null}

        <div className="order-1 min-w-0 flex-1 lg:order-2">
          <div
            role="button"
            tabIndex={0}
            aria-label={`View larger image of ${title}`}
            className="group relative flex h-[min(36vh,300px)] w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-[12px] bg-white outline-none focus-visible:ring-2 focus-visible:ring-green-600/40 sm:h-[min(52vh,460px)] sm:rounded-[17px]"
            onClick={openLightbox}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                openLightbox()
              }
            }}
            onPointerEnter={() => setZoomed(true)}
            onPointerLeave={() => setZoomed(false)}
            onPointerMove={onMainMove}
            onPointerDown={onTouchStart}
            onPointerUp={onTouchEnd}
          >
            <Image
              src={current}
              alt={title}
              width={900}
              height={1080}
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              className={cn(
                "h-full w-full object-contain p-3 transition-[opacity,transform] duration-300 ease-out sm:p-6",
                fading ? "opacity-0" : "opacity-100",
                zoomed ? "scale-[1.18]" : "group-hover:scale-[1.04]"
              )}
              style={zoomed ? { transformOrigin: origin } : undefined}
            />

            <span className="pointer-events-none absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-medium text-black/55 opacity-0 shadow-sm backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
              <ZoomIn className="size-3.5" aria-hidden="true" />
              Click to enlarge
            </span>
          </div>
        </div>
      </div>

      {lightbox ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} image gallery`}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 sm:p-8"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            aria-label="Close gallery"
            className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            onClick={() => setLightbox(false)}
          >
            <X className="size-5" />
          </button>

          {count > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous image"
                className="absolute top-1/2 left-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-6"
                onClick={(event) => {
                  event.stopPropagation()
                  goTo(active - 1)
                }}
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Next image"
                className="absolute top-1/2 right-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-6"
                onClick={(event) => {
                  event.stopPropagation()
                  goTo(active + 1)
                }}
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          ) : null}

          <div
            className="relative max-h-[85vh] w-full max-w-4xl"
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={current}
              alt={title}
              width={1200}
              height={1400}
              sizes="90vw"
              className="mx-auto max-h-[85vh] w-auto object-contain"
            />
            {count > 1 ? (
              <p className="mt-4 text-center text-sm text-white/60">
                {active + 1} / {count}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
