import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@hypr/ui/components/ui/accordion";
import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/solution/meeting")({
  component: Component,
  head: () => ({
    meta: [
      { title: "All Your Meeting Notes in One Place - Char" },
      {
        name: "description",
        content:
          "Zoom, Teams, Meet, Discord, or in-person, Char records it all and generates searchable meeting summaries that never leave your device.",
      },
      { name: "robots", content: "noindex, nofollow" },
      {
        property: "og:title",
        content: "All Your Meeting Notes in One Place - Char",
      },
      {
        property: "og:description",
        content:
          "Real-time transcription, 45+ languages, no bots required. AI-powered meeting notes that stay on your device.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://char.com/solution/meeting",
      },
    ],
  }),
});

const heroFeatures = [
  {
    icon: "mdi:microphone",
    title: "Real-Time Transcription",
    description:
      "See conversations transcribed as they happen, while you add your own notes.",
  },
  {
    icon: "mdi:earth",
    title: "45+ Languages",
    description:
      "Multilingual meetings transcribed correctly, without configuration drama.",
  },
  {
    icon: "mdi:robot-off",
    title: "No Bots",
    description:
      "Captures system audio directly—works with any platform, no bot required.",
  },
];

const detailedFeatures = [
  {
    id: "ai-notes",
    title: "AI Notes",
    icon: "mdi:note-edit",
    heading: "Enhance Your Manual Notes with AI",
    description:
      "Combine your notes with AI transcription in one interface. Add context while the AI captures what's said.",
    details:
      "Later, ask AI to generate summaries, action items, or expand on specific topics using both your notes and the transcript. Your manual notes provide context that makes AI summaries more accurate and relevant to your specific needs.",
  },
  {
    id: "search",
    title: "Search",
    icon: "mdi:magnify",
    heading: "Search Across All Your Meetings",
    description:
      "Every word transcribed is searchable. Find that product decision from three months ago or the exact moment someone mentioned a deadline.",
    details:
      "Search by keyword, speaker, or date across all your meeting notes. Char indexes every word, making it instant to find specific conversations, decisions, or action items no matter how long ago they occurred.",
  },
  {
    id: "ai-chat",
    title: "AI Chat",
    icon: "mdi:chat-processing",
    heading: "Chat with Your Meeting Notes",
    description:
      "Ask AI anything about your meeting in natural language—no manual searching required.",
    details:
      '"What were the action items from the product sync?" "When did we discuss the Q4 budget?" "Summarize what the client said about pricing." Get instant answers from your meeting history without having to remember where or when something was discussed.',
  },
  {
    id: "templates",
    title: "Templates",
    icon: "mdi:file-document-multiple",
    heading: "Templates for Every Meeting Type",
    description:
      "Start with pre-built templates for 1:1s, standups, client calls, or interviews.",
    details:
      "Or create your own structure with action items, decisions, and next steps formatted exactly how you want. Templates help you stay organized and ensure you capture the right information every time, whether it's a recurring standup or a one-off client presentation.",
  },
];

const faqs = [
  {
    question: "Does Char work with Zoom, Teams, and Google Meet?",
    answer:
      "Yes. Char works with any application on your computer—Zoom, Teams, Meet, Slack, Discord, and more. It captures system audio directly, so no integrations needed.",
  },
  {
    question: "Do participants know they're being recorded?",
    answer:
      "Char captures audio at the system level on your device—it doesn't join meetings as a bot. Whether participants are notified depends on your meeting platform's settings and your local recording laws. You're responsible for following consent requirements in your jurisdiction.",
  },
  {
    question: "Can I use Char completely offline?",
    answer:
      "Char records audio offline. Cloud transcription requires internet, but you can generate AI summaries offline using local LLM servers like LM Studio or Ollama.",
  },
  {
    question: "Where is my data stored?",
    answer:
      "All recordings and notes are stored locally on your device. Char doesn't send your audio or transcripts to external servers unless you choose cloud transcription.",
  },
  {
    question: "How do I ensure maximum privacy?",
    answer:
      "Use a local LLM server (LM Studio or Ollama) for AI features instead of cloud providers. Keep your recordings stored locally on your device. Review the privacy policies of your chosen STT provider. Review your settings in Settings > Intelligence. When using local LLM servers, your notes and summaries are generated on your device without being sent to external servers.",
  },
];

function Component() {
  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen overflow-x-hidden"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <HeroSection />
        <QuickFeaturesSection />
        <DetailedFeaturesSection />
        <DataControlSection />
        <FAQSection />
        <CTASection />
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30">
      <div className="px-6 py-12 lg:py-20">
        <header className="mb-8 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-stone-100 text-stone-600 text-sm mb-6">
            <Icon icon="mdi:calendar-clock" className="text-lg" />
            <span>For Meetings</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
            All Your Meeting Notes
            <br />
            in One Place
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto">
            Zoom, Teams, Meet, Discord, or in-person, Char records it all and
            generates searchable meeting summaries that never leave your device.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/download/"
              className={cn([
                "inline-block px-8 py-3 text-base font-medium rounded-full",
                "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                "hover:scale-105 active:scale-95 transition-transform",
              ])}
            >
              Download for free
            </Link>
            <Link
              to="/product/ai-notetaking/"
              className={cn([
                "inline-block px-8 py-3 text-base font-medium rounded-full",
                "border border-stone-300 text-stone-600",
                "hover:bg-stone-50 transition-colors",
              ])}
            >
              See how it works
            </Link>
          </div>
        </header>
      </div>
    </div>
  );
}

function QuickFeaturesSection() {
  return (
    <section className="px-6 py-12 border-t border-neutral-100">
      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {heroFeatures.map((feature) => (
          <div
            key={feature.title}
            className="text-center p-6 rounded-xl bg-stone-50/50 border border-neutral-100"
          >
            <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
              <Icon icon={feature.icon} className="text-2xl text-stone-600" />
            </div>
            <h3 className="text-base font-medium text-stone-700 mb-2">
              {feature.title}
            </h3>
            <p className="text-sm text-neutral-600">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DetailedFeaturesSection() {
  const [activeFeature, setActiveFeature] = useState(detailedFeatures[0].id);

  const activeFeatureData = detailedFeatures.find(
    (f) => f.id === activeFeature,
  );

  return (
    <section className="border-t border-neutral-100">
      <div className="px-6 py-16 max-w-4xl mx-auto">
        <h2 className="text-3xl font-serif text-stone-600 text-center mb-4">
          Everything you need for meeting notes
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          AI-powered features that help you capture, organize, and act on every
          conversation.
        </p>
      </div>

      <div className="sticky top-17.25 z-30 bg-white/95 backdrop-blur-sm border-y border-neutral-100">
        <nav className="px-6 max-w-4xl mx-auto">
          <div className="flex gap-1 overflow-x-auto">
            {detailedFeatures.map((feature) => (
              <button
                key={feature.id}
                type="button"
                onClick={() => setActiveFeature(feature.id)}
                className={cn([
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2",
                  activeFeature === feature.id
                    ? ["text-stone-700 border-stone-600", "bg-stone-50/50"]
                    : [
                        "text-neutral-600 border-transparent",
                        "hover:text-stone-700 hover:bg-stone-50/30",
                      ],
                ])}
              >
                <Icon icon={feature.icon} className="text-lg" />
                <span>{feature.title}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      {activeFeatureData && (
        <div className="px-6 py-12 max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div>
              <h3 className="text-2xl font-serif text-stone-600 mb-4">
                {activeFeatureData.heading}
              </h3>
              <p className="text-neutral-600 mb-4 leading-relaxed">
                {activeFeatureData.description}
              </p>
              <p className="text-neutral-600 text-sm leading-relaxed">
                {activeFeatureData.details}
              </p>
            </div>
            <div className="rounded-xl bg-stone-100/50 border border-neutral-100 aspect-video flex items-center justify-center">
              <Icon
                icon={activeFeatureData.icon}
                className="text-6xl text-stone-400"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function DataControlSection() {
  return (
    <section className="px-6 py-16 bg-stone-50/50 border-t border-neutral-100">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-6 p-6 rounded-xl bg-white border border-neutral-100">
          <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
            <Icon icon="mdi:shield-lock" className="text-2xl text-stone-600" />
          </div>
          <div>
            <h3 className="text-2xl font-serif text-stone-600 mb-3">
              Control Where Your Data Lives
            </h3>
            <p className="text-neutral-600 leading-relaxed mb-3">
              Run fully local with LM Studio or Ollama for offline AI
              processing. Or connect to cloud providers like Deepgram,
              AssemblyAI, or OpenAI.
            </p>
            <p className="text-neutral-600 text-sm leading-relaxed">
              You decide where your data goes, not us. All recordings and notes
              are stored locally on your device by default, and you have full
              control over which services process your data.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  return (
    <section className="px-6 py-16 border-t border-neutral-100">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-serif text-stone-600 text-center mb-4">
          Frequently Asked Questions
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          Common questions about using Char for meeting notes.
        </p>
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-white rounded-xl border border-neutral-100 px-6 data-[state=open]:shadow-sm"
            >
              <AccordionTrigger className="text-lg font-medium text-stone-700 hover:no-underline hover:text-stone-900">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-neutral-600 leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="px-6 py-16 bg-linear-to-t from-stone-600 to-stone-500 border-t border-stone-500">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-serif text-white mb-4">
          Ready to transform your meetings?
        </h2>
        <p className="text-stone-100 mb-8">
          Start capturing every detail with AI-powered meeting notes that
          respect your privacy.
        </p>
        <Link
          to="/download/"
          className={cn([
            "inline-block px-8 py-3 text-base font-medium rounded-full",
            "bg-white text-stone-600",
            "hover:scale-105 active:scale-95 transition-transform",
          ])}
        >
          Get started for free
        </Link>
      </div>
    </section>
  );
}
