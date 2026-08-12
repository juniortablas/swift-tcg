import * as Sentry from "@sentry/nextjs"

import {
  getReplaysOnErrorSampleRate,
  getReplaysSessionSampleRate,
  getSentryDsn,
} from "./lib/observability/config"
import { getSharedSentryOptions } from "./lib/observability/options"

const dsn = getSentryDsn()

if (dsn) {
  Sentry.init({
    ...getSharedSentryOptions(),
    dsn,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],
    replaysSessionSampleRate: getReplaysSessionSampleRate(),
    replaysOnErrorSampleRate: getReplaysOnErrorSampleRate(),
  })
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
