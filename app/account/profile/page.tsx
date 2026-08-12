import type { Metadata } from "next"

import AccountShell from "@/components/account/AccountShell"
import ProfileForm from "@/components/account/ProfileForm"
import { updateProfileAction } from "@/app/account/profile/actions"
import { getCustomerProfile } from "@/lib/shopify/customerAccount"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
}

export default async function AccountProfilePage() {
  const customer = await getCustomerProfile()

  return (
    <AccountShell
      pathname="/account/profile"
      title="Profile"
      description="Your name and email from Shopify Customer Accounts."
    >
      <ProfileForm customer={customer} updateAction={updateProfileAction} />
    </AccountShell>
  )
}
