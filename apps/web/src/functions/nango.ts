import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { nangoMiddleware } from "@/middleware/nango";

const CreateConnectSessionInput = z.object({
  userId: z.string().min(1),
  userEmail: z.email().optional(),
  userName: z.string().optional(),
  organizationId: z.string().optional(),
  allowedIntegrations: z.array(z.string()).optional(),
});

export const nangoCreateConnectSession = createServerFn({ method: "POST" })
  .middleware([nangoMiddleware])
  .inputValidator(CreateConnectSessionInput)
  .handler(async ({ context, data }) => {
    const { nango } = context;

    const tags: Record<string, string> = {
      end_user_id: data.userId,
    };
    if (data.userEmail) {
      tags.end_user_email = data.userEmail;
    }
    if (data.organizationId) {
      tags.organization_id = data.organizationId;
    }

    const res = await nango.createConnectSession({
      end_user: {
        id: data.userId,
        email: data.userEmail,
        display_name: data.userName,
        tags,
      },
      allowed_integrations: data.allowedIntegrations,
    });

    return {
      sessionToken: res.data.token,
    };
  });
