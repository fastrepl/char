import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { env, requireEnv } from "../env";

const inputSchema = z.object({
  email: z.email(),
  userGroup: z.string().optional(),
  locale: z.string().optional(),
  platform: z.string().optional(),
  source: z.string().optional(),
  intent: z.string().optional(),
  releaseNotesStable: z.boolean().optional(),
  releaseNotesBeta: z.boolean().optional(),
  newsletter: z.boolean().optional(),
});

export const addContact = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data }) => {
    const loopsResponse = await fetch(
      "https://app.loops.so/api/v1/contacts/create",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${requireEnv(env.LOOPS_KEY, "LOOPS_KEY")}`,
        },
        body: JSON.stringify({
          email: data.email,
          userGroup: data.userGroup,
          locale: data.locale,
          source: data.source,
          intent: data.intent,
          platform: data.platform,
          releaseNotesStable: data.releaseNotesStable,
          releaseNotesBeta: data.releaseNotesBeta,
          newsletter: data.newsletter,
        }),
      },
    );

    if (!loopsResponse.ok) {
      const error = await loopsResponse.json();
      console.error("Error creating contact:", error);
      throw new Error(error.message || "Failed to create contact");
    }

    return { success: true };
  });
