import { cn } from "@/lib/utils"

type RichHtmlProps = {
  html: string
  className?: string
}

/**
 * Renders sanitized Shopify HTML with storefront prose styles.
 */
export default function RichHtml({ html, className }: RichHtmlProps) {
  if (!html.trim()) return null

  return (
    <div
      className={cn(
        "content-prose text-[15px] leading-relaxed text-black/65 dark:text-white/65",
        "[&_a]:font-medium [&_a]:text-green-700 [&_a]:underline-offset-2 hover:[&_a]:underline dark:[&_a]:text-green-400",
        "[&_blockquote]:my-4 [&_blockquote]:rounded-2xl [&_blockquote]:border [&_blockquote]:border-green-600/20 [&_blockquote]:bg-[#f3faf5] [&_blockquote]:px-4 [&_blockquote]:py-3.5 [&_blockquote]:text-sm [&_blockquote]:leading-relaxed [&_blockquote]:text-black/70 dark:[&_blockquote]:border-green-500/25 dark:[&_blockquote]:bg-green-500/[0.06] dark:[&_blockquote]:text-white/70",
        "[&_blockquote_p]:my-0",
        "[&_blockquote_strong]:text-black/85 dark:[&_blockquote_strong]:text-white/85",
        "[&_code]:rounded [&_code]:bg-black/[0.04] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.9em] dark:[&_code]:bg-white/10",
        "[&_h1]:mt-8 [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-black dark:[&_h1]:text-white",
        "[&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-black dark:[&_h2]:text-white",
        "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:tracking-tight [&_h3]:text-black dark:[&_h3]:text-white",
        "[&_h4]:mt-5 [&_h4]:mb-2 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-black dark:[&_h4]:text-white",
        "[&_hr]:my-8 [&_hr]:border-black/[0.08] dark:[&_hr]:border-white/10",
        "[&_li]:my-1.5",
        "[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5",
        "[&_p]:my-3 [&_p]:leading-relaxed",
        "[&_strong]:font-semibold [&_strong]:text-black/85 dark:[&_strong]:text-white/85",
        "[&_table]:my-6 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm",
        "[&_td]:border [&_td]:border-black/[0.08] [&_td]:px-3 [&_td]:py-2 dark:[&_td]:border-white/10",
        "[&_th]:border [&_th]:border-black/[0.08] [&_th]:bg-black/[0.02] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold dark:[&_th]:border-white/10 dark:[&_th]:bg-white/5",
        "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5",
        "[&>:first-child]:mt-0",
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
