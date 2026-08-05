import Image from "next/image"
import { Button } from "@/components/ui/button"

interface FeaturedReleaseProps {
  badge: string
  title: string
  subtitle: string
  description: string
  buttonText: string
  image?: string
}

export default function FeaturedRelease({
  badge,
  title,
  subtitle,
  description,
  buttonText,
  image,
}: FeaturedReleaseProps) {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)]">
          <div className="grid items-center gap-10 p-8 sm:p-10 lg:grid-cols-2 lg:gap-16 lg:p-14">
            <div className="flex flex-col items-start">
              <span className="mb-5 inline-flex items-center rounded-full border border-green-600/20 bg-green-600/10 px-3 py-1 text-xs font-medium tracking-wide text-green-600">
                {badge}
              </span>

              <h2 className="text-3xl font-semibold tracking-tight text-black sm:text-4xl lg:text-5xl lg:leading-[1.1]">
                {title}
              </h2>

              <p className="mt-3 text-base font-medium text-black/50 sm:text-lg">
                {subtitle}
              </p>

              <p className="mt-5 max-w-md text-sm leading-relaxed text-black/60 sm:text-base">
                {description}
              </p>

              <Button
                size="lg"
                className="mt-8 h-11 bg-green-600 px-6 text-white hover:bg-green-600/90"
              >
                {buttonText}
              </Button>
            </div>

            <div className="relative flex min-h-[280px] items-center justify-center sm:min-h-[340px]">
              {/* Soft backdrop glow */}
              <div
                aria-hidden="true"
                className="absolute inset-8 rounded-full bg-neutral-100/80 blur-2xl"
              />

              {/* Back card */}
              <div
                aria-hidden="true"
                className="absolute h-48 w-36 -translate-x-10 -rotate-6 rounded-2xl border border-black/5 bg-neutral-100 shadow-md sm:h-56 sm:w-40"
              />

              {/* Mid card */}
              <div
                aria-hidden="true"
                className="absolute h-52 w-40 translate-x-8 rotate-3 rounded-2xl border border-black/5 bg-neutral-50 shadow-lg sm:h-60 sm:w-44"
              />

              {/* Front product card */}
              {image ? (
                <div className="relative z-10 aspect-[3/4] w-40 overflow-hidden rounded-2xl border border-black/5 bg-gradient-to-b from-white to-neutral-50 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.15)] sm:w-48">
                  <Image
                    src={image}
                    alt={title}
                    fill
                    className="object-contain"
                    sizes="(max-width: 640px) 160px, 192px"
                  />
                </div>
              ) : (
                <div className="relative z-10 flex aspect-[3/4] w-40 flex-col justify-between rounded-2xl border border-black/5 bg-gradient-to-b from-white to-neutral-50 p-5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.15)] sm:w-48 sm:p-6">
                  <div className="space-y-2">
                    <div className="h-2 w-12 rounded-full bg-black/10" />
                    <div className="h-2 w-20 rounded-full bg-black/5" />
                  </div>

                  <div className="flex flex-1 items-center justify-center py-6">
                    <div className="flex size-16 items-center justify-center rounded-xl bg-neutral-100 sm:size-20">
                      <div className="size-8 rounded-lg bg-neutral-200/80 sm:size-10" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="h-2.5 w-full rounded-full bg-black/10" />
                    <div className="h-2 w-2/3 rounded-full bg-black/5" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
