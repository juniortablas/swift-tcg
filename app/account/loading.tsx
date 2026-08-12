import { AccountPageSkeleton } from "@/components/ux/skeletons/AccountPageSkeleton"

/** Nested under account layout — chrome already present. */
export default function AccountLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading account</span>
      <div className="animate-ux-fade">
        <AccountPageSkeleton />
      </div>
    </div>
  )
}
