import { store, tabs, ui } from "hyprnote";

import { StickyNoteIcon } from "./icons";

const { Button } = ui.button;
const { useTabs } = tabs;

export function DaySession({ sessionId }: { sessionId: string }) {
  const session = store.UI.useRow("sessions", sessionId, store.STORE_ID);
  const openNew = useTabs((state) => state.openNew);

  const eventId = session?.event_id ?? "";
  const event = store.UI.useRow("events", eventId as string, store.STORE_ID);

  const handleClick = () => {
    openNew({ type: "sessions", id: sessionId });
  };

  return (
    <Button
      variant="ghost"
      className="w-full justify-start px-1 text-neutral-600 h-6"
      onClick={handleClick}
    >
      <StickyNoteIcon />
      <p className="truncate">
        {event && eventId
          ? (event.title as string)
          : (session?.title as string) || "Untitled"}
      </p>
    </Button>
  );
}
