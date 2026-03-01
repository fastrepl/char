import { Nango } from "@nangohq/node";
import { createMiddleware } from "@tanstack/react-start";

import { env, requireEnv } from "@/env";

export const nangoMiddleware = createMiddleware().server(async ({ next }) => {
  const nango = new Nango({
    secretKey: requireEnv(env.NANGO_SECRET_KEY, "NANGO_SECRET_KEY"),
  });
  return next({ context: { nango } });
});
