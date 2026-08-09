import type { Metadata } from "next"

import AccountShell from "@/components/account/AccountShell"
import AddressesManager from "@/components/account/AddressesManager"
import {
  createAddressAction,
  deleteAddressAction,
  updateAddressAction,
} from "@/app/account/addresses/actions"
import { getCustomerAddresses } from "@/lib/shopify/customerAccount"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Addresses | Swift TCG",
  robots: { index: false, follow: false },
}

export default async function AccountAddressesPage() {
  const addresses = await getCustomerAddresses()

  return (
    <AccountShell
      pathname="/account/addresses"
      title="Addresses"
      description="Shipping addresses saved to your Shopify customer account."
    >
      <AddressesManager
        addresses={addresses}
        createAction={createAddressAction}
        updateAction={updateAddressAction}
        deleteAction={deleteAddressAction}
      />
    </AccountShell>
  )
}
