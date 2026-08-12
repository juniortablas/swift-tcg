"use client"

import { Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useNewsletterForm } from "@/lib/newsletter/useNewsletterForm"

export default function MaintenanceNewsletter() {
  const { email, setEmail, phase, feedback, pending, handleSubmit } =
    useNewsletterForm("maintenance")

  return (
    <div className="w-full max-w-md">
      {phase === "success" ? (
        <p className="text-sm font-medium text-green-700" role="status">
          You&apos;re on the list — we&apos;ll email you when we open.
        </p>
      ) : phase === "unavailable" ? (
        <p className="text-sm font-medium text-black/55">{feedback}</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="maintenance-newsletter-email" className="sr-only">
            Email address
          </label>
          <div className="relative flex-1">
            <Mail
              className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-black/35"
              aria-hidden
            />
            <input
              id="maintenance-newsletter-email"
              type="email"
              required
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={pending}
              className="h-12 w-full rounded-xl border border-black/10 bg-white py-0 pr-4 pl-11 text-sm text-black outline-none placeholder:text-black/35 focus:border-green-600/40 focus:ring-2 focus:ring-green-600/20 disabled:opacity-60"
            />
          </div>
          <Button
            type="submit"
            disabled={pending}
            className="h-12 shrink-0 rounded-xl bg-green-600 px-6 text-sm font-semibold text-white hover:bg-green-700"
          >
            {pending ? "Joining…" : "Notify me"}
          </Button>
          {feedback ? (
            <p role="alert" className="w-full text-sm font-medium text-red-600 sm:basis-full">
              {feedback}
            </p>
          ) : null}
        </form>
      )}
    </div>
  )
}
