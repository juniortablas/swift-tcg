import { Flag, ShieldCheck, Zap, Truck } from "lucide-react"

const FEATURES = [
  {
    icon: Flag,
    title: "Direct from Japan",
    description: "Sourced authentic, every week.",
  },
  {
    icon: ShieldCheck,
    title: "Factory Sealed",
    description: "Unopened and guaranteed authentic.",
  },
  {
    icon: Zap,
    title: "Weekly Imports",
    description: "New Japanese drops as they land.",
  },
  {
    icon: Truck,
    title: "Ships from California",
    description: "Fast U.S. shipping with tracking.",
  },
] as const

export default function TrustSection() {
  return (
    <section className="bg-[#eef2ff]">
      <div className="mx-auto max-w-[1920px] px-4 py-5 sm:px-6 sm:py-10 lg:px-8 lg:py-11 xl:px-10">
        <ul className="grid gap-4 sm:grid-cols-2 sm:gap-7 lg:grid-cols-4 lg:gap-6">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <li
              key={title}
              className="flex items-start gap-3.5 lg:justify-center lg:gap-4"
            >
              <Icon
                className="mt-0.5 size-6 shrink-0 text-indigo-600"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <div>
                <h3 className="text-[15px] font-semibold tracking-tight text-black">
                  {title}
                </h3>
                <p className="mt-1 text-sm leading-snug text-black/50">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
