import Link from "next/link"

import FooterNewsletter from "@/components/layout/FooterNewsletter"
import SocialIcon from "@/components/content/SocialIcon"
import {
  CONTENT_PAGE_PATHS,
  POLICY_PATHS,
} from "@/lib/shopify/content"
import type { SocialLink } from "@/types/content"

const SHOP_LINKS = [
  { label: "Pokémon", href: "/pokemon" },
  { label: "One Piece", href: "/one-piece" },
  { label: "Preorders", href: "/preorders" },
  { label: "New Releases", href: "/new-releases" },
] as const

const CUSTOMER_CARE_LINKS = [
  { label: "Contact", href: CONTENT_PAGE_PATHS.contact },
  { label: "FAQ", href: CONTENT_PAGE_PATHS.faq },
  { label: "Shipping Policy", href: POLICY_PATHS.shipping },
  { label: "Refund Policy", href: POLICY_PATHS.refund },
  { label: "Preorder Policy", href: CONTENT_PAGE_PATHS.preorderPolicy },
] as const

const COMPANY_LINKS = [
  { label: "About Swift TCG", href: CONTENT_PAGE_PATHS.about },
  { label: "Privacy Policy", href: POLICY_PATHS.privacy },
  { label: "Terms of Service", href: POLICY_PATHS.terms },
] as const

const PAYMENTS = [
  { label: "Visa", mark: "VISA" },
  { label: "Mastercard", mark: "MC" },
  { label: "Amex", mark: "AMEX" },
  { label: "Apple Pay", mark: "APay" },
  { label: "Shop Pay", mark: "Shop" },
] as const

type FooterProps = {
  socialLinks?: SocialLink[]
}

function FooterColumn({
  title,
  links,
}: {
  title: string
  links: ReadonlyArray<{ label: string; href: string }>
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold tracking-[0.14em] text-black/45 uppercase dark:text-white/45">
        {title}
      </h3>
      <ul className="mt-4 space-y-1 sm:mt-5 sm:space-y-3">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="inline-flex min-h-10 items-center text-sm text-black/60 transition-colors hover:text-black sm:min-h-0 dark:text-white/60 dark:hover:text-white"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Footer({ socialLinks = [] }: FooterProps) {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-black/[0.06] bg-white dark:border-white/10 dark:bg-background">
      <div className="mx-auto max-w-[1920px] px-4 pt-10 pb-8 sm:px-6 sm:pt-16 sm:pb-12 lg:px-8 xl:px-10">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-12 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-10">
          <div className="sm:col-span-2 lg:col-span-3">
            <Link href="/" className="inline-flex flex-col leading-none">
              <span className="text-lg font-bold tracking-tight text-black dark:text-white">
                SWIFT
              </span>
              <span className="mt-0.5 text-[0.7rem] font-bold tracking-[0.18em] text-green-600 dark:text-green-400">
                TCG
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-black/50 dark:text-white/50">
              Swift TCG imports authentic factory-sealed Pokémon and One Piece
              products directly from Japan and fulfills every order from
              California.
            </p>
          </div>

          <div className="lg:col-span-2">
            <FooterColumn title="Shop" links={SHOP_LINKS} />
          </div>

          <div className="lg:col-span-2">
            <FooterColumn title="Customer Care" links={CUSTOMER_CARE_LINKS} />
          </div>

          <div className="lg:col-span-2">
            <FooterColumn title="Company" links={COMPANY_LINKS} />
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <h3 className="text-xs font-semibold tracking-[0.14em] text-black/45 uppercase dark:text-white/45">
              Community
            </h3>
            <p className="mt-3.5 text-sm leading-relaxed text-black/50 sm:mt-5 dark:text-white/50">
              Release alerts and import updates.
            </p>
            <div className="mt-4 max-w-xs">
              <FooterNewsletter />
            </div>
            {socialLinks.length > 0 ? (
              <ul className="mt-5 flex flex-wrap items-center gap-2.5">
                {socialLinks.map((item) => (
                  <li key={item.platform}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={item.label}
                      className="flex size-9 items-center justify-center rounded-full border border-black/8 text-black/45 transition-all duration-200 hover:-translate-y-0.5 hover:border-green-600/25 hover:bg-green-600/5 hover:text-green-700 dark:border-white/10 dark:text-white/45 dark:hover:border-green-500/30 dark:hover:bg-green-500/10 dark:hover:text-green-400"
                    >
                      <SocialIcon platform={item.platform} />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-5 border-t border-black/[0.06] pt-7 sm:mt-16 sm:flex-row sm:items-center sm:gap-6 sm:pt-8 dark:border-white/10">
          <div className="space-y-1.5">
            <p className="text-xs text-black/40 dark:text-white/40">
              © {year} Swift TCG
            </p>
            <p className="text-xs text-black/35 dark:text-white/35">
              <a
                href="https://www.shopify.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-black/55 dark:hover:text-white/55"
              >
                Powered by Shopify
              </a>
            </p>
          </div>
          <ul className="flex flex-wrap items-center gap-2" aria-label="Accepted payments">
            {PAYMENTS.map((payment) => (
              <li
                key={payment.label}
                title={payment.label}
                className="flex h-6 min-w-[2.35rem] items-center justify-center rounded-[5px] border border-black/[0.08] bg-[#fafafa] px-1.5 text-[8px] font-bold tracking-wide text-black/40 dark:border-white/10 dark:bg-white/5 dark:text-white/40"
              >
                {payment.mark}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}
