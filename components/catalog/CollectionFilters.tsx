"use client"

import { useId, useState, type ReactNode } from "react"
import { ChevronDown, X } from "lucide-react"

import {
  getLanguageFilterLabel,
  hasActiveFilters,
  type AvailabilityFilter,
  type CollectionFiltersState,
} from "@/lib/catalog"
import { cn } from "@/lib/utils"
import { formatUsdPrice } from "@/lib/pricing"

type CollectionFiltersProps = {
  filters: CollectionFiltersState
  onChange: (next: CollectionFiltersState) => void
  onReset: () => void
  priceBounds: { min: number; max: number }
  availableTypes: string[]
  availableYears: number[]
  availableLanguages: string[]
  className?: string
  /** Hide the "Filters" heading when the parent already provides one (mobile drawer). */
  hideHeading?: boolean
}

const AVAILABILITY: { value: AvailabilityFilter; label: string }[] = [
  { value: "instock", label: "In Stock" },
  { value: "preorder", label: "Preorder" },
  { value: "coming-soon", label: "Coming Soon" },
]

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value]
}

function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-black/[0.06] py-2.5 last:border-b-0 sm:py-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-10 w-full items-center justify-between gap-3 text-left sm:min-h-0"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold tracking-tight text-black">
          {title}
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-black/40 transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>
      {open ? <div className="mt-2 sm:mt-3">{children}</div> : null}
    </div>
  )
}

function CheckboxRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: () => void
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-1 py-2.5 transition-colors hover:bg-black/[0.02] sm:min-h-0 sm:py-1.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-4 rounded border-black/20 text-green-600 accent-green-600"
      />
      <span className="text-sm text-black/70">{label}</span>
    </label>
  )
}

export default function CollectionFilters({
  filters,
  onChange,
  onReset,
  priceBounds,
  availableTypes,
  availableYears,
  availableLanguages,
  className,
  hideHeading = false,
}: CollectionFiltersProps) {
  const minId = useId()
  const maxId = useId()
  const active = hasActiveFilters(filters)

  const currentMin = filters.priceMin ?? priceBounds.min
  const currentMax = filters.priceMax ?? priceBounds.max

  return (
    <aside className={cn("flex flex-col", className)}>
      {hideHeading ? (
        active ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-medium text-green-600 transition-colors hover:text-green-700"
            >
              Reset Filters
            </button>
          </div>
        ) : null
      ) : (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight text-black">
            Filters
          </h2>
          {active ? (
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-medium text-green-600 transition-colors hover:text-green-700"
            >
              Reset Filters
            </button>
          ) : null}
        </div>
      )}

      {availableYears.length > 0 ? (
        <FilterSection title="Release Year">
          <div className="space-y-0.5">
            {availableYears.map((year) => (
              <CheckboxRow
                key={year}
                checked={filters.years.includes(year)}
                label={String(year)}
                onChange={() =>
                  onChange({
                    ...filters,
                    years: toggleValue(filters.years, year),
                  })
                }
              />
            ))}
          </div>
        </FilterSection>
      ) : null}

      {availableLanguages.length > 0 ? (
        <FilterSection title="Language">
          <div className="space-y-0.5">
            {availableLanguages.map((language) => (
              <CheckboxRow
                key={language}
                checked={filters.languages.includes(language)}
                label={getLanguageFilterLabel(language)}
                onChange={() =>
                  onChange({
                    ...filters,
                    languages: toggleValue(filters.languages, language),
                  })
                }
              />
            ))}
          </div>
        </FilterSection>
      ) : null}

      <FilterSection title="Availability">
        <div className="space-y-0.5">
          {AVAILABILITY.map((option) => (
            <CheckboxRow
              key={option.value}
              checked={filters.availability.includes(option.value)}
              label={option.label}
              onChange={() =>
                onChange({
                  ...filters,
                  availability: toggleValue(filters.availability, option.value),
                })
              }
            />
          ))}
        </div>
      </FilterSection>

      {availableTypes.length > 0 ? (
        <FilterSection title="Product Type" defaultOpen={false}>
          <div className="space-y-0.5">
            {availableTypes.map((type) => (
              <CheckboxRow
                key={type}
                checked={filters.types.includes(type)}
                label={type}
                onChange={() =>
                  onChange({
                    ...filters,
                    types: toggleValue(filters.types, type),
                  })
                }
              />
            ))}
          </div>
        </FilterSection>
      ) : null}

      <FilterSection title="Price Range" defaultOpen={false}>
        <div className="space-y-3 px-1">
          <div className="flex items-center justify-between text-xs font-medium tabular-nums text-black/50">
            <span>{formatUsdPrice(currentMin)}</span>
            <span>{formatUsdPrice(currentMax)}</span>
          </div>
          <div className="relative h-6">
            <label htmlFor={minId} className="sr-only">
              Minimum price
            </label>
            <input
              id={minId}
              type="range"
              min={priceBounds.min}
              max={priceBounds.max}
              step={1}
              value={currentMin}
              onChange={(event) => {
                const next = Number(event.target.value)
                const clamped = Math.min(next, currentMax)
                onChange({
                  ...filters,
                  priceMin:
                    clamped <= priceBounds.min ? null : clamped,
                  priceMax: filters.priceMax,
                })
              }}
              className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-1.5 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-green-600 [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-green-600"
            />
            <label htmlFor={maxId} className="sr-only">
              Maximum price
            </label>
            <input
              id={maxId}
              type="range"
              min={priceBounds.min}
              max={priceBounds.max}
              step={1}
              value={currentMax}
              onChange={(event) => {
                const next = Number(event.target.value)
                const clamped = Math.max(next, currentMin)
                onChange({
                  ...filters,
                  priceMin: filters.priceMin,
                  priceMax:
                    clamped >= priceBounds.max ? null : clamped,
                })
              }}
              className="pointer-events-none absolute inset-x-0 top-1/2 z-20 h-1.5 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-green-600 [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-green-600"
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-black/10"
            />
            <div
              aria-hidden="true"
              className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-green-600/70"
              style={{
                left: `${((currentMin - priceBounds.min) / Math.max(priceBounds.max - priceBounds.min, 1)) * 100}%`,
                right: `${100 - ((currentMax - priceBounds.min) / Math.max(priceBounds.max - priceBounds.min, 1)) * 100}%`,
              }}
            />
          </div>
        </div>
      </FilterSection>

      {active ? (
        <button
          type="button"
          onClick={onReset}
          className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black/70 transition-colors hover:border-black/20 hover:text-black"
        >
          <X className="size-3.5" aria-hidden="true" />
          Reset Filters
        </button>
      ) : null}
    </aside>
  )
}
