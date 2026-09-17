import type { ReactNode } from "react"
import { createElement, Fragment } from "react"

/**
 * Wrap case-insensitive query matches in <mark> for predictive results.
 */
export function highlightMatch(text: string, query: string): ReactNode {
  const q = query.trim()
  if (!q || !text) return text

  const lowerText = text.toLowerCase()
  const lowerQuery = q.toLowerCase()
  const parts: ReactNode[] = []
  let cursor = 0
  let index = lowerText.indexOf(lowerQuery)

  if (index === -1) return text

  while (index !== -1) {
    if (index > cursor) {
      parts.push(text.slice(cursor, index))
    }
    const matched = text.slice(index, index + q.length)
    parts.push(
      createElement(
        "mark",
        {
          key: `${index}-${matched}`,
          className: "rounded-sm bg-indigo-600/15 text-inherit",
        },
        matched
      )
    )
    cursor = index + q.length
    index = lowerText.indexOf(lowerQuery, cursor)
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor))
  }

  return createElement(Fragment, null, ...parts)
}
