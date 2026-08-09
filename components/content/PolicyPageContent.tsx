import type { LucideIcon } from "lucide-react"
import {
  Clock,
  FileText,
  Package,
  RefreshCw,
  Scale,
  Shield,
  ShieldCheck,
  Ship,
  Truck,
} from "lucide-react"

import ContentCallout from "@/components/content/ContentCallout"
import ContentPageHeader from "@/components/content/ContentPageHeader"
import RichHtml from "@/components/content/RichHtml"
import { parsePolicySections } from "@/lib/content/parsePolicySections"
import type { ShopPolicyKind } from "@/types/content"

type PolicyKind = ShopPolicyKind | "preorderPolicy"

type PolicyPageContentProps = {
  title: string
  bodyHtml: string
  /** Native Shopify policy kind, or page handle for preorder policy. */
  kind?: PolicyKind
}

const SECTION_ICON_RULES: Array<{ match: RegExp; icon: LucideIcon }> = [
  { match: /process|fulfill|timing|method/i, icon: Truck },
  { match: /track/i, icon: Package },
  { match: /domestic|delivery delay|incorrect address|lost package/i, icon: Truck },
  { match: /ship|delivery|international|carrier|customs|duties/i, icon: Ship },
  { match: /payment|charg|pricing|price|refund process/i, icon: FileText },
  {
    match: /cancel|refund|return|damag|incorrect|exchange|eligible|non-return/i,
    icon: RefreshCw,
  },
  { match: /seal|authent|product|non-returnable/i, icon: ShieldCheck },
  {
    match: /preorder|allocat|mixed|combined|partial|how preorders|release date|supplier delay/i,
    icon: Package,
  },
  { match: /contact|support|window/i, icon: Clock },
  { match: /order|liability|term|agree/i, icon: Scale },
  { match: /privacy|data|information/i, icon: Shield },
]

const INTRO_ICON_BY_KIND: Partial<Record<PolicyKind, LucideIcon>> = {
  shippingPolicy: Truck,
  refundPolicy: RefreshCw,
  preorderPolicy: Clock,
  termsOfService: Scale,
  privacyPolicy: Shield,
}

function iconForHeading(heading: string): LucideIcon {
  for (const rule of SECTION_ICON_RULES) {
    if (rule.match.test(heading)) return rule.icon
  }
  return FileText
}

/**
 * Presentational policy layout. Does not alter legal copy — only structure.
 */
export default function PolicyPageContent({
  title,
  bodyHtml,
  kind,
}: PolicyPageContentProps) {
  const parsed = parsePolicySections(bodyHtml)

  if (!parsed) {
    return (
      <article>
        <ContentPageHeader title={title} />
        <div className="mt-6 sm:mt-8">
          <RichHtml html={bodyHtml} />
        </div>
      </article>
    )
  }

  const { introHtml, sections } = parsed
  const IntroIcon = (kind && INTRO_ICON_BY_KIND[kind]) || FileText

  return (
    <article>
      <ContentPageHeader title={title} />

      {introHtml ? (
        <ContentCallout
          icon={IntroIcon}
          title="Overview"
          variant="important"
          className="mt-6 sm:mt-8"
        >
          <RichHtml
            html={introHtml}
            className="text-[15px] text-black/70 dark:text-white/70 [&_p]:my-1.5 [&>:first-child]:mt-0 [&>:last-child]:mb-0"
          />
        </ContentCallout>
      ) : null}

      {sections.length > 0 ? (
        <div
          className={
            introHtml
              ? "mt-2 divide-y divide-black/[0.06] dark:divide-white/10"
              : "mt-6 divide-y divide-black/[0.06] border-t border-black/[0.06] dark:divide-white/10 dark:border-white/10 sm:mt-8"
          }
        >
          {sections.map((section) => {
            const Icon = iconForHeading(section.heading)
            return (
              <section
                key={section.heading}
                className="py-8 first:pt-6 sm:py-10"
              >
                <div className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-black/[0.06] bg-[#fafafa] dark:border-white/10 dark:bg-white/[0.03]">
                    <Icon
                      className="size-4 text-green-600 dark:text-green-400"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold tracking-tight text-black dark:text-white">
                      {section.heading}
                    </h2>
                    {section.bodyHtml ? (
                      <div className="mt-3">
                        <RichHtml
                          html={section.bodyHtml}
                          className="[&_h2]:mt-0 [&_p:first-child]:mt-0"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      ) : null}
    </article>
  )
}
