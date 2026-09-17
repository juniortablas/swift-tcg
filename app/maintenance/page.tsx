import type { Metadata } from "next"

import BrandLogo from "@/components/brand/BrandLogo"
import MaintenanceNewsletter from "@/components/ux/MaintenanceNewsletter"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: { absolute: "Coming Soon | Swift TCG" },
  description:
    "Swift TCG is putting the finishing touches on a premium shopping experience for authentic Japanese Pokémon and One Piece trading cards.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/maintenance",
  },
}

type SocialLink = { label: string; href: string }

function maintenanceSocialLinks(): SocialLink[] {
  const links: SocialLink[] = []
  const instagram = process.env.INSTAGRAM_URL?.trim()
  const twitter = process.env.TWITTER_URL?.trim() || process.env.X_URL?.trim()
  const discord = process.env.DISCORD_URL?.trim()
  const facebook = process.env.FACEBOOK_URL?.trim()

  if (instagram) links.push({ label: "Instagram", href: instagram })
  if (twitter) links.push({ label: "X", href: twitter })
  if (discord) links.push({ label: "Discord", href: discord })
  if (facebook) links.push({ label: "Facebook", href: facebook })
  return links
}

export default function MaintenancePage() {
  const socialLinks = maintenanceSocialLinks()
  const eta =
    process.env.MAINTENANCE_ETA?.trim() ||
    "We're aiming to open the storefront very soon — check back shortly."

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-white text-black">
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

          <p className="mt-10 animate-maintenance-enter text-[0.7rem] font-semibold tracking-[0.28em] text-indigo-600 uppercase [animation-delay:80ms] sm:text-xs">
            Temporarily closed
          </p>

          <h1 className="mt-4 animate-maintenance-enter text-balance text-3xl font-semibold tracking-tight text-black [animation-delay:140ms] sm:text-4xl md:text-[2.75rem] md:leading-[1.15]">
            We&apos;re Almost Ready.
          </h1>

          <p className="mt-5 max-w-md animate-maintenance-enter text-pretty text-[15px] leading-relaxed text-black/55 [animation-delay:200ms] sm:text-base">
            Swift TCG is putting the finishing touches on a premium shopping
            experience for authentic Japanese Pokémon and One Piece trading
            cards.
          </p>

          <p className="mt-4 max-w-md animate-maintenance-enter text-sm leading-relaxed text-black/45 [animation-delay:240ms]">
            <span className="font-medium text-black/60">Estimated return: </span>
            {eta}
          </p>

          <div className="mt-10 w-full animate-maintenance-enter [animation-delay:280ms]">
            <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-black/45 uppercase">
              Get launch updates
            </p>
            <div className="flex justify-center">
              <MaintenanceNewsletter />
            </div>
          </div>

          <div className="mt-8 flex w-full max-w-sm animate-maintenance-enter flex-col gap-3 [animation-delay:320ms] sm:max-w-none sm:flex-row sm:justify-center">
            {socialLinks[0] ? (
              <a
                href={socialLinks[0].href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgba(79,70,229,0.55)] transition-[transform,background-color] duration-200 hover:scale-[1.02] hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40 focus-visible:ring-offset-2"
              >
                Follow on {socialLinks[0].label}
              </a>
            ) : null}

            <a
              href="mailto:support@swifttcg.com"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-black/10 bg-white px-6 text-sm font-semibold text-black/80 transition-[transform,background-color,border-color] duration-200 hover:scale-[1.02] hover:border-black/15 hover:bg-black/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-2"
            >
              Contact Support
            </a>
          </div>

          {socialLinks.length > 1 ? (
            <nav
              aria-label="Social links"
              className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 animate-maintenance-enter [animation-delay:360ms]"
            >
              {socialLinks.slice(1).map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-black/50 underline-offset-2 transition-colors hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          ) : null}
        </div>
      </div>

      <footer className="relative z-10 animate-maintenance-enter pb-8 text-center text-xs text-black/35 [animation-delay:400ms]">
        © Swift TCG
      </footer>
    </main>
  )
}
