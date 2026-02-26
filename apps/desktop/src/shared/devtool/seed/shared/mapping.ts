import { DEFAULT_USER_ID, id } from "~/shared/utils";

import type { MappingSessionParticipant, MappingTagSession } from "@hypr/store";

export const createMappingSessionParticipant = (
  session_id: string,
  human_id: string,
) => ({
  id: id(),
  data: {
    user_id: DEFAULT_USER_ID,
    session_id,
    human_id,
  } satisfies MappingSessionParticipant,
});

export const createMappingTagSession = (
  tag_id: string,
  session_id: string,
) => ({
  id: id(),
  data: {
    user_id: DEFAULT_USER_ID,
    tag_id,
    session_id,
  } satisfies MappingTagSession,
});
