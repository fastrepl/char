import { createClient } from "@supabase/supabase-js";
import { createMiddleware } from "@tanstack/react-start";

import { env, requireEnv } from "@/env";

export const supabaseAuthMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace(/^bearer /i, "");

    if (!token) {
      throw new Response(
        JSON.stringify({ error: "missing_authorization_header" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(
      requireEnv(env.SUPABASE_URL, "SUPABASE_URL"),
      requireEnv(env.SUPABASE_ANON_KEY, "SUPABASE_ANON_KEY"),
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
      },
    );

    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      throw new Response(
        JSON.stringify({ error: "invalid_authorization_header" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return next({ context: { supabase, user: data.user } });
  },
);
