"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import type { AccountCustomer } from "@/types/account"

type ProfileFormProps = {
  customer: AccountCustomer
  updateAction: (formData: FormData) => Promise<{ error?: string }>
}

export default function ProfileForm({ customer, updateAction }: ProfileFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <form
      className="max-w-lg space-y-5 rounded-xl border border-black/[0.06] bg-white p-5"
      action={(formData) => {
        setError(null)
        setSaved(false)
        startTransition(async () => {
          const result = await updateAction(formData)
          if (result.error) {
            setError(result.error)
            return
          }
          setSaved(true)
          router.refresh()
        })
      }}
    >
      <label className="block">
        <span className="text-sm font-medium text-black/70">Email</span>
        <input
          value={customer.email ?? ""}
          readOnly
          className="mt-1.5 h-10 w-full rounded-lg border border-black/10 bg-black/[0.02] px-3 text-sm text-black/70 outline-none"
        />
        <span className="mt-1.5 block text-xs text-black/45">
          Email is managed by Shopify Customer Accounts.
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-black/70">First name</span>
          <input
            name="firstName"
            defaultValue={customer.firstName ?? ""}
            autoComplete="given-name"
            className="mt-1.5 h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm text-black outline-none transition-[border-color,box-shadow] focus:border-indigo-600/40 focus:ring-3 focus:ring-indigo-600/15"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-black/70">Last name</span>
          <input
            name="lastName"
            defaultValue={customer.lastName ?? ""}
            autoComplete="family-name"
            className="mt-1.5 h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm text-black outline-none transition-[border-color,box-shadow] focus:border-indigo-600/40 focus:ring-3 focus:ring-indigo-600/15"
          />
        </label>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {saved ? <p className="text-sm text-green-700">Profile saved.</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  )
}
