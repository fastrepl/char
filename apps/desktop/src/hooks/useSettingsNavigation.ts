import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";

const ITEM_SELECTOR = "[data-settings-item]";
const ACTIVATE_SELECTOR = "[data-settings-activate]";
const FALLBACK_ACTIVATE_SELECTOR =
  'button, [role="switch"], [role="combobox"], input, select, textarea, [tabindex="0"]';

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return true;
  if (el.isContentEditable) return true;
  return false;
}

function hasOpenPopover(): boolean {
  return (
    document.querySelector(
      '[aria-expanded="true"], [data-state="open"][role="dialog"]',
    ) !== null
  );
}

function getItems(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
}

function getActivator(item: HTMLElement): HTMLElement | null {
  return (
    item.querySelector<HTMLElement>(ACTIVATE_SELECTOR) ??
    item.querySelector<HTMLElement>(FALLBACK_ACTIVATE_SELECTOR)
  );
}

function setHighlight(container: HTMLElement, index: number) {
  const items = getItems(container);
  for (const item of items) {
    item.removeAttribute("data-active");
  }

  if (index >= 0 && index < items.length) {
    items[index].setAttribute("data-active", "true");
    items[index].scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

export function useSettingsNavigation(
  scrollRef: RefObject<HTMLElement | null>,
  panelKey: string,
) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  useEffect(() => {
    setActiveIndex(-1);
    const container = scrollRef.current;
    if (container) {
      setHighlight(container, -1);
    }
  }, [panelKey, scrollRef]);

  useEffect(() => {
    const container = scrollRef.current;
    if (container) {
      setHighlight(container, activeIndex);
    }
  }, [activeIndex, scrollRef]);

  const navigate = useCallback(
    (direction: "up" | "down") => {
      const container = scrollRef.current;
      if (!container) return;
      if (isEditableTarget(document.activeElement)) return;
      if (hasOpenPopover()) return;

      const items = getItems(container);
      if (items.length === 0) return;

      const current = activeIndexRef.current;

      if (direction === "down") {
        setActiveIndex(current < items.length - 1 ? current + 1 : current);
      } else {
        setActiveIndex(current > 0 ? current - 1 : 0);
      }
    },
    [scrollRef],
  );

  const activate = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    if (isEditableTarget(document.activeElement)) return;
    if (hasOpenPopover()) return;

    const items = getItems(container);
    const current = activeIndexRef.current;
    if (current < 0 || current >= items.length) return;

    const activator = getActivator(items[current]);
    if (activator) {
      activator.click();
    }
  }, [scrollRef]);

  useHotkeys(
    "down",
    (e) => {
      if (isEditableTarget(document.activeElement) || hasOpenPopover()) return;
      e.preventDefault();
      navigate("down");
    },
    { enableOnFormTags: false },
    [navigate],
  );

  useHotkeys(
    "up",
    (e) => {
      if (isEditableTarget(document.activeElement) || hasOpenPopover()) return;
      e.preventDefault();
      navigate("up");
    },
    { enableOnFormTags: false },
    [navigate],
  );

  useHotkeys(
    "space, enter",
    (e) => {
      if (activeIndexRef.current < 0) return;
      e.preventDefault();
      activate();
    },
    { enableOnFormTags: false },
    [activate],
  );

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const item = target.closest<HTMLElement>(ITEM_SELECTOR);
      if (!item) return;

      const items = getItems(container);
      const index = items.indexOf(item);
      if (index >= 0) {
        setActiveIndex(index);
      }
    };

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [scrollRef, panelKey]);

  return { activeIndex };
}
