import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

import { cn } from "@hypr/utils";

import { ChartSkeleton, EvalChart } from "./-chart";
import { EVAL_DATA, type TaskName } from "./-data";

const validateSearch = z.object({
  task: z.string().optional(),
});

export const Route = createFileRoute("/_view/eval/")({
  component: Component,
  validateSearch,
  loader: () => EVAL_DATA,
  head: () => ({
    meta: [
      { title: "LLM Model Evaluation for Meeting Notes - Char" },
      {
        name: "description",
        content:
          "Compare AI model performance for meeting note tasks. See how GPT-5, Claude 4, Gemini 2.5, and other LLMs perform on summarization, question answering, action items, and speaker identification.",
      },
      {
        property: "og:title",
        content: "LLM Model Evaluation for Meeting Notes - Char",
      },
      {
        property: "og:description",
        content:
          "Interactive comparison of AI models for meeting transcription tasks. Benchmark results for summarization, Q&A, action items, and speaker identification.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://char.com/eval" },
    ],
  }),
});

const taskDescriptions: Record<TaskName, string> = {
  Summarization:
    "Measures how well each model condenses meeting transcripts into concise, accurate summaries while preserving key information and context.",
  "Question Answering":
    "Evaluates the model's ability to accurately answer questions about meeting content, including specific details, decisions, and discussion points.",
  "Action Items":
    "Tests extraction of actionable tasks from meetings, including assignees, deadlines, and task descriptions with proper context.",
  "Speaker Identification":
    "Assesses accuracy in attributing statements to the correct speakers and maintaining speaker consistency throughout the transcript.",
};

function Component() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const evalData = Route.useLoaderData();
  const tasks = Object.keys(evalData) as TaskName[];
  const [isChartReady, setIsChartReady] = useState(false);

  useEffect(() => {
    setIsChartReady(false);
    const timer = setTimeout(() => setIsChartReady(true), 0);
    return () => clearTimeout(timer);
  }, [search.task]);

  const selectedTask =
    search.task && tasks.includes(search.task as TaskName)
      ? (search.task as TaskName)
      : tasks[0];

  const handleTaskClick = (task: TaskName) => {
    navigate({
      search: { task },
      resetScroll: false,
    });
  };

  return (
    <main className="flex-1 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto border-x border-neutral-100">
        <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30 px-6 py-12 lg:py-16 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-stone-600 mb-4">
            LLM Model Evaluation
          </h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto mb-6">
            Compare how leading AI models perform on meeting note tasks. We
            benchmark models on real-world transcription scenarios to help you
            choose the best AI for your needs.
          </p>
          <Link
            to="/download/"
            className={cn([
              "inline-block px-6 py-2.5 text-sm font-medium rounded-full",
              "bg-linear-to-t from-stone-600 to-stone-500 text-white",
              "hover:scale-105 active:scale-95 transition-transform",
            ])}
          >
            Try Char Free
          </Link>
        </div>

        <div className="px-4 py-12">
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {tasks.map((task) => (
              <button
                key={task}
                onClick={() => handleTaskClick(task)}
                className={cn([
                  "px-4 py-2 rounded-full text-sm font-medium transition-all",
                  selectedTask === task
                    ? "bg-stone-600 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
                ])}
              >
                {task}
              </button>
            ))}
          </div>

          <p className="text-center text-sm text-neutral-500 mb-8 max-w-2xl mx-auto">
            {taskDescriptions[selectedTask]}
          </p>

          <div className="h-[600px] w-full">
            {isChartReady ? (
              <EvalChart data={evalData[selectedTask]} />
            ) : (
              <ChartSkeleton />
            )}
          </div>
        </div>

        <div className="px-6 py-12 bg-stone-50/50 border-t border-neutral-100">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-serif text-stone-600 mb-4 text-center">
              About Our Evaluation
            </h2>
            <p className="text-neutral-600 mb-4 leading-relaxed">
              Our benchmarks test AI models on tasks critical to meeting note
              quality. Each model is evaluated on the same dataset of real
              meeting transcripts, measuring accuracy, completeness, and
              relevance of outputs.
            </p>
            <p className="text-neutral-600 leading-relaxed">
              Char supports multiple AI providers, allowing you to choose the
              model that best fits your needs. Whether you prioritize accuracy,
              speed, or privacy with local models, our flexible architecture
              adapts to your workflow.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
