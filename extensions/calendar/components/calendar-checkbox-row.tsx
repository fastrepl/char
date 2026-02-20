import { store, ui } from "hyprnote";

const { Checkbox } = ui.checkbox;

export function CalendarCheckboxRow({
  id,
  checked,
  onToggle,
}: {
  id: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const calendar = store.UI.useRow("calendars", id, store.STORE_ID);
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={`calendar-${id}`}
        checked={checked}
        onCheckedChange={(v) => onToggle(Boolean(v))}
      />
      <label
        htmlFor={`calendar-${id}`}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
      >
        {(calendar?.name as string) ?? "Untitled"}
      </label>
    </div>
  );
}
