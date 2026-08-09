import type { ContactDetails } from "@/types/content"

import AboutPageContent from "@/components/content/AboutPageContent"
import { ContactPageContent } from "@/components/content/ContactDetailsPanel"
import FaqPageContent from "@/components/content/FaqPageContent"
import PolicyPageContent from "@/components/content/PolicyPageContent"
import RichHtml from "@/components/content/RichHtml"
import { parseFaqHtml } from "@/lib/content/parseFaq"

type ContentPageViewProps = {
  handle: string
  title: string
  bodyHtml: string
  contact?: ContactDetails | null
}

/**
 * Presentational shell for Shopify-managed pages.
 * Special layouts for about / contact / faq / preorder-policy;
 * everything else uses generic rich text.
 */
export default function ContentPageView({
  handle,
  title,
  bodyHtml,
  contact = null,
}: ContentPageViewProps) {
  if (handle === "about") {
    return <AboutPageContent title={title} />
  }

  if (handle === "contact") {
    return <ContactPageContent title={title} contact={contact} />
  }

  if (handle === "faq") {
    const sections = parseFaqHtml(bodyHtml) ?? []
    return (
      <FaqPageContent
        title={title}
        sections={sections}
        bodyHtml={bodyHtml}
      />
    )
  }

  if (handle === "preorder-policy") {
    return (
      <PolicyPageContent
        title={title}
        bodyHtml={bodyHtml}
        kind="preorderPolicy"
      />
    )
  }

  return (
    <article>
      <h1 className="text-3xl font-semibold tracking-tight text-black sm:text-4xl dark:text-white">
        {title}
      </h1>
      <div className="mt-6 sm:mt-8">
        <RichHtml html={bodyHtml} />
      </div>
    </article>
  )
}
