import Image from "next/image"

import { cn } from "@/lib/utils"

/** Intrinsic size of `/brand/swift-tcg-logo.png`. */
export const BRAND_LOGO_INTRINSIC = { width: 709, height: 216 } as const

export const BRAND_LOGO_SRC = "/brand/swift-tcg-logo.png"
export const BRAND_MARK_SRC = "/brand/swift-tcg-mark.png"

/** Hosted email lockup (~320px wide) for transactional / Messaging HTML. */
export const BRAND_LOGO_EMAIL_PATH = "/brand/swift-tcg-logo-email.png"

type BrandLogoProps = {
  className?: string
  /** Display height in CSS pixels. Width scales from the lockup aspect ratio. */
  height?: number
  priority?: boolean
  /** Icon-only mark (card + S) instead of the full lockup. */
  mark?: boolean
}

/**
 * Official Swift TCG logo lockup (or favicon mark). The lockup is dark ink +
 * green accents on transparent — use on light surfaces. The mark (`mark`) is
 * the white-on-black favicon square.
 */
export default function BrandLogo({
  className,
  height = 36,
  priority = false,
  mark = false,
}: BrandLogoProps) {
  if (mark) {
    return (
      <Image
        src={BRAND_MARK_SRC}
        alt="Swift TCG"
        width={height}
        height={height}
        className={cn("object-contain", className)}
        style={{ width: height, height }}
        priority={priority}
      />
    )
  }

  const width = Math.round(
    (BRAND_LOGO_INTRINSIC.width / BRAND_LOGO_INTRINSIC.height) * height
  )

  return (
    <Image
      src={BRAND_LOGO_SRC}
      alt="Swift TCG"
      width={width}
      height={height}
      className={cn("object-contain", className)}
      style={{ width, height }}
      priority={priority}
    />
  )
}
