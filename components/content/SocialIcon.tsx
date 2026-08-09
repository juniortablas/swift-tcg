import type { SocialPlatform } from "@/types/content"

const ICON_CLASS = "size-4"

export default function SocialIcon({
  platform,
}: {
  platform: SocialPlatform
}) {
  switch (platform) {
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" className={ICON_CLASS} fill="none" aria-hidden="true">
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="5"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.75" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
        </svg>
      )
    case "x":
      return (
        <svg viewBox="0 0 24 24" className={ICON_CLASS} fill="currentColor" aria-hidden="true">
          <path d="M13.8 10.5 20.3 3h-1.6l-5.6 6.5L8.5 3H3.2l6.8 9.9L3.2 21h1.6l6-6.9L15.4 21h5.3l-7-10.5Zm-2.1 2.5-.7-1L5.3 4.2h2.4l4.5 6.4.7 1 5.9 8.3h-2.4l-5-7.1Z" />
        </svg>
      )
    case "discord":
      return (
        <svg viewBox="0 0 24 24" className={ICON_CLASS} fill="currentColor" aria-hidden="true">
          <path d="M19.3 5.2A16.4 16.4 0 0 0 15.4 4l-.2.4a14.7 14.7 0 0 1 3.5 1.3 12.8 12.8 0 0 0-11.4 0A14.7 14.7 0 0 1 10.6 4L10.4 4a16.4 16.4 0 0 0-3.9 1.2C3.4 9 2.7 12.7 3 16.4a16.6 16.6 0 0 0 5 2.5l.6-.9a10.7 10.7 0 0 1-1.6-.8l.4-.3c3.2 1.5 6.7 1.5 9.8 0l.4.3c-.5.3-1 .6-1.6.8l.6.9a16.6 16.6 0 0 0 5-2.5c.4-4.2-.6-7.8-2.7-11.2ZM9.7 14.4c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm4.6 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" />
        </svg>
      )
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" className={ICON_CLASS} fill="currentColor" aria-hidden="true">
          <path d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C17.9 5 12 5 12 5s-5.9 0-7.7.3a2.7 2.7 0 0 0-1.9 1.9A28 28 0 0 0 2 12a28 28 0 0 0 .4 4.8 2.7 2.7 0 0 0 1.9 1.9C6.1 19 12 19 12 19s5.9 0 7.7-.3a2.7 2.7 0 0 0 1.9-1.9A28 28 0 0 0 22 12a28 28 0 0 0-.4-4.8ZM10 15.2V8.8L15.5 12 10 15.2Z" />
        </svg>
      )
    default:
      return null
  }
}
