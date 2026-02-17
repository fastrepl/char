import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getSupabaseServerClient } from "@/functions/supabase";
import { nangoMiddleware } from "@/middleware/nango";

const CreateConnectSessionInput = z.object({
  allowedIntegrations: z.array(z.string()).optional(),
});

export const nangoCreateConnectSession = createServerFn({ method: "POST" })
  .middleware([nangoMiddleware])
  .inputValidator(CreateConnectSessionInput)
  .handler(async ({ context, data }) => {
    const { nango } = context;

    const supabase = getSupabaseServerClient();
    const { data: userData, error } = await supabase.auth.getUser();
    if (error || !userData.user) {
      throw new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;

    const tags: Record<string, string> = {
      end_user_id: userId,
    };
    if (userEmail) {
      tags.end_user_email = userEmail;
    }

    const res = await nango.createConnectSession({
      end_user: {
        id: userId,
        email: userEmail,
        tags,
      },
      allowed_integrations: data.allowedIntegrations,
    });

    return {
      sessionToken: res.data.token,
    };
  });
