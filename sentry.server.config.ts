import * as Sentry from "@sentry/nextjs"

import { getSentryDsn } from "./lib/observability/config"
import { getSharedSentryOptions } from "./lib/observability/options"

const dsn = getSentryDsn()

if (dsn) {
  Sentry.init({
    ...getSharedSentryOptions(),
    dsn,
  })
}
