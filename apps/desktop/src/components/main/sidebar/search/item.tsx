import DOMPurify from "dompurify";
import { useCallback, useMemo } from "react";

import { cn } from "@hypr/utils";

import { type SearchResult } from "../../../../contexts/search/ui";
import * as main from "../../../../store/tinybase/store/main";
import { type TabInput, useTabs } from "../../../../store/zustand/tabs";
import { getInitials } from "../../body/contacts/shared";

export function SearchResultItem({
  result,
  isSelected,
}: {
  result: SearchResult;
  isSelected: boolean;
}) {
  const openCurrent = useTabs((state) => state.openCurrent);

  const handleClick = useCallback(() => {
    const tab = getTab(result);
    if (tab) {
      openCurrent(tab);
    }
  }, [openCurrent, result]);

  if (result.type === "human") {
    return (
      <HumanSearchResultItem
        result={result}
        onClick={handleClick}
        isSelected={isSelected}
      />
    );
  }

  if (result.type === "organization") {
    return (
      <OrganizationSearchResultItem
        result={result}
        onClick={handleClick}
        isSelected={isSelected}
      />
    );
  }

  if (result.type === "session") {
    return (
      <SessionSearchResultItem
        result={result}
        onClick={handleClick}
        isSelected={isSelected}
      />
    );
  }

  return null;
}

function HumanSearchResultItem({
  result,
  onClick,
  isSelected,
}: {
  result: SearchResult;
  onClick: () => void;
  isSelected: boolean;
}) {
  const sanitizedTitle = useMemo(
    () =>
      DOMPurify.sanitize(result.titleHighlighted, {
        ALLOWED_TAGS: ["mark"],
        ALLOWED_ATTR: [],
      }),
    [result.titleHighlighted],
  );

  return (
    <button
      data-result-id={result.id}
      onClick={onClick}
      className={cn([
        "w-full px-3 py-2",
        "flex items-start gap-3",
        "hover:bg-neutral-100",
        "rounded-lg transition-colors",
        "text-left",
        isSelected && "bg-neutral-100",
      ])}
    >
      <div
        className={cn([
          "shrink-0 w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center",
        ])}
      >
        <span className={cn(["text-xs font-medium text-neutral-600"])}>
          {getInitials(result.title)}
        </span>
      </div>
      <div className={cn(["flex-1 min-w-0"])}>
        <div
          className={cn([
            "text-sm font-normal truncate [&_mark]:bg-yellow-200 [&_mark]:font-semibold [&_mark]:text-neutral-900",
          ])}
          dangerouslySetInnerHTML={{ __html: sanitizedTitle }}
        />
      </div>
    </button>
  );
}

function OrganizationSearchResultItem({
  result,
  onClick,
  isSelected,
}: {
  result: SearchResult;
  onClick: () => void;
  isSelected: boolean;
}) {
  const humanIds = main.UI.useSliceRowIds(
    main.INDEXES.humansByOrg,
    result.id,
    main.STORE_ID,
  );

  const sanitizedTitle = useMemo(
    () =>
      DOMPurify.sanitize(result.titleHighlighted, {
        ALLOWED_TAGS: ["mark"],
        ALLOWED_ATTR: [],
      }),
    [result.titleHighlighted],
  );

  const memberCount = humanIds.length;
  const memberText = memberCount === 1 ? "1 person" : `${memberCount} people`;

  return (
    <button
      data-result-id={result.id}
      onClick={onClick}
      className={cn([
        "w-full px-3 py-2",
        "flex items-start gap-3",
        "hover:bg-neutral-100",
        "rounded-lg transition-colors",
        "text-left",
        isSelected && "bg-neutral-100",
      ])}
    >
      <div className={cn(["flex-1 min-w-0"])}>
        <div
          className={cn([
            "text-sm font-normal truncate [&_mark]:bg-yellow-200 [&_mark]:font-semibold [&_mark]:text-neutral-900",
          ])}
          dangerouslySetInnerHTML={{ __html: sanitizedTitle }}
        />
        <div className={cn(["text-xs text-neutral-500 truncate mt-0.5"])}>
          {memberText}
        </div>
      </div>
    </button>
  );
}

function SessionSearchResultItem({
  result,
  onClick,
  isSelected,
}: {
  result: SearchResult;
  onClick: () => void;
  isSelected: boolean;
}) {
  const displayTitle = useMemo(() => {
    const sanitized = DOMPurify.sanitize(result.titleHighlighted, {
      ALLOWED_TAGS: ["mark"],
      ALLOWED_ATTR: [],
    });
    if (sanitized.trim()) {
      return sanitized;
    }
    return result.title || "Untitled";
  }, [result.titleHighlighted, result.title]);

  const snippet = useMemo(() => {
    if (!result.content) {
      return "";
    }

    const markRegex = /<mark\b/;
    const markMatch = result.contentHighlighted.match(markRegex);

    if (markMatch) {
      const markPos = markMatch.index!;
      const beforeMark = result.contentHighlighted.substring(0, markPos);
      const contextStart = Math.max(0, beforeMark.length - 60);
      const contextEnd = Math.min(
        result.contentHighlighted.length,
        markPos + 200,
      );

      const snippetText = result.contentHighlighted.substring(
        contextStart,
        contextEnd,
      );
      const prefix = contextStart > 0 ? "..." : "";

      return DOMPurify.sanitize(prefix + snippetText, {
        ALLOWED_TAGS: ["mark"],
        ALLOWED_ATTR: [],
      });
    }

    return DOMPurify.sanitize(result.content.slice(0, 150), {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
  }, [result.contentHighlighted, result.content]);

  const createdAt = new Date(result.created_at);
  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let timeAgo: string;
  if (diffDays === 0) {
    timeAgo = "Today";
  } else if (diffDays === 1) {
    timeAgo = "Yesterday";
  } else if (diffDays < 7) {
    timeAgo = createdAt.toLocaleDateString("en-US", { weekday: "long" });
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    timeAgo = weeks === 1 ? "a week ago" : `${weeks} weeks ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    timeAgo = months === 1 ? "a month ago" : `${months} months ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    timeAgo = years === 1 ? "a year ago" : `${years} years ago`;
  }

  return (
    <button
      data-result-id={result.id}
      onClick={onClick}
      className={cn([
        "w-full px-3 py-2",
        "flex flex-col gap-0.5",
        "hover:bg-neutral-100",
        "rounded-lg transition-colors",
        "text-left",
        "min-w-0",
        isSelected && "bg-neutral-100",
      ])}
    >
      <div
        className={cn([
          "text-sm font-medium text-neutral-900 truncate [&_mark]:bg-yellow-200 [&_mark]:font-semibold",
          "w-full",
        ])}
        dangerouslySetInnerHTML={{ __html: displayTitle }}
      />
      {snippet && (
        <div
          className={cn([
            "text-xs text-neutral-500 line-clamp-2 [&_mark]:bg-yellow-200 [&_mark]:font-semibold [&_mark]:text-neutral-900",
          ])}
          dangerouslySetInnerHTML={{ __html: snippet }}
        />
      )}
      <div className={cn(["text-xs text-neutral-500"])}>{timeAgo}</div>
    </button>
  );
}

function getTab(result: SearchResult): TabInput | null {
  if (result.type === "session") {
    return { type: "sessions", id: result.id };
  }
  if (result.type === "human") {
    return {
      type: "contacts",
      state: { selectedPerson: result.id, selectedOrganization: null },
    };
  }
  if (result.type === "organization") {
    return {
      type: "contacts",
      state: { selectedOrganization: result.id, selectedPerson: null },
    };
  }

  return null;
}
