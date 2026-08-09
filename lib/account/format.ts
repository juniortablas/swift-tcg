import type { AccountMoney } from "@/types/account"

/** Format Customer Account money values for display. */
export function formatAccountMoney(money: AccountMoney | null | undefined): string {
  if (!money?.amount) return "—"
  const amount = Number.parseFloat(money.amount)
  if (!Number.isFinite(amount)) return `${money.amount} ${money.currencyCode}`

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: money.currencyCode || "USD",
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${money.currencyCode}`
  }
}

export function formatAccountDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

export function formatStatusLabel(status: string | null | undefined): string {
  if (!status) return "—"
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
