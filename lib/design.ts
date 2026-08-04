/**
 * Swift TCG design tokens.
 *
 * Premium, minimal, spacious — inspired by Apple, Linear, Stripe, and Vercel.
 * Human-readable documentation: `styles/THEME.md`.
 *
 * Prefer these constants over hard-coded values so UI stays consistent.
 */

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

/** Hex color string (e.g. `#16A34A`). */
export type HexColor = `#${string}`

/** RGBA / CSS color string for alpha overlays. */
export type CssColor = string

/**
 * Neutral scale — light-first storefront surfaces and ink.
 * Prefer high contrast for primary text (`900` / `950`) and soft fills (`50` / `100`).
 */
export const NEUTRAL = {
  0: "#FFFFFF",
  50: "#FAFAFA",
  100: "#F5F5F5",
  200: "#E5E5E5",
  300: "#D4D4D4",
  400: "#A3A3A3",
  500: "#737373",
  600: "#525252",
  700: "#404040",
  800: "#262626",
  900: "#171717",
  950: "#0A0A0A",
} as const satisfies Record<string, HexColor>

/**
 * Brand green — primary CTAs, links, and quiet accents.
 * Matches the storefront accent used for authenticity / Japan-import signals.
 */
export const BRAND = {
  50: "#F0FDF4",
  100: "#DCFCE7",
  500: "#22C55E",
  600: "#16A34A",
  700: "#15803D",
} as const satisfies Record<string, HexColor>

/** Semantic feedback colors — use sparingly; never as decoration. */
export const SEMANTIC = {
  success: "#16A34A",
  warning: "#D97706",
  error: "#DC2626",
  info: "#2563EB",
} as const satisfies Record<string, HexColor>

/** Black alpha overlays for borders, muted text, and soft hovers on light surfaces. */
export const ALPHA = {
  ink05: "rgba(0, 0, 0, 0.05)",
  ink10: "rgba(0, 0, 0, 0.10)",
  ink40: "rgba(0, 0, 0, 0.40)",
  ink60: "rgba(0, 0, 0, 0.60)",
} as const satisfies Record<string, CssColor>

/**
 * Full color palette.
 *
 * @example
 * ```ts
 * backgroundColor: COLORS.neutral[0]
 * color: COLORS.brand[600]
 * borderColor: COLORS.alpha.ink10
 * ```
 */
export const COLORS = {
  neutral: NEUTRAL,
  brand: BRAND,
  semantic: SEMANTIC,
  alpha: ALPHA,
} as const

export type Colors = typeof COLORS
export type NeutralScale = keyof typeof NEUTRAL
export type BrandScale = keyof typeof BRAND

// ---------------------------------------------------------------------------
// Spacing
// ---------------------------------------------------------------------------

/**
 * Spacing scale (4px base unit), expressed in rem.
 * Use larger steps between sections for a spacious layout.
 */
export const SPACING = {
  0: "0",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
  20: "5rem",
  24: "6rem",
  32: "8rem",
} as const satisfies Record<string, string>

export type Spacing = typeof SPACING
export type SpacingToken = keyof typeof SPACING

// ---------------------------------------------------------------------------
// Border radius
// ---------------------------------------------------------------------------

/**
 * Border radii — soft but restrained (avoid default pill clusters).
 * Reserve `full` for avatars and similar circular controls.
 */
export const BORDER_RADIUS = {
  none: "0",
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  "2xl": "1.25rem",
  full: "9999px",
} as const satisfies Record<string, string>

export type BorderRadius = typeof BORDER_RADIUS
export type BorderRadiusToken = keyof typeof BORDER_RADIUS

// ---------------------------------------------------------------------------
// Shadows
// ---------------------------------------------------------------------------

/**
 * Elevation shadows — single-layer, low contrast.
 * Prefer a hairline border + light shadow over multi-layer glow.
 */
export const SHADOWS = {
  none: "none",
  xs: "0 1px 2px rgba(0, 0, 0, 0.04)",
  sm: "0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)",
  md: "0 4px 12px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)",
  lg: "0 12px 32px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.04)",
  /** Brand-tinted focus ring for interactive elements. */
  focus: "0 0 0 3px rgba(22, 163, 74, 0.25)",
} as const satisfies Record<string, string>

export type Shadows = typeof SHADOWS
export type ShadowToken = keyof typeof SHADOWS

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------

/** Duration tokens in milliseconds (numeric) and CSS (string). */
export const ANIMATION_DURATION_MS = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 400,
  slower: 600,
} as const satisfies Record<string, number>

export const ANIMATION_DURATION = {
  instant: "0ms",
  fast: "150ms",
  normal: "250ms",
  slow: "400ms",
  slower: "600ms",
} as const satisfies Record<string, string>

/**
 * Easing curves — calm, product-quality motion (Linear / Vercel feel).
 * Always honor `prefers-reduced-motion`.
 */
export const ANIMATION_EASING = {
  /** Default UI transitions. */
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  /** Soft settle for entrances and large surfaces. */
  emphasized: "cubic-bezier(0.16, 1, 0.3, 1)",
  /** Quick dismiss / exit. */
  exit: "cubic-bezier(0.4, 0, 1, 1)",
  /** Simple ease-out for hovers and micro-feedback. */
  out: "ease-out",
} as const satisfies Record<string, string>

/**
 * Animation tokens: durations (CSS + ms) and easings.
 *
 * @example
 * ```ts
 * transition: `background-color ${ANIMATION.duration.fast} ${ANIMATION.easing.out}`
 * ```
 */
export const ANIMATION = {
  duration: ANIMATION_DURATION,
  durationMs: ANIMATION_DURATION_MS,
  easing: ANIMATION_EASING,
} as const

export type Animation = typeof ANIMATION
export type AnimationDurationToken = keyof typeof ANIMATION_DURATION
export type AnimationEasingToken = keyof typeof ANIMATION_EASING

// ---------------------------------------------------------------------------
// Composite (optional convenience)
// ---------------------------------------------------------------------------

/**
 * All design tokens in one object — useful for theme providers or docs tooling.
 * Prefer named exports (`COLORS`, `SPACING`, …) at call sites.
 */
export const DESIGN = {
  colors: COLORS,
  spacing: SPACING,
  borderRadius: BORDER_RADIUS,
  shadows: SHADOWS,
  animation: ANIMATION,
} as const

export type Design = typeof DESIGN
