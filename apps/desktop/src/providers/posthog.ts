import posthog from "posthog-js";

import { env } from "~/env";

const key = env.VITE_POSTHOG_API_KEY;

if (key) {
  posthog.init(key, {
    api_host: env.VITE_POSTHOG_HOST,

    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,

    disable_session_recording: true,

    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "*",
    },
  });
}
