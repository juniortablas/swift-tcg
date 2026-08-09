const MESSAGE =
  "Imported Weekly - Factory Sealed - Direct from Japan"

export default function AnnouncementBar() {
  return (
    <div
      role="region"
      aria-label="Announcement"
      className="flex h-8 w-full items-center justify-center overflow-hidden bg-green-600 text-white sm:h-10"
    >
      <p className="hidden w-full text-center text-xs md:block">{MESSAGE}</p>

      <div className="w-full md:hidden">
        <div className="announcement-bar-track flex w-max whitespace-nowrap">
          <span className="px-6 text-xs leading-10">{MESSAGE}</span>
          <span className="px-6 text-xs leading-10" aria-hidden="true">
            {MESSAGE}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes announcement-bar-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        .announcement-bar-track {
          animation: announcement-bar-scroll 20s linear infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .announcement-bar-track {
            animation: none;
            width: 100%;
            justify-content: center;
          }

          .announcement-bar-track [aria-hidden="true"] {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}
