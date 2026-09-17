"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import type { AccountAddress } from "@/types/account"
import { cn } from "@/lib/utils"

type AddressFormProps = {
  address?: AccountAddress | null
  onSubmitAction: (formData: FormData) => Promise<{ error?: string }>
  onCancel?: () => void
  submitLabel?: string
}

function Field({
  label,
  name,
  defaultValue,
  required,
  autoComplete,
  className,
}: {
  label: string
  name: string
  defaultValue?: string | null
  required?: boolean
  autoComplete?: string
  className?: string
}) {
  return (
    <label className={cn("block", className)}>
      <span className="text-sm font-medium text-black/70">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        autoComplete={autoComplete}
        className="mt-1.5 h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm text-black outline-none transition-[border-color,box-shadow] focus:border-indigo-600/40 focus:ring-3 focus:ring-indigo-600/15"
      />
    </label>
  )
}

export function AddressForm({
  address,
  onSubmitAction,
  onCancel,
  submitLabel = "Save address",
}: AddressFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <form
      className="space-y-4 rounded-xl border border-black/[0.06] bg-white p-5"
      action={(formData) => {
        setError(null)
        startTransition(async () => {
          const result = await onSubmitAction(formData)
          if (result.error) {
            setError(result.error)
            return
          }
          onCancel?.()
          router.refresh()
        })
      }}
    >
      {address ? <input type="hidden" name="addressId" value={address.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="First name"
          name="firstName"
          defaultValue={address?.firstName}
          autoComplete="given-name"
        />
        <Field
          label="Last name"
          name="lastName"
          defaultValue={address?.lastName}
          autoComplete="family-name"
        />
      </div>
      <Field
        label="Company"
        name="company"
        defaultValue={address?.company}
        autoComplete="organization"
      />
      <Field
        label="Address"
        name="address1"
        defaultValue={address?.address1}
        required
        autoComplete="address-line1"
      />
      <Field
        label="Apartment, suite, etc."
        name="address2"
        defaultValue={address?.address2}
        autoComplete="address-line2"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="City"
          name="city"
          defaultValue={address?.city}
          required
          autoComplete="address-level2"
        />
        <Field
          label="State / province"
          name="zoneCode"
          defaultValue={address?.zoneCode ?? address?.province}
          autoComplete="address-level1"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="ZIP / postal code"
          name="zip"
          defaultValue={address?.zip}
          required
          autoComplete="postal-code"
        />
        <Field
          label="Country code"
          name="territoryCode"
          defaultValue={address?.territoryCode ?? "US"}
          required
          autoComplete="country"
        />
      </div>
      <Field
        label="Phone"
        name="phoneNumber"
        defaultValue={address?.phoneNumber}
        autoComplete="tel"
      />
      <label className="flex items-center gap-2 text-sm text-black/70">
        <input
          type="checkbox"
          name="defaultAddress"
          value="1"
          defaultChecked={address?.isDefault}
          className="size-4 rounded border-black/20"
        />
        Set as default address
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  )
}
