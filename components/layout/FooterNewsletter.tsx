"use client"

import { useId } from "react"

import { Button } from "@/components/ui/button"
import { useNewsletterForm } from "@/lib/newsletter/useNewsletterForm"

/**
 * Compact newsletter signup for the footer Community column.
 */
export default function FooterNewsletter() {
  const inputId = useId()
  const { email, setEmail, phase, feedback, pending, handleSubmit } =
    useNewsletterForm("footer")

  if (phase === "success") {
    return (
      <p className="text-sm font-medium text-green-700 dark:text-green-400">
        You&apos;re on the list — thank you.
      </p>
    )
  }

  if (phase === "unavailable") {
    return (
      <p className="text-sm font-medium text-black/55 dark:text-white/55">
        {feedback}
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      <label htmlFor={inputId} className="sr-only">
        Email address
      </label>
      <input
        id={inputId}
        type="email"
        required
        autoComplete="email"
        placeholder="Enter your email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        disabled={pending}
        className="h-10 w-full rounded-full border border-black/10 bg-white px-4 text-sm text-black outline-none placeholder:text-black/35 focus:border-green-600/40 focus:ring-2 focus:ring-green-600/20 disabled:opacity-60 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-white/35"
      />
      <Button
        type="submit"
        disabled={pending}
        className="h-10 w-full rounded-full bg-green-600 text-sm font-semibold text-white hover:bg-green-700"
      >
        Subscribe
      </Button>
      {feedback ? (
        <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
          {feedback}
        </p>
      ) : null}
    </form>
  )
}
