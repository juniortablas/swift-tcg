/**
 * Branded Back in Stock transactional email (Resend).
 * Visual language matches shopify/notifications templates.
 */

import { formatUsdPrice } from "@/lib/pricing"

export const BIS_EMAIL_SUBJECT = "Your item is back in stock!"

export type BackInStockEmailProduct = {
  title: string
  handle: string
  imageUrl: string | null
  priceAmount: string | null
  priceCurrency: string | null
}

export type SendBackInStockEmailInput = {
  to: string
  product: BackInStockEmailProduct
  storeUrl: string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function formatPrice(product: BackInStockEmailProduct): string {
  if (!product.priceAmount) return ""
  const amount = Number.parseFloat(product.priceAmount)
  if (!Number.isFinite(amount)) return ""
  if (!product.priceCurrency || product.priceCurrency === "USD") {
    return formatUsdPrice(amount)
  }
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: product.priceCurrency,
    }).format(amount)
  } catch {
    return formatUsdPrice(amount)
  }
}

export function buildBackInStockEmailHtml(input: {
  product: BackInStockEmailProduct
  storeUrl: string
}): string {
  const productUrl = `${input.storeUrl.replace(/\/$/, "")}/products/${encodeURIComponent(input.product.handle)}`
  const logoUrl = `${input.storeUrl.replace(/\/$/, "")}/brand/swift-tcg-logo-email.png`
  const title = escapeHtml(input.product.title)
  const price = formatPrice(input.product)
  const image = input.product.imageUrl
    ? escapeHtml(input.product.imageUrl)
    : null

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width">
  <title>${BIS_EMAIL_SUBJECT}</title>
  <style>
    body { margin: 0; padding: 0; background: #ffffff; color: #111111; }
    a { color: #0EA54B; }
  </style>
</head>
<body style="margin:0;padding:0;background:#ffffff;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
          <tr>
            <td style="padding:28px 24px 20px;border-bottom:3px solid #0EA54B;">
              <a href="${escapeHtml(input.storeUrl)}" style="text-decoration:none;">
                <img src="${escapeHtml(logoUrl)}" alt="Swift TCG" width="160" height="49" style="display:block;border:0;outline:none;text-decoration:none;height:auto;max-width:160px;" />
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 24px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.25;font-weight:600;letter-spacing:-0.01em;color:#111111;">
                Your item is back in stock!
              </h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#444444;">
                Good news — a product on your alert list is available again. Quantities can go fast.
              </p>
              ${
                image
                  ? `<img src="${image}" alt="${title}" width="240" style="display:block;width:240px;max-width:100%;height:auto;margin:0 auto 20px;border:0;" />`
                  : ""
              }
              <p style="margin:0 0 6px;font-size:16px;font-weight:600;line-height:1.35;color:#111111;text-align:center;">
                ${title}
              </p>
              ${
                price
                  ? `<p style="margin:0 0 24px;font-size:15px;font-weight:600;color:#111111;text-align:center;">${escapeHtml(price)}</p>`
                  : `<p style="margin:0 0 24px;"></p>`
              }
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
                <tr>
                  <td style="background:#0EA54B;border-radius:6px;">
                    <a href="${escapeHtml(productUrl)}" style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.01em;">
                      Shop Now
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 32px;border-top:1px solid #e8e8e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
              <p style="margin:0 0 8px;font-size:13px;line-height:1.55;color:#666666;">
                Questions? <a href="mailto:support@swifttcg.com" style="color:#0EA54B;text-decoration:none;">support@swifttcg.com</a>
              </p>
              <p style="margin:0;font-size:13px;line-height:1.55;color:#666666;">
                <a href="https://www.swifttcg.com" style="color:#0EA54B;text-decoration:none;">swifttcg.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function isBackInStockEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim())
}

export async function sendBackInStockEmail(
  input: SendBackInStockEmailInput
): Promise<{ id: string | null }> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not configured. Back-in-stock emails cannot be sent."
    )
  }

  const from =
    process.env.BACK_IN_STOCK_FROM_EMAIL?.trim() ||
    "Swift TCG <noreply@swifttcg.com>"

  const html = buildBackInStockEmailHtml({
    product: input.product,
    storeUrl: input.storeUrl,
  })

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: BIS_EMAIL_SUBJECT,
      html,
    }),
  })

  const payload = (await res.json().catch(() => ({}))) as {
    id?: string
    message?: string
    error?: { message?: string }
  }

  if (!res.ok) {
    const message =
      payload.error?.message ||
      payload.message ||
      `Resend error (${res.status})`
    throw new Error(message)
  }

  return { id: payload.id ?? null }
}
