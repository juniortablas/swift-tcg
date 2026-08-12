"use client"

import { useEffect, useId, useState } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import { X } from "lucide-react"

import type { ReviewImage } from "@/lib/reviews/types"
import { cn } from "@/lib/utils"

type ReviewGalleryProps = {
  images: ReviewImage[]
  className?: string
}

export default function ReviewGallery({
  images,
  className,
}: ReviewGalleryProps) {
  const [active, setActive] = useState<number | null>(null)
  const titleId = useId()

  useEffect(() => {
    if (active == null) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setActive(null)
      if (event.key === "ArrowRight") {
        setActive((current) =>
          current == null ? 0 : Math.min(images.length - 1, current + 1)
        )
      }
      if (event.key === "ArrowLeft") {
        setActive((current) =>
          current == null ? 0 : Math.max(0, current - 1)
        )
      }
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener("keydown", onKey)
    }
  }, [active, images.length])

  if (images.length === 0) return null

  const lightbox =
    active != null && typeof document !== "undefined"
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
            onClick={() => setActive(null)}
          >
            <button
              type="button"
              aria-label="Close photo"
              className="absolute top-4 right-4 rounded-full bg-white/90 p-2 text-black shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600/40"
              onClick={() => setActive(null)}
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            <p id={titleId} className="sr-only">
              Review photo {active + 1} of {images.length}
            </p>
            <div
              className="relative max-h-[85vh] max-w-[90vw]"
              onClick={(event) => event.stopPropagation()}
            >
              <Image
                src={images[active].url}
                alt={images[active].altText ?? `Review photo ${active + 1}`}
                width={images[active].width ?? 1200}
                height={images[active].height ?? 1200}
                sizes="90vw"
                className="max-h-[85vh] w-auto rounded-xl object-contain"
              />
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <>
      <ul
        className={cn("mt-3 flex flex-wrap gap-2", className)}
        aria-label="Review photos"
      >
        {images.map((image, index) => (
          <li key={image.id}>
            <button
              type="button"
              onClick={() => setActive(index)}
              className="relative size-16 overflow-hidden rounded-lg border border-black/[0.06] bg-black/[0.02] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600/40 sm:size-20"
              aria-label={`Enlarge review photo ${index + 1}`}
            >
              <Image
                src={image.url}
                alt={image.altText ?? `Review photo ${index + 1}`}
                width={80}
                height={80}
                sizes="80px"
                className="size-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>
      {lightbox}
    </>
  )
}
