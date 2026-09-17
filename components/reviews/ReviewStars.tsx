import { cn } from "@/lib/utils"

type ReviewStarsProps = {
  rating: number
  size?: "sm" | "md" | "lg"
  className?: string
  /** Accessible label override. Defaults to "Rated X out of 5". */
  label?: string
  /** When true, renders interactive buttons for selecting a rating. */
  interactive?: boolean
  onChange?: (rating: number) => void
  name?: string
}

const SIZE = {
  sm: "text-[12px] gap-0.5",
  md: "text-[15px] gap-0.5",
  lg: "text-[20px] gap-1",
} as const

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={cn(
        "size-[1em] shrink-0",
        filled ? "text-[#0EA54B]" : "text-black/15"
      )}
    >
      <path
        fill="currentColor"
        d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.9l-4.94 2.6.94-5.5-4-3.9 5.53-.8L10 1.5z"
      />
    </svg>
  )
}

export default function ReviewStars({
  rating,
  size = "md",
  className,
  label,
  interactive = false,
  onChange,
  name = "rating",
}: ReviewStarsProps) {
  const clamped = Math.max(0, Math.min(5, rating))
  const rounded = Math.round(clamped)
  const aria =
    label ??
    (clamped > 0
      ? `Rated ${clamped.toFixed(clamped % 1 === 0 ? 0 : 1)} out of 5`
      : "No rating")

  if (interactive) {
    return (
      <div
        role="radiogroup"
        aria-label={label ?? "Rating"}
        className={cn("inline-flex items-center", SIZE[size], className)}
      >
        {[1, 2, 3, 4, 5].map((value) => {
          const selected = value === rounded
          const filled = value <= rounded
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
              name={name}
              onClick={() => onChange?.(value)}
              className={cn(
                "rounded-sm p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40",
                filled ? "text-[#0EA54B]" : "text-black/15 hover:text-[#0EA54B]/70"
              )}
            >
              <StarIcon filled={filled} />
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      role="img"
      aria-label={aria}
      className={cn("inline-flex items-center", SIZE[size], className)}
    >
      {[1, 2, 3, 4, 5].map((value) => (
        <StarIcon key={value} filled={value <= Math.round(clamped)} />
      ))}
    </div>
  )
}
