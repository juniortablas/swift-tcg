import type { Metadata } from "next"

import BrandLogo from "@/components/brand/BrandLogo"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: { absolute: "Coming Soon | Swift TCG" },
  description:
    "Swift TCG is putting the finishing touches on a premium shopping experience for authentic Japanese Pokémon and One Piece trading cards.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function MaintenancePage() {
  const instagramUrl = process.env.INSTAGRAM_URL?.trim() || null

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-white text-black">
      {/* Soft brand atmosphere — restrained green wash on white */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,#DCFCE7_0%,transparent_55%),radial-gradient(ellipse_60%_40%_at_80%_100%,#F0FDF4_0%,transparent_50%),radial-gradient(ellipse_50%_35%_at_10%_90%,#F0FDF4_0%,transparent_45%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(rgba(22,163,74,0.08)_0.6px,transparent_0.6px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black_20%,transparent_75%)]"
      />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16 sm:px-8">
        <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
          <div className="animate-maintenance-enter [animation-delay:0ms]">
            <BrandLogo height={64} priority />
          </div>

          <p className="mt-10 animate-maintenance-enter text-[0.7rem] font-semibold tracking-[0.28em] text-green-600 uppercase [animation-delay:80ms] sm:text-xs">
            Launching Soon
          </p>

          <h1 className="mt-4 animate-maintenance-enter text-balance text-3xl font-semibold tracking-tight text-black [animation-delay:140ms] sm:text-4xl md:text-[2.75rem] md:leading-[1.15]">
            We&apos;re Almost Ready.
          </h1>

          <p className="mt-5 max-w-md animate-maintenance-enter text-pretty text-[15px] leading-relaxed text-black/55 [animation-delay:200ms] sm:text-base">
            Swift TCG is putting the finishing touches on a premium shopping
            experience for authentic Japanese Pokémon and One Piece trading
            cards.
          </p>

          <div className="mt-10 flex w-full max-w-sm animate-maintenance-enter flex-col gap-3 [animation-delay:280ms] sm:max-w-none sm:flex-row sm:justify-center">
            {instagramUrl ? (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-green-600 px-6 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgba(22,163,74,0.55)] transition-[transform,background-color] duration-200 hover:scale-[1.02] hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600/40 focus-visible:ring-offset-2"
              >
                Follow us on Instagram
              </a>
            ) : null}

            <a
              href="mailto:support@swifttcg.com"
              className={`inline-flex h-12 items-center justify-center rounded-xl border border-black/10 bg-white px-6 text-sm font-semibold text-black/80 transition-[transform,background-color,border-color] duration-200 hover:scale-[1.02] hover:border-black/15 hover:bg-black/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-2 ${
                instagramUrl ? "" : "w-full sm:w-auto"
              }`}
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>

      <footer className="relative z-10 animate-maintenance-enter pb-8 text-center text-xs text-black/35 [animation-delay:360ms]">
        © Swift TCG
      </footer>
    </main>
  )
}
