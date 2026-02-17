import {
  generateText,
  type LanguageModel,
  Output,
  smoothStream,
  streamText,
} from "ai";
import { z } from "zod";

import {
  type EnhanceTemplate,
  commands as templateCommands,
  type TemplateSection,
} from "@hypr/plugin-template";
import { templateSectionSchema } from "@hypr/store";

import type { ProviderId } from "../../../../components/settings/ai/llm/shared";
import type { TaskArgsMapTransformed, TaskConfig } from ".";
import type { Store } from "../../../tinybase/store/main";
import { getCustomPrompt } from "../../../tinybase/store/prompts";
import {
  normalizeBulletPoints,
  trimBeforeMarker,
} from "../shared/transform_impl";
import {
  type EarlyValidatorFn,
  withEarlyValidationRetry,
} from "../shared/validate";

export const enhanceWorkflow: Pick<
  TaskConfig<"enhance">,
  "executeWorkflow" | "transforms"
> = {
  executeWorkflow,
  transforms: [
    trimBeforeMarker("#"),
    normalizeBulletPoints(),
    smoothStream({ delayInMs: 250, chunking: "line" }),
  ],
};

const LOCAL_PROVIDERS: ProviderId[] = ["lmstudio", "ollama"];
const MAX_CHUNK_TOKENS = 6000;
const CHARS_PER_TOKEN = 4;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function shouldChunk(prompt: string, providerId?: ProviderId): boolean {
  if (!providerId || !LOCAL_PROVIDERS.includes(providerId)) {
    return false;
  }
  return estimateTokens(prompt) > MAX_CHUNK_TOKENS;
}

function splitTranscriptIntoChunks(
  prompt: string,
  maxTokens: number,
): string[] {
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  const lines = prompt.split("\n");
  const chunks: string[] = [];
  let current = "";

  for (const line of lines) {
    if (current.length + line.length + 1 > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = "";
    }
    current += (current ? "\n" : "") + line;
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [prompt];
}

async function summarizeChunk(params: {
  model: LanguageModel;
  system: string;
  chunk: string;
  chunkIndex: number;
  totalChunks: number;
  signal: AbortSignal;
}): Promise<string> {
  const { model, system, chunk, chunkIndex, totalChunks, signal } = params;

  const chunkPrompt = `This is part ${chunkIndex + 1} of ${totalChunks} of a meeting transcript. Summarize the key points from this section in bullet points under relevant headings.

${chunk}`;

  const result = await generateText({
    model,
    system,
    prompt: chunkPrompt,
    abortSignal: signal,
  });

  return result.text;
}

async function* executeWorkflow(params: {
  model: LanguageModel;
  args: TaskArgsMapTransformed["enhance"];
  onProgress: (step: any) => void;
  signal: AbortSignal;
  store: Store;
  providerId?: ProviderId;
}) {
  const { model, args, onProgress, signal, store, providerId } = params;

  const sections = await generateTemplateIfNeeded({
    model,
    args,
    onProgress,
    signal,
    store,
  });
  const argsWithTemplate: TaskArgsMapTransformed["enhance"] = {
    ...args,
    template: sections ? { title: "", description: null, sections } : null,
  };

  const system = await getSystemPrompt(argsWithTemplate);
  const prompt = await getUserPrompt(argsWithTemplate, store);

  if (shouldChunk(prompt, providerId)) {
    yield* executeChunkedWorkflow({
      model,
      args: argsWithTemplate,
      system,
      prompt,
      onProgress,
      signal,
    });
  } else {
    yield* generateSummary({
      model,
      args: argsWithTemplate,
      system,
      prompt,
      onProgress,
      signal,
    });
  }
}

async function* executeChunkedWorkflow(params: {
  model: LanguageModel;
  args: TaskArgsMapTransformed["enhance"];
  system: string;
  prompt: string;
  onProgress: (step: any) => void;
  signal: AbortSignal;
}) {
  const { model, args, system, prompt, onProgress, signal } = params;

  const chunks = splitTranscriptIntoChunks(prompt, MAX_CHUNK_TOKENS);
  const partialSummaries: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    onProgress({ type: "chunking", current: i + 1, total: chunks.length });

    const summary = await summarizeChunk({
      model,
      system,
      chunk: chunks[i],
      chunkIndex: i,
      totalChunks: chunks.length,
      signal,
    });
    partialSummaries.push(summary);
  }

  const mergedContext = partialSummaries
    .map((s, i) => `--- Part ${i + 1} Summary ---\n${s}`)
    .join("\n\n");

  const sectionHint = args.template?.sections
    ? `\nOrganize the final summary using these section headings: ${args.template.sections.map((s) => s.title).join(", ")}`
    : "";

  const mergePrompt = `Below are partial summaries from different parts of a meeting transcript. Merge them into a single, coherent, well-structured meeting summary in markdown.${sectionHint}

${mergedContext}`;

  yield* generateSummary({
    model,
    args,
    system,
    prompt: mergePrompt,
    onProgress,
    signal,
  });
}

async function getSystemPrompt(args: TaskArgsMapTransformed["enhance"]) {
  const result = await templateCommands.render({
    enhanceSystem: {
      language: args.language,
    },
  });

  if (result.status === "error") {
    throw new Error(result.error);
  }

  return result.data;
}

async function getUserPrompt(
  args: TaskArgsMapTransformed["enhance"],
  store: Store,
) {
  const { session, participants, template, transcripts } = args;

  const ctx = {
    content: transcripts,
    session,
    participants,
    template,
  };

  const customPrompt = getCustomPrompt(store, "enhance");
  if (customPrompt) {
    const result = await templateCommands.renderCustom(customPrompt, ctx);
    if (result.status === "error") {
      throw new Error(result.error);
    }
    return result.data;
  }

  const result = await templateCommands.render({
    enhanceUser: {
      session,
      participants,
      template,
      transcripts,
    },
  });

  if (result.status === "error") {
    throw new Error(result.error);
  }

  return result.data;
}

async function generateTemplateIfNeeded(params: {
  model: LanguageModel;
  args: TaskArgsMapTransformed["enhance"];
  onProgress: (step: any) => void;
  signal: AbortSignal;
  store: Store;
}): Promise<TemplateSection[] | null> {
  const { model, args, onProgress, signal, store } = params;

  if (!args.template) {
    onProgress({ type: "analyzing" });

    const schema = z.object({ sections: z.array(templateSectionSchema) });
    const userPrompt = await getUserPrompt(args, store);

    const result = await generateStructuredOutput({
      model,
      schema,
      signal,
      prompt: createTemplatePrompt(userPrompt, schema),
    });

    if (!result) {
      return null;
    }

    return result.sections.map((s) => ({
      title: s.title,
      description: s.description ?? null,
    }));
  } else {
    return args.template.sections;
  }
}

function createTemplatePrompt(
  userPrompt: string,
  schema: z.ZodObject<any>,
): string {
  return `Analyze this meeting content and suggest appropriate section headings for a comprehensive summary.
  The sections should cover the main themes and topics discussed.
  Generate around 5-7 sections based on the content depth.
  Give me in bullet points.

  Content:
  ---
  ${userPrompt}
  ---

  Follow this JSON schema for your response. No additional properties.
  ---
  ${JSON.stringify(z.toJSONSchema(schema))}
  ---

  IMPORTANT: Start with '{', NO \`\`\`json. (I will directly parse it with JSON.parse())`;
}

async function generateStructuredOutput<T extends z.ZodTypeAny>(params: {
  model: LanguageModel;
  schema: T;
  signal: AbortSignal;
  prompt: string;
}): Promise<z.infer<T> | null> {
  const { model, schema, signal, prompt } = params;

  try {
    const result = await generateText({
      model,
      temperature: 0,
      output: Output.object({ schema }),
      abortSignal: signal,
      prompt,
    });

    if (!result.output) {
      return null;
    }

    return result.output as z.infer<T>;
  } catch (error) {
    try {
      const fallbackResult = await generateText({
        model,
        temperature: 0,
        abortSignal: signal,
        prompt,
      });

      const jsonMatch = fallbackResult.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return schema.parse(parsed);
    } catch {
      return null;
    }
  }
}

async function* generateSummary(params: {
  model: LanguageModel;
  args: TaskArgsMapTransformed["enhance"];
  system: string;
  prompt: string;
  onProgress: (step: any) => void;
  signal: AbortSignal;
}) {
  const { model, args, system, prompt, onProgress, signal } = params;

  onProgress({ type: "generating" });

  const validator = createValidator(args.template);

  yield* withEarlyValidationRetry(
    (retrySignal, { previousFeedback }) => {
      let enhancedPrompt = prompt;

      if (previousFeedback) {
        enhancedPrompt = `${prompt}

IMPORTANT: Previous attempt failed. ${previousFeedback}`;
      }

      const combinedController = new AbortController();

      const abortFromOuter = () => combinedController.abort();
      const abortFromRetry = () => combinedController.abort();

      signal.addEventListener("abort", abortFromOuter);
      retrySignal.addEventListener("abort", abortFromRetry);

      try {
        const result = streamText({
          model,
          system,
          prompt: enhancedPrompt,
          abortSignal: combinedController.signal,
        });
        return result.fullStream;
      } finally {
        signal.removeEventListener("abort", abortFromOuter);
        retrySignal.removeEventListener("abort", abortFromRetry);
      }
    },
    validator,
    {
      minChar: 10,
      maxChar: 30,
      maxRetries: 2,
      onRetry: (attempt, feedback) => {
        onProgress({ type: "retrying", attempt, reason: feedback });
      },
      onRetrySuccess: () => {
        onProgress({ type: "generating" });
      },
    },
  );
}

function createValidator(template: EnhanceTemplate | null): EarlyValidatorFn {
  return (textSoFar: string) => {
    const normalized = textSoFar.trim();

    if (!template?.sections || template.sections.length === 0) {
      if (!normalized.startsWith("# ")) {
        const feedback =
          "Output must start with a markdown h1 heading (# Title).";
        return { valid: false, feedback };
      }

      return { valid: true };
    }

    const firstSection = template.sections[0];
    const expectedStart = `# ${firstSection.title}`;
    const isValid =
      expectedStart.startsWith(normalized) ||
      normalized.startsWith(expectedStart);
    if (!isValid) {
      const feedback = `Output must start with the first template section heading: "${expectedStart}"`;
      return { valid: false, feedback };
    }

    return { valid: true };
  };
}
