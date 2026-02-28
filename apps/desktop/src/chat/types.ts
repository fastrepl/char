import type { UIMessage } from "ai";
import { z } from "zod";

import type { ContextRef } from "~/chat/context-item";

const messageMetadataSchema = z.object({
  createdAt: z.number().optional(),
  contextRefs: z
    .array(
      z.object({
        kind: z.literal("session"),
        key: z.string(),
        source: z.enum(["tool", "manual", "auto-current"]).optional(),
        sessionId: z.string(),
      }),
    )
    .optional(),
});

type MessageMetadata = z.infer<typeof messageMetadataSchema>;
export type HyprUIMessage = UIMessage<
  MessageMetadata & { contextRefs?: ContextRef[] }
>;
