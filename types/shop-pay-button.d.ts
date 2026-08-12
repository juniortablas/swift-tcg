import "react"

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "shop-pay-button": {
        "store-url": string
        variants: string
        channel?: "headless" | "hydrogen"
      }
    }
  }
}
