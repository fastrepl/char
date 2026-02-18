import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";

interface SearchContextValue {
  query: string;
  isVisible: boolean;
  currentMatchIndex: number;
  totalMatches: number;
  activeMatchId: string | null;
  onNext: () => void;
  onPrev: () => void;
  close: () => void;
  setQuery: (query: string) => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function useTranscriptSearch() {
  return useContext(SearchContext);
}

function getMatchingElements(
  container: HTMLElement | null,
  query: string,
): HTMLElement[] {
  if (!container || !query) {
    return [];
  }

  const normalizedQuery = query.trim().toLowerCase().normalize("NFC");
  if (!normalizedQuery) return [];

  const allSpans = Array.from(
    container.querySelectorAll<HTMLElement>("[data-word-id]"),
  );
  if (allSpans.length === 0) return [];

  // Build concatenated text from all spans, tracking each span's position
  const spanPositions: { start: number; end: number }[] = [];
  let fullText = "";

  for (let i = 0; i < allSpans.length; i++) {
    const text = (allSpans[i].textContent || "").normalize("NFC");
    if (i > 0) fullText += " ";
    const start = fullText.length;
    fullText += text;
    spanPositions.push({ start, end: fullText.length });
  }

  const lowerFullText = fullText.toLowerCase();
  const result: HTMLElement[] = [];
  let searchFrom = 0;

  while (searchFrom <= lowerFullText.length - normalizedQuery.length) {
    const idx = lowerFullText.indexOf(normalizedQuery, searchFrom);
    if (idx === -1) break;

    // Find the span containing the start of this match
    for (let i = 0; i < spanPositions.length; i++) {
      const { start, end } = spanPositions[i];
      if (idx >= start && idx < end) {
        result.push(allSpans[i]);
        break;
      }
      // Match starts in the space between spans
      if (
        i < spanPositions.length - 1 &&
        idx >= end &&
        idx < spanPositions[i + 1].start
      ) {
        result.push(allSpans[i + 1]);
        break;
      }
    }

    searchFrom = idx + 1;
  }

  return result;
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  const ensureContainer = useCallback(() => {
    if (typeof document === "undefined") {
      containerRef.current = null;
      return null;
    }

    const current = containerRef.current;
    if (current && document.body.contains(current)) {
      return current;
    }

    const next = document.querySelector<HTMLElement>(
      "[data-transcript-container]",
    );
    containerRef.current = next;
    return next;
  }, []);

  const close = useCallback(() => {
    setIsVisible(false);
  }, []);

  useHotkeys(
    "mod+f",
    (event) => {
      event.preventDefault();
      const container = ensureContainer();
      if (!container) {
        return;
      }

      setIsVisible((prev) => !prev);
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [ensureContainer],
  );

  useHotkeys(
    "esc",
    () => {
      close();
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [close],
  );

  useEffect(() => {
    if (!isVisible) {
      setQuery("");
      setCurrentMatchIndex(0);
      setActiveMatchId(null);
    }
  }, [isVisible]);

  useEffect(() => {
    const container = ensureContainer();
    if (!container || !query) {
      setTotalMatches(0);
      setCurrentMatchIndex(0);
      setActiveMatchId(null);
      return;
    }

    const matches = getMatchingElements(container, query);
    setTotalMatches(matches.length);
    setCurrentMatchIndex(0);
    setActiveMatchId(matches[0]?.dataset.wordId || null);
  }, [query, ensureContainer]);

  const onNext = useCallback(() => {
    const container = ensureContainer();
    if (!container) {
      return;
    }

    const matches = getMatchingElements(container, query);
    if (matches.length === 0) {
      return;
    }

    const nextIndex = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIndex);
    setActiveMatchId(matches[nextIndex]?.dataset.wordId || null);
  }, [ensureContainer, query, currentMatchIndex]);

  const onPrev = useCallback(() => {
    const container = ensureContainer();
    if (!container) {
      return;
    }

    const matches = getMatchingElements(container, query);
    if (matches.length === 0) {
      return;
    }

    const prevIndex = (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(prevIndex);
    setActiveMatchId(matches[prevIndex]?.dataset.wordId || null);
  }, [ensureContainer, query, currentMatchIndex]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const container = ensureContainer();
    if (!container) {
      setIsVisible(false);
    }
  }, [isVisible, ensureContainer]);

  useEffect(() => {
    if (!isVisible || !activeMatchId) {
      return;
    }

    const container = ensureContainer();
    if (!container) {
      return;
    }

    const element = container.querySelector<HTMLElement>(
      `[data-word-id="${activeMatchId}"]`,
    );

    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isVisible, activeMatchId, ensureContainer]);

  const value = useMemo(
    () => ({
      query,
      isVisible,
      currentMatchIndex,
      totalMatches,
      activeMatchId,
      onNext,
      onPrev,
      close,
      setQuery,
    }),
    [
      query,
      isVisible,
      currentMatchIndex,
      totalMatches,
      activeMatchId,
      onNext,
      onPrev,
      close,
    ],
  );

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}
