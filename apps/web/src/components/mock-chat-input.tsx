import { Icon } from "@iconify-icon/react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@hypr/utils";

const DEFAULT_PROMPTS = [
  "What are my action items from that meeting?",
  "Summarize the key decisions we made today",
  "What did Sarah say about the project timeline?",
  "List all tasks assigned to me this week",
  "What were the main blockers discussed?",
];

export function MockChatInput({
  prompts = DEFAULT_PROMPTS,
  typingSpeed = 40,
  pauseBetween = 2000,
  className,
}: {
  prompts?: string[];
  typingSpeed?: number;
  pauseBetween?: number;
  className?: string;
}) {
  const [displayText, setDisplayText] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let charIndex = 0;
    const currentPrompt = prompts[promptIndex];

    const typeNext = () => {
      if (charIndex < currentPrompt.length) {
        charIndex++;
        setDisplayText(currentPrompt.slice(0, charIndex));
        timeoutRef.current = setTimeout(typeNext, typingSpeed);
      } else {
        setIsTyping(false);
        timeoutRef.current = setTimeout(() => {
          setDisplayText("");
          setIsTyping(true);
          setPromptIndex((prev) => (prev + 1) % prompts.length);
        }, pauseBetween);
      }
    };

    setIsTyping(true);
    timeoutRef.current = setTimeout(typeNext, 400);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [promptIndex, prompts, typingSpeed, pauseBetween]);

  return (
    <div
      className={cn([
        "flex flex-col bg-linear-to-t from-stone-100 to-white shadow-lg hover:shadow-2xl transition-all duration-300 border border-neutral-200 overflow-hidden",
        "w-full max-w-lg rounded-xl min-h-32 p-4",
        className,
      ])}
    >
      <div className="flex-1 min-h-[24px] text-md text-stone-600 flex justify-start">
        {displayText}
        {isTyping && (
          <span className="inline-block w-[2px] h-[24px] bg-blue-400 align-middle ml-[1px] animate-pulse" />
        )}
      </div>

      <div className="flex w-full justify-end">
        <div
          className={cn([
            "flex items-center justify-center size-7 rounded-lg shrink-0 transition-colors",
            displayText
              ? "bg-stone-600 text-white"
              : "bg-neutral-100 text-neutral-300",
          ])}
        >
          <Icon icon="mdi:arrow-up" className="text-base" />
        </div>
      </div>
    </div>
  );
}
