"use client"

import { Button } from "@/components/ui/button"
import {
  NewsletterHoneypotField,
  useNewsletterForm,
} from "@/lib/newsletter/useNewsletterForm"
import { NEWSLETTER_EMAIL_MAX_LENGTH } from "@/lib/newsletter/constants"

/**
 * Compact newsletter signup for the footer Community column.
 */
export default function FooterNewsletter() {
  const {
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
    honeypotId,
    honeypotField,
  } = useNewsletterForm("footer")

  if (phase === "success") {
    return (
      <p
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="text-sm font-medium text-green-700 outline-none dark:text-green-400"
      >
        You&apos;re on the list — thank you.
      </p>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2.5"
      aria-busy={pending}
    >
      <NewsletterHoneypotField id={honeypotId} name={honeypotField} />
      <label htmlFor={inputId} className="sr-only">
        Email address
      </label>
      <input
        ref={emailInputRef}
        id={inputId}
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        maxLength={NEWSLETTER_EMAIL_MAX_LENGTH}
        placeholder="Enter your email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        disabled={pending}
        aria-invalid={feedback ? true : undefined}
        aria-describedby={feedback ? errorId : undefined}
        className="h-10 w-full rounded-full border border-black/10 bg-white px-4 text-sm text-black outline-none placeholder:text-black/35 focus:border-green-600/40 focus:ring-2 focus:ring-green-600/20 disabled:opacity-60 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-white/35"
      />
      <Button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="h-10 w-full rounded-full bg-green-600 text-sm font-semibold text-white hover:bg-green-700"
      >
        Subscribe
      </Button>
      <span className="sr-only" aria-live="polite">
        {pending ? "Subscribing" : ""}
      </span>
      {feedback ? (
        <p
          ref={errorRef}
          id={errorId}
          role="alert"
          className="text-sm font-medium text-red-600 dark:text-red-400"
        >
          {feedback}
        </p>
      ) : null}
    </form>
  )
}
