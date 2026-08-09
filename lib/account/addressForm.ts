import type { AccountAddressInput } from "@/types/account"

export function addressInputFromFormData(formData: FormData): AccountAddressInput {
  const get = (key: string) => {
    const value = String(formData.get(key) ?? "").trim()
    return value || undefined
  }
  return {
    firstName: get("firstName"),
    lastName: get("lastName"),
    company: get("company"),
    address1: get("address1"),
    address2: get("address2"),
    city: get("city"),
    zoneCode: get("zoneCode"),
    zip: get("zip"),
    territoryCode: get("territoryCode"),
    phoneNumber: get("phoneNumber"),
  }
}
