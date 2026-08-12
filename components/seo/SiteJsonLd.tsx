import JsonLd from "@/components/seo/JsonLd"
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo"

/** Sitewide Organization + WebSite (with SearchAction) JSON-LD. */
export default function SiteJsonLd() {
  return <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
}
