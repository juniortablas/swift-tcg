"use server"

import { updateCustomerProfile } from "@/lib/shopify/customerAccount"

export async function updateProfileAction(
  formData: FormData
): Promise<{ error?: string }> {
  try {
    await updateCustomerProfile({
      firstName: String(formData.get("firstName") ?? "").trim() || undefined,
      lastName: String(formData.get("lastName") ?? "").trim() || undefined,
    })
    return {}
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to update profile.",
    }
  }
}
