import { collectSupportContextBlock } from "~/chat/context/support-block";

import { useMCP } from "./useMCP";

export function useSupportMCP(enabled: boolean, accessToken?: string | null) {
  return useMCP({
    enabled,
    endpoint: "/support/mcp",
    clientName: "hyprnote-support-client",
    accessToken,
    promptName: "support_chat",
    collectContext: collectSupportContextBlock,
  });
}
