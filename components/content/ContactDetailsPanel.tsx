import Link from "next/link"
import {
  Clock,
  HelpCircle,
  Mail,
  Package,
  ShieldCheck,
  Truck,
} from "lucide-react"

import ContentCallout from "@/components/content/ContentCallout"
import ContentPageHeader from "@/components/content/ContentPageHeader"
import FeatureCards from "@/components/content/FeatureCards"
import SocialIcon from "@/components/content/SocialIcon"
import {
  CONTENT_PAGE_PATHS,
  POLICY_PATHS,
} from "@/lib/shopify/content"
import type { ContactDetails, SocialLink } from "@/types/content"

const SUPPORT_TOPICS = [
  {
    icon: Package,
    title: "Order support",
    description:
      "Order status, missing items, or changes. Include your order number when you write in.",
  },
  {
    icon: Truck,
    title: "Shipping questions",
    description:
      "Processing times, tracking, and delivery. See our Shipping Policy for standard details.",
  },
  {
    icon: ShieldCheck,
    title: "Product authenticity",
    description:
      "Questions about sealed condition, Japanese origin, or listing details — we are happy to clarify.",
  },
] as const

const BEFORE_CONTACT_LINKS = [
  { label: "FAQ", href: CONTENT_PAGE_PATHS.faq },
  { label: "Shipping Policy", href: POLICY_PATHS.shipping },
  { label: "Preorder Policy", href: CONTENT_PAGE_PATHS.preorderPolicy },
  { label: "Refund Policy", href: POLICY_PATHS.refund },
] as const

function SocialList({ links }: { links: SocialLink[] }) {
  if (links.length === 0) return null

  return (
    <ul className="flex flex-wrap items-center gap-2.5">
      {links.map((link) => (
        <li key={link.platform}>
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.label}
            className="flex size-10 items-center justify-center rounded-full border border-black/8 text-black/50 transition-all duration-200 hover:-translate-y-0.5 hover:border-green-600/25 hover:bg-green-600/5 hover:text-green-700 dark:border-white/10 dark:text-white/50 dark:hover:border-green-500/30 dark:hover:bg-green-500/10 dark:hover:text-green-400"
          >
            <SocialIcon platform={link.platform} />
          </a>
        </li>
      ))}
    </ul>
  )
}

type ContactDetailsPanelProps = {
  contact: ContactDetails | null
  businessHours?: string
}

export default function ContactDetailsPanel({
  contact,
  businessHours = "Monday–Friday, 9:00 AM – 5:00 PM PT",
}: ContactDetailsPanelProps) {
  const email = contact?.email ?? null
  const responseTime = contact?.responseTime ?? null
  const social = contact?.social ?? []

  return (
    <aside className="rounded-2xl border border-black/[0.06] bg-[#fafafa] p-5 sm:p-6 dark:border-white/10 dark:bg-white/[0.03]">
      <h2 className="text-xs font-semibold tracking-[0.14em] text-black/45 uppercase dark:text-white/45">
        Reach us
      </h2>

      <dl className="mt-5 space-y-5">
        {email ? (
          <div className="flex gap-3">
            <Mail
              className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <div>
              <dt className="text-xs font-medium text-black/40 dark:text-white/40">
                Business email
              </dt>
              <dd className="mt-1">
                <a
                  href={`mailto:${email}`}
                  className="text-sm font-medium text-green-700 transition-colors hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                >
                  {email}
                </a>
              </dd>
            </div>
          </div>
        ) : null}

        <div className="flex gap-3">
          <Clock
            className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <div>
            <dt className="text-xs font-medium text-black/40 dark:text-white/40">
              Expected response time
            </dt>
            <dd className="mt-1 text-sm text-black/70 dark:text-white/70">
              {responseTime ?? "Within 1–2 business days"}
            </dd>
          </div>
        </div>

        <div className="flex gap-3">
          <Clock
            className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <div>
            <dt className="text-xs font-medium text-black/40 dark:text-white/40">
              Business hours
            </dt>
            <dd className="mt-1 text-sm text-black/70 dark:text-white/70">
              {businessHours}
            </dd>
          </div>
        </div>
      </dl>

      {social.length > 0 ? (
        <div className="mt-6 border-t border-black/[0.06] pt-5 dark:border-white/10">
          <p className="mb-3 text-xs font-medium text-black/40 dark:text-white/40">
            Social
          </p>
          <SocialList links={social} />
        </div>
      ) : null}
    </aside>
  )
}

type ContactPageProps = {
  title: string
  contact: ContactDetails | null
}

export function ContactPageContent({ title, contact }: ContactPageProps) {
  const email = contact?.email

  return (
    <div className="space-y-12 sm:space-y-14">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-12">
        <div className="space-y-6">
          <ContentPageHeader
            title={title}
            description="Questions about an order, a release, or product details? Send us a note — include your order number when you have one so we can respond faster."
          />
          {email ? (
            <a
              href={`mailto:${email}`}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-green-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-green-700"
            >
              Email support
            </a>
          ) : null}
        </div>
        <ContactDetailsPanel contact={contact} />
      </div>

      <section>
        <div className="mb-5 sm:mb-6">
          <p className="text-xs font-semibold tracking-[0.14em] text-black/45 uppercase dark:text-white/45">
            How we can help
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-black sm:text-2xl dark:text-white">
            Common support topics
          </h2>
        </div>
        <FeatureCards items={SUPPORT_TOPICS} columns={3} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ContentCallout icon={HelpCircle} title="Before contacting us" variant="note">
          <p className="mb-3">
            These pages answer most shipping, preorder, and return questions:
          </p>
          <ul className="space-y-2">
            {BEFORE_CONTACT_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="font-medium text-green-700 underline-offset-2 hover:underline dark:text-green-400"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </ContentCallout>

        <ContentCallout icon={Mail} title="Writing a clear request" variant="info">
          Include your order number, the product name, and a short description of
          the issue. Photos help for damaged or incorrect items.
        </ContentCallout>
      </section>
    </div>
  )
}
