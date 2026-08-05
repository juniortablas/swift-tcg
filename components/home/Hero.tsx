import Image from "next/image"
import { ArrowRight, Star } from "lucide-react"

import { Button } from "@/components/ui/button"

const PRODUCTS = [
  {
    src: "/placeholders/product-1.svg",
    alt: "Japanese Pokémon booster box",
    wrapper:
      "absolute left-[4%] top-[12%] z-10 w-[38%] -rotate-[14deg] sm:left-[6%] sm:w-[36%]",
    delay: "0s",
  },
  {
    src: "/placeholders/product-2.svg",
    alt: "One Piece TCG booster box",
    wrapper:
      "absolute right-[4%] top-[6%] z-20 w-[40%] rotate-[11deg] sm:right-[6%] sm:w-[38%]",
    delay: "0.45s",
  },
  {
    src: "/placeholders/product-3.svg",
    alt: "Premium Japanese sealed product",
    wrapper:
      "absolute bottom-[4%] left-1/2 z-30 w-[44%] -translate-x-1/2 rotate-[2deg] sm:bottom-[2%] sm:w-[42%]",
    delay: "0.9s",
  },
] as const

const AVATARS = [
  "/placeholders/avatar-1.svg",
  "/placeholders/avatar-2.svg",
  "/placeholders/avatar-3.svg",
] as const

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 pt-8 pb-4 sm:gap-12 sm:pt-10 sm:pb-5 md:grid-cols-2 md:gap-8 md:pt-6 md:pb-3 lg:min-h-[calc((100vh-8rem)*0.75)] lg:gap-12 lg:pt-4 lg:pb-2 xl:gap-16">
        {/* Left: copy + CTAs */}
        <div className="relative z-10 flex max-w-xl flex-col items-start">
          <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-green-700 uppercase shadow-sm">
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full bg-red-500"
            />
            Direct from Japan
          </span>

          <h1 className="mt-6 text-[2.35rem] leading-[1.08] font-semibold tracking-tight text-black sm:text-5xl lg:text-[3.5rem] xl:text-6xl">
            Japan&apos;s Latest Releases.
            <br />
            <span className="text-green-600">Delivered Fast.</span>
          </h1>

          <p className="mt-5 max-w-md text-base leading-relaxed text-black/55 sm:mt-6 sm:text-lg">
            Factory-sealed Pokémon &amp; TCG products imported weekly from Japan
            and shipped from California.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              className="h-12 gap-2 rounded-full bg-green-600 px-6 text-[15px] font-medium text-white hover:bg-green-600/90"
            >
              Shop New Releases
              <ArrowRight className="size-4" data-icon="inline-end" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-black/10 bg-white px-6 text-[15px] font-medium text-black hover:bg-black/[0.03]"
            >
              View Preorders
            </Button>
          </div>

          <div className="mt-8 flex items-center gap-3 sm:mt-10">
            <div className="flex -space-x-2.5" aria-hidden="true">
              {AVATARS.map((src, index) => (
                <div
                  key={src}
                  className="relative size-8 overflow-hidden rounded-full border-2 border-white bg-neutral-200 shadow-sm"
                  style={{ zIndex: AVATARS.length - index }}
                >
                  <Image
                    src={src}
                    alt=""
                    width={32}
                    height={32}
                    unoptimized
                    className="size-full object-cover"
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-0.5">
              <div
                className="flex items-center gap-0.5 text-green-600"
                aria-label="5 out of 5 stars"
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="size-3.5 fill-current"
                    aria-hidden="true"
                  />
                ))}
              </div>
              <p className="text-xs font-medium text-black/50 sm:text-[13px]">
                Trusted by 2,000+ collectors
              </p>
            </div>
          </div>
        </div>

        {/* Right: floating products */}
        <div className="relative mx-auto aspect-square w-full max-w-sm md:max-w-md lg:max-w-md">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 size-[125%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.22)_0%,rgba(34,197,94,0.08)_40%,transparent_70%)]"
          />

          {PRODUCTS.map((product) => (
            <div key={product.src} className={product.wrapper}>
              <div
                className="animate-[hero-float_5.5s_ease-in-out_infinite] motion-reduce:animate-none"
                style={{ animationDelay: product.delay }}
              >
                <Image
                  src={product.src}
                  alt={product.alt}
                  width={360}
                  height={480}
                  unoptimized
                  priority
                  className="h-auto w-full rounded-2xl shadow-[0_28px_55px_-20px_rgba(0,0,0,0.32)]"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes hero-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </section>
  )
}
