import { cn } from "@/lib/utils"

type IllustrationProps = {
  className?: string
  title?: string
}

function Frame({
  className,
  title,
  children,
}: IllustrationProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 160 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("mx-auto h-28 w-auto text-indigo-600", className)}
      role="img"
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

/** Escaped card / empty binder motif for 404 & empty catalogs. */
export function EscapedCardIllustration(props: IllustrationProps) {
  return (
    <Frame {...props} title={props.title ?? "Trading card escaping a binder"}>
      <rect
        x="18"
        y="28"
        width="88"
        height="72"
        rx="10"
        className="fill-indigo-600/[0.08] stroke-indigo-600/30"
        strokeWidth="2"
      />
      <path
        d="M34 44h56M34 56h40M34 68h48"
        className="stroke-indigo-600/25"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect
        x="78"
        y="14"
        width="56"
        height="78"
        rx="8"
        transform="rotate(12 106 53)"
        className="fill-white stroke-indigo-600"
        strokeWidth="2.5"
      />
      <circle cx="106" cy="42" r="12" className="fill-indigo-600/15" />
      <path
        d="M96 72h20M96 82h14"
        className="stroke-indigo-600/40"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </Frame>
  )
}

export function HeartEmptyIllustration(props: IllustrationProps) {
  return (
    <Frame {...props} title={props.title ?? "Empty wishlist"}>
      <circle cx="80" cy="60" r="44" className="fill-indigo-600/[0.07]" />
      <path
        d="M80 86c-18-12-28-22-28-34a16 16 0 0 1 28-10 16 16 0 0 1 28 10c0 12-10 22-28 34Z"
        className="fill-white stroke-indigo-600"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </Frame>
  )
}

export function StarEmptyIllustration(props: IllustrationProps) {
  return (
    <Frame {...props} title={props.title ?? "No reviews yet"}>
      <circle cx="80" cy="60" r="44" className="fill-indigo-600/[0.07]" />
      <path
        d="M80 30l10.5 21.5 23.5 3.5-17 16.5 4 23.5L80 83.5 59 94.5l4-23.5-17-16.5 23.5-3.5L80 30Z"
        className="fill-white stroke-indigo-600"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </Frame>
  )
}

export function BellEmptyIllustration(props: IllustrationProps) {
  return (
    <Frame {...props} title={props.title ?? "No notifications"}>
      <circle cx="80" cy="60" r="44" className="fill-indigo-600/[0.07]" />
      <path
        d="M80 28a22 22 0 0 1 22 22v14l8 12H50l8-12V50a22 22 0 0 1 22-22Z"
        className="fill-white stroke-indigo-600"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M72 84a8 8 0 0 0 16 0"
        className="stroke-indigo-600"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </Frame>
  )
}

export function PackageEmptyIllustration(props: IllustrationProps) {
  return (
    <Frame {...props} title={props.title ?? "No orders yet"}>
      <circle cx="80" cy="60" r="44" className="fill-indigo-600/[0.07]" />
      <path
        d="M48 52l32-14 32 14v28l-32 14-32-14V52Z"
        className="fill-white stroke-indigo-600"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M80 38v56M48 52l32 14 32-14"
        className="stroke-indigo-600/50"
        strokeWidth="2"
      />
    </Frame>
  )
}

export function SearchEmptyIllustration(props: IllustrationProps) {
  return (
    <Frame {...props} title={props.title ?? "No search results"}>
      <circle cx="80" cy="60" r="44" className="fill-indigo-600/[0.07]" />
      <circle
        cx="72"
        cy="54"
        r="22"
        className="fill-white stroke-indigo-600"
        strokeWidth="2.5"
      />
      <path
        d="M88 70l22 22"
        className="stroke-indigo-600"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </Frame>
  )
}

export function SparklesEmptyIllustration(props: IllustrationProps) {
  return (
    <Frame {...props} title={props.title ?? "Coming soon"}>
      <circle cx="80" cy="60" r="44" className="fill-indigo-600/[0.07]" />
      <rect
        x="54"
        y="34"
        width="52"
        height="68"
        rx="8"
        className="fill-white stroke-indigo-600"
        strokeWidth="2.5"
      />
      <circle cx="80" cy="58" r="12" className="fill-indigo-600/15" />
      <path
        d="M36 40l6 3-6 3 6 3M118 78l6 3-6 3 6 3M104 28l4 2-4 2"
        className="stroke-indigo-600"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Frame>
  )
}

export function HistoryEmptyIllustration(props: IllustrationProps) {
  return (
    <Frame {...props} title={props.title ?? "No recently viewed products"}>
      <circle cx="80" cy="60" r="44" className="fill-indigo-600/[0.07]" />
      <circle
        cx="80"
        cy="60"
        r="26"
        className="fill-white stroke-indigo-600"
        strokeWidth="2.5"
      />
      <path
        d="M80 46v16l12 8"
        className="stroke-indigo-600"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Frame>
  )
}

export function ErrorIllustration(props: IllustrationProps) {
  return (
    <Frame {...props} title={props.title ?? "Something went wrong"}>
      <circle cx="80" cy="60" r="44" className="fill-indigo-600/[0.07]" />
      <rect
        x="56"
        y="36"
        width="48"
        height="64"
        rx="8"
        className="fill-white stroke-indigo-600"
        strokeWidth="2.5"
      />
      <path
        d="M72 58h16M80 50v20"
        className="stroke-indigo-600/35"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="112" cy="40" r="14" className="fill-white stroke-indigo-600" strokeWidth="2.5" />
      <path
        d="M112 34v8M112 46.5v.5"
        className="stroke-indigo-600"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </Frame>
  )
}
