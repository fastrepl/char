import { createMiddleware } from "@tanstack/react-start";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env, requireEnv } from "@/env";

export const drizzleMiddleware = createMiddleware().server(async ({ next }) => {
  const client = postgres(requireEnv(env.DATABASE_URL, "DATABASE_URL"), {
    prepare: false,
  });
  const db = drizzle({ client });

  return next({
    context: {
      db,
    },
  });
});
