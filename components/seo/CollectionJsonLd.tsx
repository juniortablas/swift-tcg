import JsonLd from "@/components/seo/JsonLd"
import {
  breadcrumbListJsonLd,
  collectionPageJsonLd,
  type BreadcrumbItem,
} from "@/lib/seo"

export default function CollectionJsonLd({
  name,
  description,
  path,
  image,
  breadcrumbs,
}: {
  name: string
  description: string
  path: string
  image?: string | null
  breadcrumbs: BreadcrumbItem[]
}) {
  return (
    <JsonLd
      data={[
        collectionPageJsonLd({ name, description, path, image }),
        breadcrumbListJsonLd(breadcrumbs),
      ]}
    />
  )
}
