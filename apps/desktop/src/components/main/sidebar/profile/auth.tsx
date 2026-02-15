import { LogIn } from "lucide-react";
import { useCallback } from "react";

import { useTabs } from "../../../../store/zustand/tabs";

export function AuthSection({
  isAuthenticated,
  onClose,
}: {
  isAuthenticated: boolean;
  onClose: () => void;
}) {
  const openNew = useTabs((state) => state.openNew);

  const handleOpenSettings = useCallback(() => {
    openNew({ type: "settings" });
    onClose();
  }, [openNew, onClose]);

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="px-3 pt-2 pb-1">
      <button
        onClick={handleOpenSettings}
        className="flex w-full items-center justify-center gap-2 h-10 rounded-full bg-linear-to-b from-stone-700 to-stone-800 hover:from-stone-600 hover:to-stone-700 text-white text-sm font-medium border-2 border-stone-600 shadow-[0_4px_14px_rgba(87,83,78,0.4)] transition-all duration-200"
      >
        <LogIn size={16} />
        Sign in
      </button>
    </div>
  );
}
