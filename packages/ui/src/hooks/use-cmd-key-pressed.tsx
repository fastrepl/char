import { useEffect, useState } from "react";

export function useCmdKeyPressed(): boolean {
  const [isCmdPressed, setIsCmdPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.key === "Meta") {
        setIsCmdPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.metaKey || e.key === "Meta") {
        setIsCmdPressed(false);
      }
    };

    const handleBlur = () => {
      setIsCmdPressed(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  return isCmdPressed;
}
