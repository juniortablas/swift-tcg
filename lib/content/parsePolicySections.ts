/**
 * Parse Shopify policy / page HTML into an intro + h2 sections.
 * Preserves original HTML inside each section — presentation only.
 */

import * as cheerio from "cheerio"
import type { Element } from "domhandler"

export type PolicySection = {
  heading: string
  bodyHtml: string
}

export type ParsedPolicyContent = {
  introHtml: string
  sections: PolicySection[]
}

function isElement(node: unknown): node is Element {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    (node as Element).type === "tag"
  )
}

export function parsePolicySections(html: string): ParsedPolicyContent | null {
  const input = html?.trim()
  if (!input) return null

  const $ = cheerio.load(`<div id="policy-root">${input}</div>`, null, false)
  const root = $("#policy-root")

  const introParts: string[] = []
  const sections: PolicySection[] = []
  let currentHeading: string | null = null
  const bodyParts: string[] = []

  function flushSection() {
    if (!currentHeading) {
      bodyParts.length = 0
      return
    }
    const bodyHtml = bodyParts.join("").trim()
    sections.push({ heading: currentHeading, bodyHtml })
    currentHeading = null
    bodyParts.length = 0
  }

  root.contents().each((_, node) => {
    if (!isElement(node)) {
      if (node.type === "text" && node.data?.trim()) {
        const text = `<p>${node.data}</p>`
        if (currentHeading) bodyParts.push(text)
        else introParts.push(text)
      }
      return
    }

    const tag = node.tagName.toLowerCase()

    if (tag === "h2") {
      flushSection()
      currentHeading = $(node).text().trim() || null
      return
    }

    const htmlChunk = $.html(node) ?? ""
    if (currentHeading) {
      bodyParts.push(htmlChunk)
    } else {
      introParts.push(htmlChunk)
    }
  })

  flushSection()

  const introHtml = introParts.join("").trim()
  if (!introHtml && sections.length === 0) return null

  return { introHtml, sections }
}
