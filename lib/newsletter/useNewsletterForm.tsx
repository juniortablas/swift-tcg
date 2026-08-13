"use client"

import {
  FormEvent,
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
} from "react"

import { NEWSLETTER_HONEYPOT_FIELD } from "@/lib/newsletter/constants"
import { subscribeNewsletterClient } from "@/lib/newsletter/client"
import { trackNewsletterSubscribed } from "@/lib/newsletter/analytics"
import type { NewsletterSource } from "@/lib/newsletter/types"

export type NewsletterFormPhase = "form" | "success"

export type NewsletterFormApi = {
  email: string
  setEmail: (value: string) => void
  phase: NewsletterFormPhase
  feedback: string | null
  pending: boolean
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
  emailInputRef: RefObject<HTMLInputElement | null>
  successRef: RefObject<HTMLParagraphElement | null>
  errorRef: RefObject<HTMLParagraphElement | null>
  inputId: string
  errorId: string
  honeypotId: string
  honeypotField: typeof NEWSLETTER_HONEYPOT_FIELD
}

/**
 * Shared submit state for homepage + footer + maintenance newsletter forms.
 * UI chrome stays in each component; this owns the service call and a11y focus.
 */
export function useNewsletterForm(source: NewsletterSource): NewsletterFormApi {
  const reactId = useId()
  const inputId = `${reactId}-email`
  const errorId = `${reactId}-error`
  const honeypotId = `${reactId}-website`

  const [email, setEmail] = useState("")
  const [phase, setPhase] = useState<NewsletterFormPhase>("form")
  const [feedback, setFeedback] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const emailInputRef = useRef<HTMLInputElement>(null)
  const successRef = useRef<HTMLParagraphElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const submittedRef = useRef(false)

  useEffect(() => {
    if (phase === "success") {
      successRef.current?.focus()
    }
  }, [phase])

  useEffect(() => {
    if (feedback) {
      emailInputRef.current?.focus()
    }
  }, [feedback])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || submittedRef.current) return

    const website =
      new FormData(event.currentTarget)
        .get(NEWSLETTER_HONEYPOT_FIELD)
        ?.toString() ?? ""

    if (!email.trim()) return

    submittedRef.current = true
    setPending(true)
    setFeedback(null)

    const result = await subscribeNewsletterClient({
      email,
      source,
      website,
    })

    setPending(false)

    if (result.success) {
      setPhase("success")
      trackNewsletterSubscribed(source)
      return
    }

    submittedRef.current = false
    setFeedback(result.message)
  }

  return {
    email,
    setEmail,
    phase,
    feedback,
    pending,
    handleSubmit,
    emailInputRef,
    successRef,
    errorRef,
    inputId,
    errorId,
    honeypotField: NEWSLETTER_HONEYPOT_FIELD,
    honeypotId,
  }
}

export function NewsletterHoneypotField({
  id,
  name,
}: {
  id: string
  name: string
}) {
  return (
    <div className="sr-only" aria-hidden="true">
      <label htmlFor={id}>Website</label>
      <input
        id={id}
        name={name}
        type="text"
        tabIndex={-1}
        autoComplete="off"
      />
    </div>
  )
}
