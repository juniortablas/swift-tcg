import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Flag,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react"

import ContentCallout from "@/components/content/ContentCallout"
import ContentPageHeader from "@/components/content/ContentPageHeader"
import FeatureCards from "@/components/content/FeatureCards"

const WHY_SWIFT = [
  {
    icon: ShieldCheck,
    title: "Factory-Sealed Guarantee",
    description:
      "We sell factory-sealed Japanese product as stated on each listing — no reseals, no ambiguity.",
  },
  {
    icon: Flag,
    title: "Imported Directly From Japan",
    description:
      "Releases are sourced from Japan and brought into our California fulfillment flow.",
  },
  {
    icon: MapPin,
    title: "Ships From California",
    description:
      "Once inventory clears customs and lands in our warehouse, orders ship with tracking.",
  },
  {
    icon: Users,
    title: "Why Collectors Trust Us",
    description:
      "Clear condition, clear timing, and honest product details — without hype or exaggeration.",
  },
] as const

const HOW_IT_WORKS = [
  {
    icon: Flag,
    label: "Japan",
    detail: "Authentic product sourced at origin.",
  },
  {
    icon: PackageCheck,
    label: "Imported",
    detail: "Brought into the U.S. for fulfillment.",
  },
  {
    icon: CheckCircle2,
    label: "Quality Checked",
    detail: "Reviewed before it enters inventory.",
  },
  {
    icon: Truck,
    label: "Shipped from California",
    detail: "Packed and sent with tracking.",
  },
] as const

type AboutPageContentProps = {
  title: string
}

export default function AboutPageContent({ title }: AboutPageContentProps) {
  return (
    <article className="space-y-12 sm:space-y-16">
      <ContentPageHeader
        title={title}
        description="Swift TCG gives collectors, local game stores, and competitive players a reliable path to authentic Japanese TCG products — with clarity, speed, and no exaggeration."
      />

      <section>
        <p className="text-xs font-semibold tracking-[0.14em] text-black/45 uppercase dark:text-white/45">
          Our Mission
        </p>
        <ContentCallout
          icon={Building2}
          variant="important"
          className="mt-4"
          title="What we stand for"
        >
          Give collectors and stores a dependable way to buy authentic Japanese
          trading card products — factory sealed when stated, clearly described,
          and fulfilled from California.
        </ContentCallout>
      </section>

      <section>
        <div className="mb-5 sm:mb-6">
          <p className="text-xs font-semibold tracking-[0.14em] text-black/45 uppercase dark:text-white/45">
            Why Swift TCG
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-black sm:text-2xl dark:text-white">
            Built for sealed Japanese releases
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-black/55 dark:text-white/55">
            Every listing is meant to be straightforward: what the product is,
            when it ships, and how it arrives.
          </p>
        </div>
        <FeatureCards items={WHY_SWIFT} />
      </section>

      <section>
        <div className="mb-6 sm:mb-8">
          <p className="text-xs font-semibold tracking-[0.14em] text-black/45 uppercase dark:text-white/45">
            How it Works
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-black sm:text-2xl dark:text-white">
            From Japan to your door
          </h2>
        </div>

        <ol className="relative grid gap-0 sm:grid-cols-4 sm:gap-4">
          {HOW_IT_WORKS.map(({ icon: Icon, label, detail }, index) => (
            <li
              key={label}
              className="relative flex gap-4 border-l border-green-600/20 py-4 pl-5 sm:flex-col sm:border-l-0 sm:border-t sm:py-0 sm:pt-6 sm:pl-0 dark:border-green-500/25"
            >
              <span
                className="absolute -left-[9px] top-5 flex size-4 items-center justify-center rounded-full bg-white ring-2 ring-green-600/40 sm:top-0 sm:-mt-[9px] sm:left-0 dark:bg-background dark:ring-green-500/40"
                aria-hidden="true"
              >
                <span className="size-1.5 rounded-full bg-green-600 dark:bg-green-400" />
              </span>
              <div className="sm:pt-2">
                <div className="flex items-center gap-2.5">
                  <Icon
                    className="size-4 shrink-0 text-green-600 dark:text-green-400"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <span className="text-[15px] font-semibold tracking-tight text-black dark:text-white">
                    {label}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-black/55 dark:text-white/55">
                  {detail}
                </p>
                {index < HOW_IT_WORKS.length - 1 ? (
                  <span className="sr-only">then</span>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <ContentCallout icon={BadgeCheck} variant="note" title="Honest by design">
        We do not invent scarcity, inflate history, or overpromise stock. What
        you see on the product page is what we stand behind.
      </ContentCallout>
    </article>
  )
}
