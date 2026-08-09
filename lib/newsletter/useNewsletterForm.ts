"use client"

import { FormEvent, useState } from "react"

import { subscribeNewsletterClient } from "@/lib/newsletter/client"
import type { NewsletterSource } from "@/lib/newsletter/types"

export type NewsletterFormPhase = "form" | "success" | "unavailable"

/**
 * Shared submit state for homepage + footer newsletter forms.
 * UI chrome stays in each component; this only owns the service call.
 */
export function useNewsletterForm(source: NewsletterSource) {
  const [email, setEmail] = useState("")
  const [phase, setPhase] = useState<NewsletterFormPhase>("form")
  const [feedback, setFeedback] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim() || pending) return

    setPending(true)
    setFeedback(null)

    const result = await subscribeNewsletterClient({ email, source })
    setPending(false)

    if (
      result.status === "subscribed" ||
      result.status === "already_subscribed"
    ) {
      setPhase("success")
      return
    }

    if (result.status === "provider_not_configured") {
      setPhase("unavailable")
      setFeedback(result.message)
      return
    }

    setFeedback(result.message)
  }

  return {
    email,
    setEmail,
    phase,
    feedback,
    pending,
    handleSubmit,
  }
}
