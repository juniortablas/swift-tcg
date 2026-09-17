"use client"

import Link from "next/link"
import { Search } from "lucide-react"
import { useDeferredValue, useMemo, useState } from "react"

import ContentCallout from "@/components/content/ContentCallout"
import ContentPageHeader from "@/components/content/ContentPageHeader"
import RichHtml from "@/components/content/RichHtml"
import { CONTENT_PAGE_PATHS } from "@/lib/shopify/content"
import type { FaqSection } from "@/lib/content/parseFaq"

type FaqPageContentProps = {
  title: string
  sections: FaqSection[]
  /** Fallback when structured Q&A could not be parsed. */
  bodyHtml?: string
}

function filterSections(sections: FaqSection[], query: string): FaqSection[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return sections

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        const answerText = item.answerHtml.replace(/<[^>]+>/g, " ")
        const haystack = `${item.question} ${answerText}`.toLowerCase()
        return haystack.includes(normalized)
      }),
    }))
    .filter((section) => section.items.length > 0)
}

export default function FaqPageContent({
  title,
  sections,
  bodyHtml,
}: FaqPageContentProps) {
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const visibleSections = useMemo(
    () => filterSections(sections, deferredQuery),
    [sections, deferredQuery]
  )

  if (sections.length === 0 && bodyHtml) {
    return (
      <article>
        <ContentPageHeader title={title} />
        <div className="mt-6 sm:mt-8">
          <RichHtml html={bodyHtml} />
        </div>
        <FaqContactCta />
      </article>
    )
  }

  const totalVisible = visibleSections.reduce(
    (count, section) => count + section.items.length,
    0
  )

  return (
    <article>
      <ContentPageHeader
        title={title}
        description="Answers about ordering, shipping, preorders, products, and returns."
      >
        <div className="relative mt-6 sm:mt-8">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-black/35 dark:text-white/35"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <label htmlFor="faq-search" className="sr-only">
            Search FAQ
          </label>
          <input
            id="faq-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search FAQ…"
            autoComplete="off"
            className="h-11 w-full rounded-full border border-black/[0.08] bg-[#fafafa] pr-4 pl-10 text-sm text-black outline-none transition-[border-color,box-shadow] placeholder:text-black/35 focus:border-indigo-600/35 focus:ring-2 focus:ring-indigo-600/15 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-white/35 dark:focus:border-indigo-500/40 dark:focus:ring-indigo-500/20"
          />
        </div>
      </ContentPageHeader>

      <div className="mt-10 space-y-12 sm:mt-12 sm:space-y-14">
        {visibleSections.length === 0 ? (
          <p className="text-sm text-black/55 dark:text-white/55">
            No questions match “{query.trim()}”. Try a different search or
            contact us below.
          </p>
        ) : (
          visibleSections.map((section, sectionIndex) => (
            <section key={section.heading ?? `section-${sectionIndex}`}>
              {section.heading ? (
                <h2 className="text-xs font-semibold tracking-[0.14em] text-black/45 uppercase dark:text-white/45">
                  {section.heading}
                </h2>
              ) : null}

              <div
                className={
                  section.heading
                    ? "mt-4 divide-y divide-black/[0.06] border-y border-black/[0.06] dark:divide-white/10 dark:border-white/10"
                    : "divide-y divide-black/[0.06] border-y border-black/[0.06] dark:divide-white/10 dark:border-white/10"
                }
              >
                {section.items.map((item) => (
                  <details
                    key={item.question}
                    className="group py-5 open:pb-6"
                  >
                    <summary className="cursor-pointer list-none text-[15px] font-medium text-black marker:content-none [&::-webkit-details-marker]:hidden dark:text-white">
                      <span className="flex items-start justify-between gap-4">
                        <span>{item.question}</span>
                        <span
                          aria-hidden="true"
                          className="mt-0.5 shrink-0 text-black/30 transition-transform duration-200 group-open:rotate-45 dark:text-white/30"
                        >
                          +
                        </span>
                      </span>
                    </summary>
                    <div className="mt-3 pr-8">
                      <RichHtml html={item.answerHtml} />
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {deferredQuery.trim() && totalVisible > 0 ? (
        <p className="mt-6 text-xs text-black/40 dark:text-white/40">
          Showing {totalVisible}{" "}
          {totalVisible === 1 ? "result" : "results"}
        </p>
      ) : null}

      <FaqContactCta />
    </article>
  )
}

function FaqContactCta() {
  return (
    <div className="mt-12 sm:mt-16">
      <ContentCallout variant="important" title="Still need help?">
        <p className="text-[15px] font-semibold tracking-tight text-black dark:text-white">
          Didn&apos;t find your answer?
        </p>
        <p className="mt-1">
          <Link
            href={CONTENT_PAGE_PATHS.contact}
            className="font-medium text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-400"
          >
            Contact us.
          </Link>
        </p>
      </ContentCallout>
    </div>
  )
}
