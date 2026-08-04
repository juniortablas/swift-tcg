import { Button } from "@/components/ui/button"

export default function Hero() {
  return (
    <section className="flex min-h-screen items-center bg-white">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:gap-16 lg:py-0">
        <div className="flex flex-col items-start">
          <span className="mb-6 inline-flex items-center rounded-full border border-green-600/20 bg-green-600/10 px-3 py-1 text-xs font-medium tracking-wide text-green-600">
            🇯🇵 Direct from Japan
          </span>

          <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl lg:text-6xl lg:leading-[1.1]">
            Authentic Japanese
            <br />
            Trading Cards.
          </h1>

          <p className="mt-6 max-w-md text-base leading-relaxed text-black/60 sm:text-lg">
            Factory-sealed Pokémon, One Piece, and premium TCG products imported
            directly from trusted suppliers in Japan.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="h-11 bg-green-600 px-6 text-white hover:bg-green-600/90"
            >
              Shop Now
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 border-black/10 px-6 text-black hover:bg-black/5"
            >
              View Preorders
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="flex aspect-[4/5] w-full max-w-md items-center justify-center rounded-2xl border border-black/5 bg-neutral-50 shadow-sm sm:aspect-square lg:max-w-none">
            <p className="text-sm font-medium tracking-wide text-black/40">
              Premium Product Showcase
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
