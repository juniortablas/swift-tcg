"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { AddressForm } from "@/components/account/AddressForm"
import { Button } from "@/components/ui/button"
import type { AccountAddress } from "@/types/account"

type AddressesManagerProps = {
  addresses: AccountAddress[]
  createAction: (formData: FormData) => Promise<{ error?: string }>
  updateAction: (formData: FormData) => Promise<{ error?: string }>
  deleteAction: (formData: FormData) => Promise<{ error?: string }>
}

export default function AddressesManager({
  addresses,
  createAction,
  updateAction,
  deleteAction,
}: AddressesManagerProps) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      {addresses.length === 0 && !adding ? (
        <div className="rounded-xl border border-black/[0.06] bg-white px-5 py-10 text-center">
          <p className="text-sm text-black/55">No saved addresses yet.</p>
          <Button className="mt-4" onClick={() => setAdding(true)}>
            Add address
          </Button>
        </div>
      ) : (
        <ul className="space-y-4">
          {addresses.map((address) => (
            <li key={address.id}>
              {editingId === address.id ? (
                <AddressForm
                  address={address}
                  onSubmitAction={updateAction}
                  onCancel={() => setEditingId(null)}
                  submitLabel="Update address"
                />
              ) : (
                <div className="rounded-xl border border-black/[0.06] bg-white px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-0.5 text-sm text-black/70">
                      {address.isDefault ? (
                        <p className="mb-2 text-xs font-semibold tracking-wide text-green-700 uppercase">
                          Default
                        </p>
                      ) : null}
                      {address.formatted.length > 0 ? (
                        address.formatted.map((line) => <p key={line}>{line}</p>)
                      ) : (
                        <>
                          <p>
                            {[address.firstName, address.lastName]
                              .filter(Boolean)
                              .join(" ")}
                          </p>
                          {address.address1 ? <p>{address.address1}</p> : null}
                          <p>
                            {[address.city, address.zoneCode || address.province, address.zip]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                          {address.country ? <p>{address.country}</p> : null}
                        </>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAdding(false)
                          setEditingId(address.id)
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          setError(null)
                          const formData = new FormData()
                          formData.set("addressId", address.id)
                          startTransition(async () => {
                            const result = await deleteAction(formData)
                            if (result.error) {
                              setError(result.error)
                              return
                            }
                            router.refresh()
                          })
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {adding ? (
        <AddressForm
          onSubmitAction={createAction}
          onCancel={() => setAdding(false)}
          submitLabel="Add address"
        />
      ) : addresses.length > 0 ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setEditingId(null)
            setAdding(true)
          }}
        >
          Add address
        </Button>
      ) : null}
    </div>
  )
}
