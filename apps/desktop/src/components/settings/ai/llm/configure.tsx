import { HelpCircle } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@hypr/ui/components/ui/accordion";
import { cn } from "@hypr/utils";

import { useBillingAccess } from "../../../../billing";
import { NonHyprProviderCard, StyledStreamdown } from "../shared";
import { useLlmSettings } from "./context";
import { ProviderId, PROVIDERS } from "./shared";

export function ConfigureProviders() {
  const { accordionValue, setAccordionValue } = useLlmSettings();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-md font-semibold font-serif">
          Configure Providers
        </h3>
        <a
          href="https://hyprnote.com/docs/faq/local-llm-setup"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-neutral-400 hover:underline flex items-center gap-1"
        >
          <span>Local setup guide</span>
          <HelpCircle className="size-3" />
        </a>
      </div>
      <Accordion
        type="single"
        collapsible
        className="flex flex-col gap-3"
        value={accordionValue}
        onValueChange={setAccordionValue}
      >
        <HyprProviderCard
          providerId="hyprnote"
          providerName="Hyprnote"
          icon={
            <img src="/assets/icon.png" alt="Hyprnote" className="size-5" />
          }
        />
        {PROVIDERS.filter((provider) => provider.id !== "hyprnote").map(
          (provider) => (
            <NonHyprProviderCard
              key={provider.id}
              config={provider}
              providerType="llm"
              providers={PROVIDERS}
              providerContext={<ProviderContext providerId={provider.id} />}
            />
          ),
        )}
      </Accordion>
    </div>
  );
}

function HyprProviderCard({
  providerId,
  providerName,
  icon,
}: {
  providerId: ProviderId;
  providerName: string;
  icon: React.ReactNode;
}) {
  const { hyprAccordionRef, shouldHighlight } = useLlmSettings();

  return (
    <AccordionItem
      ref={hyprAccordionRef}
      value={providerId}
      className={cn([
        "rounded-xl border-2 bg-neutral-50",
        "border-solid border-neutral-300",
      ])}
    >
      <AccordionTrigger className="capitalize gap-2 px-4 hover:no-underline">
        <div className="flex items-center gap-2">
          {icon}
          <span>{providerName}</span>
          <span className="text-xs text-neutral-500 font-light border border-neutral-300 rounded-full px-2">
            Recommended
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4">
        <ProviderContext providerId={providerId} highlight={shouldHighlight} />
      </AccordionContent>
    </AccordionItem>
  );
}

function ProviderContext({
  providerId,
  highlight,
}: {
  providerId: ProviderId;
  highlight?: boolean;
}) {
  const { isPro, canStartTrial, upgradeToPro } = useBillingAccess();

  const content =
    providerId === "hyprnote"
      ? "A curated set of models we continuously test to provide the **best performance & reliability**."
      : providerId === "lmstudio"
        ? "- Ensure LM Studio server is **running.** (Default port is 1234)\n- Enable **CORS** in LM Studio config.\n\nSee our [setup guide](https://hyprnote.com/docs/faq/local-llm-setup/#lm-studio-setup) for detailed instructions."
        : providerId === "ollama"
          ? "- Ensure Ollama is **running** (`ollama serve`)\n- Pull a model first (`ollama pull llama3.2`)\n\nSee our [setup guide](https://hyprnote.com/docs/faq/local-llm-setup/#ollama-setup) for detailed instructions."
          : providerId === "custom"
            ? "We only support **OpenAI-compatible** endpoints for now."
            : providerId === "openrouter"
              ? "We filter out models from the combobox based on heuristics like **input modalities** and **tool support**."
              : providerId === "google_generative_ai"
                ? "Visit [AI Studio](https://aistudio.google.com/api-keys) to create an API key."
                : "";

  const buttonLabel = canStartTrial.data
    ? "Start Free Trial"
    : "Upgrade to Pro";

  if (providerId === "hyprnote" && !isPro) {
    return (
      <div className="flex flex-col gap-3">
        <StyledStreamdown>{content}</StyledStreamdown>
        <button
          onClick={upgradeToPro}
          className={cn([
            "relative overflow-hidden w-fit h-8.5",
            "px-4 rounded-full text-xs font-mono text-center",
            "bg-linear-to-t from-stone-600 to-stone-500 text-white",
            "shadow-xs hover:shadow-md",
            "transition-all duration-150",
            "hover:scale-[102%] active:scale-[98%]",
            "flex items-center justify-center gap-2",
          ])}
        >
          {highlight && (
            <div
              className={cn([
                "absolute inset-0",
                "bg-linear-to-r from-transparent via-white/30 to-transparent",
                "animate-shimmer",
              ])}
            />
          )}
          <span className="relative">{buttonLabel}</span>
        </button>
      </div>
    );
  }

  if (!content) {
    return null;
  }

  return <StyledStreamdown>{content}</StyledStreamdown>;
}
