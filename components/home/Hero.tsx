"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { HomepageHeroSlide } from "@/lib/shopify/storefrontCms"

type HeroProps = {
  slides: HomepageHeroSlide[]
}

const AUTO_MS = 6000

/**
 * Soft left→right readability fade — solid white through the copy column,
 * then dissolves into the cinematic scene (premium banner blend).
 */
const HERO_FADE =
  "linear-gradient(90deg, #fff 0%, #fff 28%, rgba(255,255,255,.92) 42%, rgba(255,255,255,.55) 58%, rgba(255,255,255,.18) 74%, rgba(255,255,255,0) 100%)"

function HeadingLines({ heading }: { heading: string }) {
  const lines = heading.split("\n").map((line) => line.trim()).filter(Boolean)

  if (lines.length === 0) return null

  return (
    <>
      {lines.map((line, index) => (
        <span key={`${index}-${line}`}>
          {index > 0 ? <br /> : null}
          {index === lines.length - 1 && lines.length > 1 ? (
            <span className="text-green-600">{line}</span>
          ) : (
            line
          )}
        </span>
      ))}
    </>
  )
}

/**
 * Homepage hero — low-profile cinematic banner + overlaid copy.
 *
 * Desktop / tablet: short fixed-height banner (≈240–300px). Art fills with
 * object-cover and may crop horizontally. Copy is vertically centered;
 * pagination sits on the bottom edge.
 *
 * Mobile: unchanged stacked layout (art slot above copy).
 */
export default function Hero({ slides }: HeroProps) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const slideCount = slides.length

  useEffect(() => {
    if (paused || slideCount === 0) return

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slideCount)
    }, AUTO_MS)

    return () => window.clearInterval(timer)
  }, [paused, index, slideCount])

  if (slideCount === 0) return null

  function goTo(next: number) {
    setIndex((next + slideCount) % slideCount)
  }

  const active = slides[index]

  return (
    <section
      className="relative overflow-hidden bg-white sm:h-[240px] lg:h-[280px] 2xl:h-[300px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured collections"
    >
      {/* ── Artwork plane (absolute; not part of content flow) ───────────── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className={cn(
              "absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
              i === index
                ? "opacity-100 translate-x-0 scale-100"
                : "opacity-0 translate-x-10 scale-[0.98]"
            )}
          >
            {/* Desktop artwork — wide cinematic plane, cover-crops to height */}
            {slide.desktopImage ? (
              <div className="hero-art-desktop hidden sm:block">
                <div className="hero-art-float relative h-full w-full animate-[hero-float_7s_ease-in-out_infinite] motion-reduce:animate-none">
                  <Image
                    src={slide.desktopImage}
                    alt={slide.imageAlt || slide.heading || "Swift TCG"}
                    fill
                    unoptimized
                    priority={i === 0}
                    sizes="90vw"
                    className="object-cover object-[72%_center]"
                  />
                </div>
              </div>
            ) : null}

            {/* Mobile artwork — compact top slot (height preserved by spacer) */}
            {slide.mobileImage ? (
              <div className="hero-art-mobile sm:hidden">
                <div
                  className="hero-art-float relative h-full w-full animate-[hero-float_7s_ease-in-out_infinite] motion-reduce:animate-none"
                  style={{ animationDelay: "0.15s" }}
                >
                  <Image
                    src={slide.mobileImage}
                    alt={slide.imageAlt || slide.heading || "Swift TCG"}
                    fill
                    unoptimized
                    priority={i === 0}
                    sizes="90vw"
                    className="object-contain object-center"
                  />
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {/* ── Left blend overlay (above art, below text) ───────────────────── */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-[58%] sm:block lg:w-[52%] xl:w-[48%]"
        style={{ background: HERO_FADE }}
        aria-hidden="true"
      />

      {/* ── Content: copy + bottom controls ──────────────────────────────── */}
      <div
        className={cn(
          "relative z-20 mx-auto flex w-full max-w-[1920px] flex-col",
          "px-4 pt-2 pb-1.5",
          /* Desktop banner: fill fixed section height; center copy; pin controls */
          "sm:h-full sm:px-6 sm:py-3",
          "lg:px-8 lg:py-3.5",
          "xl:px-10"
        )}
      >
        {/* Mobile height spacer — preserves stacked art slot */}
        <div className="h-[140px] w-full shrink-0 sm:hidden" aria-hidden="true" />

        {/* Copy band — vertically centered on desktop */}
        <div className="relative z-20 w-full max-w-[540px] shrink-0 sm:flex sm:min-h-0 sm:flex-1 sm:flex-col sm:justify-center">
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              className={cn(
                "flex flex-col items-start transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                i === index
                  ? "relative z-[1] opacity-100 translate-x-0"
                  : "pointer-events-none absolute inset-0 z-0 opacity-0 translate-x-6"
              )}
              aria-hidden={i !== index}
            >
              <span className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.14em] text-black/50 uppercase sm:text-[11px]">
                <span
                  aria-hidden="true"
                  className="size-1.5 shrink-0 rounded-full bg-green-600"
                />
                {slide.eyebrow}
              </span>

              <h1 className="mt-2 max-w-xl text-[1.55rem] leading-[1.08] font-semibold tracking-tight text-black sm:mt-1.5 sm:text-[1.85rem] sm:leading-[1.05] lg:text-[2.15rem] xl:text-[2.35rem]">
                <HeadingLines heading={slide.heading} />
              </h1>

              <p className="mt-1.5 max-w-[26rem] text-[0.8125rem] leading-snug text-black/55 sm:mt-1.5 sm:text-[0.875rem] sm:leading-snug lg:text-[0.9375rem]">
                {slide.description}
              </p>

              <div className="mt-3 flex w-full flex-col items-stretch gap-2 min-[380px]:flex-row min-[380px]:flex-wrap min-[380px]:items-center sm:mt-3 sm:gap-2.5">
                <Button
                  nativeButton={false}
                  render={<Link href={slide.primary.href} />}
                  size="lg"
                  className="relative z-20 h-11 w-full gap-2 rounded-full bg-green-600 px-5 text-sm font-semibold text-white shadow-[0_10px_28px_-12px_rgba(22,163,74,0.5)] transition-transform duration-200 hover:scale-[1.02] hover:bg-green-600/90 min-[380px]:w-auto sm:h-9 sm:px-5 sm:text-[13px] lg:h-10 lg:px-6 lg:text-sm"
                >
                  {slide.primary.label}
                  <ArrowRight className="size-4" data-icon="inline-end" />
                </Button>
                <Button
                  nativeButton={false}
                  render={<Link href={slide.secondary.href} />}
                  size="lg"
                  variant="outline"
                  className="hidden h-11 w-full rounded-full border-black/10 bg-white px-5 text-sm font-semibold text-black transition-transform duration-200 hover:scale-[1.02] hover:bg-neutral-50 min-[380px]:inline-flex min-[380px]:w-auto sm:h-9 sm:px-5 sm:text-[13px] lg:h-10 lg:px-6 lg:text-sm"
                >
                  {slide.secondary.label}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom controls — pinned to banner baseline; reserves height so copy centers above */}
        <div className="relative z-20 mt-9 min-h-11 sm:mt-0 sm:h-9 sm:shrink-0">
          {/*
            Progress sits between the copy band (~540px) and the art focal area.
            42% of the content width lands in that gap on typical desktop widths.
          */}
          <div
            className="absolute bottom-0 left-0 flex items-center gap-2.5 text-sm font-medium tracking-wide text-black/35 tabular-nums sm:left-[42%] sm:gap-2.5 sm:-translate-x-1/2 sm:text-[13px]"
            aria-live="polite"
          >
            <span className="text-black/70">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span
              aria-hidden="true"
              className="relative h-[3px] w-16 overflow-hidden rounded-full bg-black/[0.08] sm:w-24"
            >
              <span
                key={`${index}-${paused}`}
                className="absolute inset-y-0 left-0 rounded-full bg-green-600"
                style={
                  paused
                    ? { width: "100%", opacity: 0.45 }
                    : { animation: `hero-progress ${AUTO_MS}ms linear forwards` }
                }
              />
            </span>
            <span>{String(slideCount).padStart(2, "0")}</span>
          </div>

          {/* Nav arrows — float over lower-right artwork */}
          <div className="absolute bottom-0 right-0 flex items-center gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Previous slide"
              className="size-11 rounded-full border-black/10 bg-white transition-transform duration-200 hover:scale-[1.03] hover:bg-neutral-50 sm:size-8"
              onClick={() => goTo(index - 1)}
            >
              <ArrowLeft className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Next slide"
              className="size-11 rounded-full border-black/10 bg-white transition-transform duration-200 hover:scale-[1.03] hover:bg-neutral-50 sm:size-8"
              onClick={() => goTo(index + 1)}
            >
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>

        <p className="sr-only">
          Slide {index + 1} of {slideCount}: {active.id}
        </p>
      </div>

      <style>{`
        @keyframes hero-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes hero-progress {
          from { width: 0%; }
          to { width: 100%; }
        }

        /* Mobile: compact top composition matching prior art slot */
        .hero-art-mobile {
          position: absolute;
          top: 0.5rem;
          left: 50%;
          width: min(18rem, 72%);
          height: 140px;
          transform: translateX(-50%);
        }

        /*
          Desktop cinematic plane:
          - Fills banner height (object-cover crops horizontally)
          - Extends under the copy so the left white fade can blend the scene
          - Bleeds past the right edge
        */
        @media (min-width: 640px) {
          .hero-art-desktop {
            position: absolute;
            inset: 0;
            left: 0;
            right: -6%;
            width: auto;
            height: 100%;
            max-width: none;
          }
        }

        @media (min-width: 1024px) {
          .hero-art-desktop {
            left: 0;
            right: -4%;
          }
        }

        @media (min-width: 1280px) {
          .hero-art-desktop {
            left: 0;
            right: -3%;
          }
        }

        @media (min-width: 1536px) {
          .hero-art-desktop {
            left: 0;
            right: -2%;
          }
        }
      `}</style>
    </section>
  )
}
