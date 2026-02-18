import { useForm } from "@tanstack/react-form";
import { useMemo } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hypr/ui/components/ui/select";
import { cn } from "@hypr/utils";

import { useAuth } from "../../../../auth";
import { useBillingAccess } from "../../../../billing";
import { useConfigValues } from "../../../../config/use-config";
import * as settings from "../../../../store/tinybase/store/settings";
import { providerRowId } from "../shared";
import {
  getProviderSelectionBlockers,
  requiresEntitlement,
} from "../shared/eligibility";
import { listAnthropicModels } from "../shared/list-anthropic";
import {
  type InputModality,
  type ListModelsResult,
} from "../shared/list-common";
import { listGoogleModels } from "../shared/list-google";
import { listLMStudioModels } from "../shared/list-lmstudio";
import { listMistralModels } from "../shared/list-mistral";
import { listOllamaModels } from "../shared/list-ollama";
import { listGenericModels, listOpenAIModels } from "../shared/list-openai";
import { listOpenRouterModels } from "../shared/list-openrouter";
import { ModelCombobox } from "../shared/model-combobox";
import { HealthStatusIndicator, useConnectionHealth } from "./health";
import { PROVIDERS } from "./shared";

export function SelectProviderAndModel() {
  const configuredProviders = useConfiguredMapping();

  const { current_llm_model, current_llm_provider } = useConfigValues([
    "current_llm_model",
    "current_llm_provider",
  ] as const);

  const health = useConnectionHealth();
  const isConfigured = !!(current_llm_provider && current_llm_model);
  const hasError = isConfigured && health.status === "error";

  const handleSelectProvider = settings.UI.useSetValueCallback(
    "current_llm_provider",
    (provider: string) => provider,
    [],
    settings.STORE_ID,
  );
  const handleSelectModel = settings.UI.useSetValueCallback(
    "current_llm_model",
    (model: string) => model,
    [],
    settings.STORE_ID,
  );

  const form = useForm({
    defaultValues: {
      provider: current_llm_provider || "",
      model: current_llm_model || "",
    },
    listeners: {
      onChange: ({ formApi }) => {
        const {
          form: { errors },
        } = formApi.getAllErrors();
        if (errors.length > 0) {
          console.log(errors);
        }

        void formApi.handleSubmit();
      },
    },
    onSubmit: ({ value }) => {
      handleSelectProvider(value.provider);
      handleSelectModel(value.model);
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-md font-semibold font-serif">Model being used</h3>
      <div
        className={cn([
          "flex flex-col gap-4",
          "p-4 rounded-xl border border-neutral-200",
          !isConfigured || hasError ? "bg-red-50" : "bg-neutral-50",
        ])}
      >
        <div className="flex flex-row items-center gap-4">
          <form.Field
            name="provider"
            listeners={{
              onChange: ({ value }) => {
                if (value === "hyprnote") {
                  form.setFieldValue("model", "Auto");
                } else {
                  form.setFieldValue("model", "");
                }
              },
            }}
          >
            {(field) => (
              <div className="flex-2 min-w-0" data-llm-provider-selector>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value)}
                >
                  <SelectTrigger className="bg-white shadow-none focus:ring-0">
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((provider) => {
                      const status = configuredProviders[provider.id];

                      return (
                        <SelectItem
                          key={provider.id}
                          value={provider.id}
                          disabled={!status?.listModels}
                        >
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              {provider.icon}
                              <span>{provider.displayName}</span>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          <span className="text-neutral-500">/</span>

          <form.Field name="model">
            {(field) => {
              const providerId = form.getFieldValue("provider");
              const status = configuredProviders[providerId];

              return (
                <div className="flex-3 min-w-0">
                  <ModelCombobox
                    providerId={providerId}
                    value={field.state.value}
                    onChange={(value) => field.handleChange(value)}
                    disabled={!status?.listModels}
                    listModels={status?.listModels}
                    isConfigured={isConfigured}
                    suffix={
                      isConfigured ? <HealthStatusIndicator /> : undefined
                    }
                  />
                </div>
              );
            }}
          </form.Field>
        </div>

        {!isConfigured && (
          <div className="flex items-center gap-2 pt-2 border-t border-red-200">
            <span className="text-sm text-red-600">
              <strong className="font-medium">Language model</strong> is needed
              to make Hyprnote summarize and chat about your conversations.
            </span>
          </div>
        )}

        {hasError && health.message && (
          <div className="flex items-center gap-2 pt-2 border-t border-red-200">
            <span className="text-sm text-red-600">{health.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

type ProviderStatus = {
  listModels?: () => Promise<ListModelsResult>;
  proLocked: boolean;
};

function useConfiguredMapping(): Record<string, ProviderStatus> {
  const auth = useAuth();
  const billing = useBillingAccess();
  const configuredProviders = settings.UI.useResultTable(
    settings.QUERIES.llmProviders,
    settings.STORE_ID,
  );

  const mapping = useMemo(() => {
    return Object.fromEntries(
      PROVIDERS.map((provider) => {
        const config = configuredProviders[providerRowId("llm", provider.id)];
        const baseUrl = String(
          config?.base_url || provider.baseUrl || "",
        ).trim();
        const apiKey = String(config?.api_key || "").trim();

        const proLocked =
          requiresEntitlement(provider.requirements, "pro") && !billing.isPro;

        const eligible =
          getProviderSelectionBlockers(provider.requirements, {
            isAuthenticated: !!auth?.session,
            isPro: billing.isPro,
            config: { base_url: baseUrl, api_key: apiKey },
          }).length === 0;

        if (!eligible) {
          return [provider.id, { listModels: undefined, proLocked }];
        }

        if (provider.id === "hyprnote") {
          const result: ListModelsResult = {
            models: ["Auto"],
            ignored: [],
            metadata: {
              Auto: {
                input_modalities: ["text", "image"] as InputModality[],
              },
            },
          };
          return [provider.id, { listModels: async () => result, proLocked }];
        }

        let listModelsFunc: () => Promise<ListModelsResult>;

        switch (provider.id) {
          case "openai":
            listModelsFunc = () => listOpenAIModels(baseUrl, apiKey);
            break;
          case "anthropic":
            listModelsFunc = () => listAnthropicModels(baseUrl, apiKey);
            break;
          case "openrouter":
            listModelsFunc = () => listOpenRouterModels(baseUrl, apiKey);
            break;
          case "google_generative_ai":
            listModelsFunc = () => listGoogleModels(baseUrl, apiKey);
            break;
          case "mistral":
            listModelsFunc = () => listMistralModels(baseUrl, apiKey);
            break;
          case "ollama":
            listModelsFunc = () => listOllamaModels(baseUrl, apiKey);
            break;
          case "lmstudio":
            listModelsFunc = () => listLMStudioModels(baseUrl, apiKey);
            break;
          case "custom":
            listModelsFunc = () => listGenericModels(baseUrl, apiKey);
            break;
          default:
            listModelsFunc = () => listGenericModels(baseUrl, apiKey);
        }

        return [provider.id, { listModels: listModelsFunc, proLocked }];
      }),
    ) as Record<string, ProviderStatus>;
  }, [configuredProviders, auth, billing]);

  return mapping;
}
