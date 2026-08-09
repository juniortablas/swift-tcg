/**
 * Parse Shopify FAQ page HTML into sectioned Q&A.
 *
 * Conventions (editable in Shopify rich text):
 * - h2 → section heading
 * - h3 → question
 * - following block elements until the next h2/h3 → answer (rich HTML)
 */

import * as cheerio from "cheerio"
import type { Element } from "domhandler"

export type FaqItem = {
  question: string
  answerHtml: string
}

export type FaqSection = {
  heading: string | null
  items: FaqItem[]
}

function isElement(node: unknown): node is Element {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    (node as Element).type === "tag"
  )
}

export function parseFaqHtml(html: string): FaqSection[] | null {
  const input = html?.trim()
  if (!input) return null

  const $ = cheerio.load(`<div id="faq-root">${input}</div>`, null, false)
  const root = $("#faq-root")
  const sections: FaqSection[] = []
  let current: FaqSection = { heading: null, items: [] }
  let pendingQuestion: string | null = null
  const answerParts: string[] = []

  function flushAnswer() {
    if (!pendingQuestion) {
      answerParts.length = 0
      return
    }
    const answerHtml = answerParts.join("").trim()
    if (answerHtml) {
      current.items.push({
        question: pendingQuestion,
        answerHtml,
      })
    }
    pendingQuestion = null
    answerParts.length = 0
  }

  function flushSection() {
    flushAnswer()
    if (current.heading || current.items.length > 0) {
      sections.push(current)
    }
    current = { heading: null, items: [] }
  }

  root.contents().each((_, node) => {
    if (!isElement(node)) {
      if (pendingQuestion && node.type === "text" && node.data?.trim()) {
        answerParts.push(`<p>${node.data}</p>`)
      }
      return
    }

    const tag = node.tagName.toLowerCase()

    if (tag === "h2") {
      flushSection()
      current.heading = $(node).text().trim() || null
      return
    }

    if (tag === "h3") {
      flushAnswer()
      pendingQuestion = $(node).text().trim() || null
      return
    }

    if (pendingQuestion) {
      answerParts.push($.html(node) ?? "")
    }
  })

  flushSection()

  const hasItems = sections.some((section) => section.items.length > 0)
  return hasItems ? sections : null
}
