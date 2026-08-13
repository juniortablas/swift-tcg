"use client"

import { Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  NewsletterHoneypotField,
  useNewsletterForm,
} from "@/lib/newsletter/useNewsletterForm"
import { NEWSLETTER_EMAIL_MAX_LENGTH } from "@/lib/newsletter/constants"

export default function MaintenanceNewsletter() {
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
  } = useNewsletterForm("maintenance")

  return (
    <div className="w-full max-w-md">
      {phase === "success" ? (
        <p
          ref={successRef}
          tabIndex={-1}
          role="status"
          className="text-sm font-medium text-green-700 outline-none"
        >
          You&apos;re on the list — we&apos;ll email you when we open.
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 sm:flex-row"
          aria-busy={pending}
        >
          <NewsletterHoneypotField id={honeypotId} name={honeypotField} />
          <label htmlFor={inputId} className="sr-only">
            Email address
          </label>
          <div className="relative flex-1">
            <Mail
              className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-black/35"
              aria-hidden
            />
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
              className="h-12 w-full rounded-xl border border-black/10 bg-white py-0 pr-4 pl-11 text-sm text-black outline-none placeholder:text-black/35 focus:border-green-600/40 focus:ring-2 focus:ring-green-600/20 disabled:opacity-60"
            />
          </div>
          <Button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="h-12 shrink-0 rounded-xl bg-green-600 px-6 text-sm font-semibold text-white hover:bg-green-700"
          >
            {pending ? "Joining…" : "Notify me"}
          </Button>
          <span className="sr-only" aria-live="polite">
            {pending ? "Subscribing" : ""}
          </span>
          {feedback ? (
            <p
              ref={errorRef}
              id={errorId}
              role="alert"
              className="w-full text-sm font-medium text-red-600 sm:basis-full"
            >
              {feedback}
            </p>
          ) : null}
        </form>
      )}
    </div>
  )
}
