import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

import { FAQ, FAQItem } from "@/components/mdx-jobs";
import { SlashSeparator } from "@/components/slash-separator";

export const Route = createFileRoute("/_view/product/flexible-ai")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Flexible AI - Char" },
      {
        name: "description",
        content:
          "The only AI note-taker that lets you choose your preferred STT and LLM provider. Cloud, BYOK, or fully local.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function Component() {
  return (
    <main
      className="flex-1 bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <HeroSection />
        <SlashSeparator />
        <AISetupSection />
        <SlashSeparator />
        <LocalFeaturesSection />
        <SlashSeparator />
        <SwitchSection />
        <SlashSeparator />
        <BenchmarkSection />
        <SlashSeparator />
        <FAQSection />
      </div>
    </main>
  );
}

function HeroSection() {
  return (
    <section className="bg-linear-to-b from-stone-50/30 to-stone-100/30">
      <div className="flex flex-col items-center text-center gap-6 py-24 px-4">
        <div className="flex flex-col gap-6 max-w-4xl">
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-700">
            Take Meeting Notes With
            <br />
            AI of Your Choice
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 max-w-3xl mx-auto">
            The only AI note-taker that lets you choose your preferred STT and
            LLM provider
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 pt-6">
          <Link
            to="/download/"
            className={cn([
              "px-8 py-3 text-base font-medium rounded-full",
              "bg-linear-to-t from-stone-600 to-stone-500 text-white",
              "shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
              "transition-all",
            ])}
          >
            Download for free
          </Link>
        </div>
      </div>
    </section>
  );
}

function AISetupSection() {
  return (
    <section>
      <div className="text-center border-b border-neutral-100">
        <p className="font-medium text-neutral-600 uppercase tracking-wide py-6 font-serif">
          Pick your AI setup
        </p>
      </div>
      <div className="grid md:grid-cols-3">
        <div className="p-8 border-r border-b border-neutral-100 md:border-b-0">
          <Icon icon="mdi:cloud" className="text-3xl text-stone-600 mb-4" />
          <h3 className="text-xl font-serif text-stone-600 mb-1">
            Char Cloud ($8/month)
          </h3>
          <p className="text-neutral-600">
            Managed service that works out of the box. No setup, no API keys, no
            configuration.
          </p>
        </div>
        <div className="p-8 border-r border-b border-neutral-100 md:border-b-0">
          <Icon
            icon="mdi:key-variant"
            className="text-3xl text-stone-700 mb-4"
          />
          <h3 className="text-xl font-serif text-stone-700 mb-1">
            Bring Your Own Key (Free)
          </h3>
          <p className="text-neutral-600">
            Use your existing credits from OpenAI, Anthropic, Deepgram, or
            others. No markup.
          </p>
        </div>
        <div className="p-8 border-b border-neutral-100 md:border-b-0">
          <Icon icon="mdi:laptop" className="text-3xl text-stone-700 mb-4" />
          <h3 className="text-xl font-serif text-stone-700 mb-1">
            Go fully local if you want to
          </h3>
          <p className="text-neutral-600">
            Run everything on your device. Zero data leaves your computer.
          </p>
        </div>
      </div>
    </section>
  );
}

function LocalFeaturesSection() {
  return (
    <section>
      <div className="divide-y divide-neutral-100">
        <div className="p-8 flex items-start gap-4">
          <Icon
            icon="mdi:microphone"
            className="text-3xl text-stone-700 shrink-0"
          />
          <div>
            <h3 className="text-xl font-serif text-stone-700 mb-2">
              Local transcription with Whisper
            </h3>
            <p className="text-neutral-600">
              Download Whisper models through Ollama or LM Studio. Transcribe
              meetings offline without any API calls.
            </p>
          </div>
        </div>
        <div className="p-8 flex items-start gap-4">
          <Icon icon="mdi:brain" className="text-3xl text-stone-700 shrink-0" />
          <div>
            <h3 className="text-xl font-serif text-stone-700 mb-2">
              Local LLM inference
            </h3>
            <p className="text-neutral-600">
              Run Llama 3, Mistral, Qwen, or other open-source models locally
              for AI summaries and chat.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SwitchSection() {
  return (
    <section>
      <div className="text-center border-b border-neutral-100">
        <p className="font-medium text-neutral-600 uppercase tracking-wide py-6 font-serif">
          Switch providers anytime
        </p>
      </div>
      <p className="text-center text-neutral-600 px-4 py-6 border-b border-neutral-100">
        Your notes aren't locked to any AI provider.
      </p>
      <div className="grid md:grid-cols-2">
        <div className="p-8 border-r border-b border-neutral-100 md:border-b-0">
          <h3 className="text-lg font-serif text-stone-700 mb-2">
            Start with Cloud
          </h3>
          <p className="text-neutral-600">
            Try Char's managed service free for 14 days.
          </p>
        </div>
        <div className="p-8 border-b border-neutral-100 md:border-b-0">
          <h3 className="text-lg font-serif text-stone-700 mb-2">
            Change based on needs
          </h3>
          <p className="text-neutral-600">
            Go local for sensitive discussions. Cloud for more power. BYOK for
            API cost control.
          </p>
        </div>
        <div className="p-8 border-r border-neutral-100">
          <h3 className="text-lg font-serif text-stone-700 mb-2">
            Re-process meetings
          </h3>
          <p className="text-neutral-600">
            Run new models on old transcripts when better AI launches.
          </p>
        </div>
        <div className="p-8">
          <h3 className="text-lg font-serif text-stone-700 mb-2">
            Data never moves
          </h3>
          <p className="text-neutral-600">
            Notes stay on your device. Only the AI layer changes.
          </p>
        </div>
      </div>
    </section>
  );
}

function BenchmarkSection() {
  return (
    <section className="bg-linear-to-b from-stone-50/30 to-stone-100/30">
      <div className="flex flex-col items-center text-center gap-6 py-16 px-4">
        <h2 className="text-2xl sm:text-3xl font-serif text-stone-700">
          Confused which AI model to choose?
        </h2>
        <p className="text-neutral-600 max-w-2xl mx-auto">
          We benchmark leading AI models on real meeting
          tasks&mdash;summarization, Q&A, action items, and speaker ID. See
          detailed comparisons to find the right fit.
        </p>
        <Link
          to="/eval/"
          className={cn([
            "px-8 py-3 text-base font-medium rounded-full",
            "border border-neutral-300 text-stone-700",
            "hover:bg-stone-50 transition-colors",
          ])}
        >
          View AI model evaluations
        </Link>
      </div>
    </section>
  );
}

function FAQSection() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-serif text-stone-700">
            Frequently asked questions
          </h2>
        </div>
        <FAQ>
          <FAQItem question="Which AI models does Char use?">
            Char Cloud routes requests to the best models for each task.
          </FAQItem>
          <FAQItem question="Can I use different models for different meetings?">
            Yes. You can switch providers before any meeting or re-process
            existing transcripts with different models anytime.
          </FAQItem>
          <FAQItem question="What happens to my notes if I switch providers?">
            Nothing. Your notes are Markdown files on your device. Switching AI
            providers doesn't affect your data at all.
          </FAQItem>
          <FAQItem question="Is local AI good enough?">
            Local models are improving rapidly. For most meetings, local Whisper
            + Llama 3 works well. For complex summaries or technical
            discussions, cloud models (Char Cloud or BYOK) tend to perform
            better.
          </FAQItem>
          <FAQItem question="Does Char train AI models on my data?">
            No. Char does not use your recordings, transcripts, or notes to
            train AI models. When using cloud providers, your data is processed
            according to their privacy policies.
          </FAQItem>
        </FAQ>
      </div>
    </section>
  );
}
