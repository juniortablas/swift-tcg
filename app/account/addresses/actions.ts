"use server"

import { addressInputFromFormData } from "@/lib/account/addressForm"
import {
  createCustomerAddress,
  deleteCustomerAddress,
  updateCustomerAddress,
} from "@/lib/shopify/customerAccount"

export async function createAddressAction(
  formData: FormData
): Promise<{ error?: string }> {
  try {
    await createCustomerAddress({
      address: addressInputFromFormData(formData),
      defaultAddress: formData.get("defaultAddress") === "1",
    })
    return {}
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to create address.",
    }
  }
}

export async function updateAddressAction(
  formData: FormData
): Promise<{ error?: string }> {
  const addressId = String(formData.get("addressId") ?? "").trim()
  if (!addressId) return { error: "Missing address id." }

  try {
    await updateCustomerAddress({
      addressId,
      address: addressInputFromFormData(formData),
      defaultAddress: formData.get("defaultAddress") === "1",
    })
    return {}
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to update address.",
    }
  }
}

export async function deleteAddressAction(
  formData: FormData
): Promise<{ error?: string }> {
  const addressId = String(formData.get("addressId") ?? "").trim()
  if (!addressId) return { error: "Missing address id." }

  try {
    await deleteCustomerAddress(addressId)
    return {}
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to delete address.",
    }
  }
}
