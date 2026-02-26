import type { UIMessage } from "ai";
import { z } from "zod";

const messageMetadataSchema = z.object({
  createdAt: z.number().optional(),
  contextBlock: z.string().optional(),
});

type MessageMetadata = z.infer<typeof messageMetadataSchema>;
export type HyprUIMessage = UIMessage<MessageMetadata>;
