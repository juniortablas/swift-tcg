import { MapPin, Package, Truck, Zap, type LucideIcon } from "lucide-react"

const features: {
  icon: LucideIcon
  title: string
  description: string
}[] = [
  {
    icon: MapPin,
    title: "Direct from Japan",
    description:
      "We source authentic products directly from trusted suppliers in Japan.",
  },
  {
    icon: Package,
    title: "Factory Sealed",
    description:
      "Every product is shipped in factory-sealed condition unless otherwise stated.",
  },
  {
    icon: Zap,
    title: "Weekly Imports",
    description:
      "Stay ahead with Japan's newest releases arriving regularly.",
  },
  {
    icon: Truck,
    title: "Ships from California",
    description:
      "Fast domestic fulfillment with tracking on every order.",
  },
]

export default function TrustSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[86rem] px-6 pt-14 pb-24 sm:pt-20 sm:pb-32">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-black sm:text-4xl">
            Why Swift TCG?
          </h2>
          <p className="mt-5 text-base leading-relaxed text-black/60 sm:text-lg">
            We specialize in bringing the newest Japanese trading card releases
            directly to collectors and stores across the United States.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4 lg:gap-8">
          {features.map((feature) => {
            const Icon = feature.icon

            return (
              <article
                key={feature.title}
                className="group rounded-3xl border border-black/5 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <span
                  className="mb-5 flex size-11 items-center justify-center rounded-2xl bg-green-600/10 text-green-700 transition-transform duration-300 group-hover:scale-110"
                  aria-hidden="true"
                >
                  <Icon className="size-5" strokeWidth={1.75} />
                </span>
                <h3 className="text-lg font-semibold tracking-tight text-black">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-black/60">
                  {feature.description}
                </p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
