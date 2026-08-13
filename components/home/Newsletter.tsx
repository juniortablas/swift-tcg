"use client"

import { Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  NewsletterHoneypotField,
  useNewsletterForm,
} from "@/lib/newsletter/useNewsletterForm"
import { NEWSLETTER_EMAIL_MAX_LENGTH } from "@/lib/newsletter/constants"

export default function Newsletter() {
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
  } = useNewsletterForm("homepage")

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="overflow-hidden rounded-[16px] border border-green-600/10 bg-[linear-gradient(135deg,#f0fdf4_0%,#ecfdf5_45%,#f7fef9_100%)] px-4 py-5 sm:rounded-[24px] sm:px-9 sm:py-10 lg:px-12 lg:py-12">
          <div className="flex flex-col items-start justify-between gap-4 sm:gap-7 lg:flex-row lg:items-center lg:gap-12">
            <div className="flex max-w-lg items-start gap-3 sm:gap-4">
              <div
                aria-hidden="true"
                className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-green-600/10 text-green-700 sm:size-11"
              >
                <Mail className="size-4 sm:size-5" strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="text-[1.1rem] font-semibold tracking-tight text-black sm:text-[1.65rem]">
                  Be the first to know.
                </h2>
                <p className="mt-1 text-sm leading-snug text-black/55 sm:mt-2 sm:text-[15px] sm:leading-relaxed">
                  Get notified when new Japanese releases arrive — sealed drops,
                  preorders, and weekly imports.
                </p>
              </div>
            </div>

            {phase === "success" ? (
              <p
                ref={successRef}
                tabIndex={-1}
                role="status"
                className="text-sm font-medium text-green-700 outline-none"
              >
                You&apos;re on the list — thank you.
              </p>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:items-center"
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
                  className="h-12 w-full rounded-full border border-black/10 bg-white px-5 text-sm text-black outline-none placeholder:text-black/35 focus:border-green-600/40 focus:ring-2 focus:ring-green-600/20 disabled:opacity-60"
                />
                <Button
                  type="submit"
                  disabled={pending}
                  aria-busy={pending}
                  className="h-12 shrink-0 rounded-full bg-green-600 px-7 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgba(22,163,74,0.45)] transition-transform duration-200 hover:scale-[1.02] hover:bg-green-700 disabled:hover:scale-100"
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
                    className="w-full text-sm font-medium text-red-600 sm:basis-full"
                  >
                    {feedback}
                  </p>
                ) : null}
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
