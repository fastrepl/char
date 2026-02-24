import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

import { SlashSeparator } from "@/components/slash-separator";

export const Route = createFileRoute("/_view/product/ai-assistant")({
  component: Component,
  head: () => ({
    meta: [
      { title: "AI Chat - Hyprnote" },
      {
        name: "description",
        content:
          "AI assistant that helps you before, during, and after meetings. Prepare with research, get realtime insights, and execute workflows—all powered by local AI.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function Component() {
  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <HeroSection />
        <SlashSeparator />
        <BeforeMeetingSection />
        <SlashSeparator />
        <DuringMeetingSection />
        <SlashSeparator />
        <AfterMeetingSection />
        <SlashSeparator />
        <CTASection />
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30 px-6 py-12 lg:py-20">
      <header className="text-center max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6 flex items-center justify-center flex-wrap">
          <span>AI Chat</span>
          <img
            src="/api/images/hyprnote/ai-assistant.gif"
            alt="AI Chat"
            className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-full inline-block ml-1 mr-2 sm:mr-0"
          />
          <span>for your meetings</span>
        </h1>
        <p className="text-lg sm:text-xl text-neutral-600">
          Prepare, engage, and follow through with AI-powered assistance
        </p>
        <div className="mt-8">
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
        </div>
      </header>
    </div>
  );
}

function BeforeMeetingSection() {
  return (
    <section id="before-meeting">
      <div className="text-center font-medium text-neutral-600 uppercase tracking-wide py-6 font-serif">
        Before meetings
      </div>

      <div className="border-t border-neutral-100">
        <div className="grid md:grid-cols-2">
          <div className="p-8 border-b md:border-b-0 md:border-r border-neutral-100">
            <Icon icon="mdi:magnify" className="text-3xl text-stone-600 mb-4" />
            <h3 className="text-xl font-serif text-stone-600 mb-3">
              Deep research with chat
            </h3>
            <p className="text-neutral-600 mb-4 leading-relaxed">
              Chat with your AI assistant to learn more about the people you're
              meeting with. Search through past conversations, extract key
              insights, and understand context before you join.
            </p>
            <ul className="flex flex-col gap-2">
              <li className="flex items-start gap-2">
                <Icon
                  icon="mdi:check"
                  className="text-stone-600 shrink-0 mt-0.5"
                />
                <span className="text-sm text-neutral-600">
                  "What did we discuss last time with Sarah?"
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Icon
                  icon="mdi:check"
                  className="text-stone-600 shrink-0 mt-0.5"
                />
                <span className="text-sm text-neutral-600">
                  "What are the client's main concerns?"
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Icon
                  icon="mdi:check"
                  className="text-stone-600 shrink-0 mt-0.5"
                />
                <span className="text-sm text-neutral-600">
                  "Show me all action items from previous meetings"
                </span>
              </li>
            </ul>
          </div>

          <div className="p-8 border-b md:border-b-0 border-neutral-100">
            <Icon
              icon="mdi:file-document-edit"
              className="text-3xl text-stone-600 mb-4"
            />
            <h3 className="text-xl font-serif text-stone-600 mb-3">
              Generate custom templates
            </h3>
            <p className="text-neutral-600 mb-4 leading-relaxed">
              Create tailored meeting templates on the spot. Ask your AI
              assistant to generate agendas, question lists, or note structures
              specific to your meeting type.
            </p>
            <ul className="flex flex-col gap-2">
              <li className="flex items-start gap-2">
                <Icon
                  icon="mdi:check"
                  className="text-stone-600 shrink-0 mt-0.5"
                />
                <span className="text-sm text-neutral-600">
                  "Create a customer discovery template"
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Icon
                  icon="mdi:check"
                  className="text-stone-600 shrink-0 mt-0.5"
                />
                <span className="text-sm text-neutral-600">
                  "Generate questions for a technical interview"
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Icon
                  icon="mdi:check"
                  className="text-stone-600 shrink-0 mt-0.5"
                />
                <span className="text-sm text-neutral-600">
                  "Build an agenda for our quarterly review"
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="p-8 border-t border-neutral-100">
          <Icon
            icon="mdi:message-question"
            className="text-3xl text-stone-600 mb-4"
          />
          <h3 className="text-xl font-serif text-stone-600 mb-3">
            Ask about past conversations
          </h3>
          <p className="text-neutral-600 leading-relaxed max-w-3xl">
            Query your entire conversation history to refresh your memory. Find
            decisions, action items, or specific topics discussed in previous
            meetings—all in natural language.
          </p>
        </div>
      </div>
    </section>
  );
}

function DuringMeetingSection() {
  return (
    <section id="during-meeting">
      <div className="text-center font-medium text-neutral-600 uppercase tracking-wide py-6 font-serif">
        During meetings
      </div>

      <div className="border-t border-neutral-100">
        <div className="grid md:grid-cols-2">
          <div className="p-8 border-b md:border-b-0 md:border-r border-neutral-100">
            <Icon icon="mdi:chat" className="text-3xl text-stone-600 mb-4" />
            <h3 className="text-xl font-serif text-stone-600 mb-3">
              Ask questions in realtime
            </h3>
            <p className="text-neutral-600 leading-relaxed">
              Type questions to your AI assistant during the meeting without
              interrupting the conversation. Get instant answers from the
              current transcript and past meeting context.
            </p>
          </div>

          <div className="p-8 border-b md:border-b-0 border-neutral-100">
            <Icon
              icon="mdi:lightbulb-on"
              className="text-3xl text-stone-600 mb-4"
            />
            <h3 className="text-xl font-serif text-stone-600 mb-3">
              Realtime insights via{" "}
              <Link
                to="/product/extensions/"
                className="text-stone-600 hover:text-stone-800 underline decoration-dotted underline-offset-2"
              >
                extensions
              </Link>
            </h3>
            <p className="text-neutral-600 mb-4 leading-relaxed">
              AI-powered extensions provide live assistance during your meeting.
              Built on our extension framework, these tools adapt to your needs
              in realtime.
            </p>
          </div>
        </div>

        <div className="border-t border-neutral-100">
          <div className="py-8 px-6 lg:px-8">
            <h4 className="text-lg font-serif text-stone-600 mb-6 text-center">
              Available realtime extensions
            </h4>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-stone-50 border border-neutral-200 rounded-lg">
                <Icon
                  icon="mdi:comment-check"
                  className="text-2xl text-stone-600 mb-3"
                />
                <h5 className="font-medium text-stone-700 mb-2">Suggestions</h5>
                <p className="text-sm text-neutral-600">
                  Get AI-generated advice and recommendations based on the
                  conversation flow
                </p>
              </div>

              <div className="p-6 bg-stone-50 border border-neutral-200 rounded-lg">
                <Icon
                  icon="mdi:account-voice"
                  className="text-2xl text-stone-600 mb-3"
                />
                <h5 className="font-medium text-stone-700 mb-2">
                  Talk time tracking
                </h5>
                <p className="text-sm text-neutral-600">
                  Monitor who's speaking and for how long to ensure balanced
                  participation
                </p>
              </div>

              <div className="p-6 bg-stone-50 border border-neutral-200 rounded-lg">
                <Icon
                  icon="mdi:school"
                  className="text-2xl text-stone-600 mb-3"
                />
                <h5 className="font-medium text-stone-700 mb-2">
                  ELI5 explanations
                </h5>
                <p className="text-sm text-neutral-600">
                  Get instant simple explanations of technical or professional
                  jargon
                </p>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                to="/product/extensions/"
                className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-800 font-medium"
              >
                Learn more about extensions
                <Icon icon="mdi:arrow-right" className="text-lg" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AfterMeetingSection() {
  return (
    <section id="after-meeting">
      <div className="text-center font-medium text-neutral-600 uppercase tracking-wide py-6 font-serif">
        After meetings
      </div>

      <div className="border-t border-neutral-100">
        <div className="grid md:grid-cols-2">
          <div className="p-8 border-b md:border-b-0 md:border-r border-neutral-100">
            <Icon
              icon="mdi:workflow"
              className="text-3xl text-stone-600 mb-4"
            />
            <h3 className="text-xl font-serif text-stone-600 mb-3">
              Execute workflows with natural language
            </h3>
            <p className="text-neutral-600 mb-4 leading-relaxed">
              Describe what you want to do, and let your AI assistant handle the
              rest. Automate follow-up tasks across your tools without manual
              data entry.
            </p>
            <div className="flex flex-col gap-3">
              <div className="p-4 bg-stone-50 border border-neutral-200 rounded-lg">
                <p className="text-sm text-neutral-700 italic mb-2">
                  "Add a Linear ticket for the mobile UI bug we discussed and
                  assign it to Sarah"
                </p>
                <p className="text-xs text-neutral-500">
                  ✓ Creates ticket with meeting context and assigns it
                </p>
              </div>
              <div className="p-4 bg-stone-50 border border-neutral-200 rounded-lg">
                <p className="text-sm text-neutral-700 italic mb-2">
                  "Send the summary to the #engineering channel and mark the Q4
                  roadmap item as done"
                </p>
                <p className="text-xs text-neutral-500">
                  ✓ Posts to Slack and updates project status
                </p>
              </div>
              <div className="p-4 bg-stone-50 border border-neutral-200 rounded-lg">
                <p className="text-sm text-neutral-700 italic mb-2">
                  "Schedule follow-up meeting with the client for next week and
                  add action items to Notion"
                </p>
                <p className="text-xs text-neutral-500">
                  ✓ Creates calendar event and syncs tasks
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 border-b md:border-b-0 border-neutral-100">
            <Icon icon="mdi:brain" className="text-3xl text-stone-600 mb-4" />
            <h3 className="text-xl font-serif text-stone-600 mb-3">
              Learns and adapts with memory
            </h3>
            <p className="text-neutral-600 leading-relaxed">
              Your AI assistant builds memory from your interactions. It
              remembers preferences, learns from edits you make to summaries,
              and continuously improves its assistance based on your patterns.
            </p>
            <ul className="flex flex-col gap-3 mt-4">
              <li className="flex items-start gap-3">
                <Icon
                  icon="mdi:check-circle"
                  className="text-stone-600 shrink-0 mt-0.5"
                />
                <span className="text-sm text-neutral-600">
                  Remembers your meeting preferences and formats
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Icon
                  icon="mdi:check-circle"
                  className="text-stone-600 shrink-0 mt-0.5"
                />
                <span className="text-sm text-neutral-600">
                  Learns from your edits to improve future summaries
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Icon
                  icon="mdi:check-circle"
                  className="text-stone-600 shrink-0 mt-0.5"
                />
                <span className="text-sm text-neutral-600">
                  Adapts to your workflow and tool preferences
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Icon
                  icon="mdi:check-circle"
                  className="text-stone-600 shrink-0 mt-0.5"
                />
                <span className="text-sm text-neutral-600">
                  Builds context about your team and projects over time
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-16 bg-linear-to-t from-stone-50/30 to-stone-100/30 px-4 lg:px-0">
      <div className="flex flex-col gap-6 items-center text-center">
        <div className="mb-4 size-40 shadow-2xl border border-neutral-100 flex justify-center items-center rounded-[48px] bg-transparent">
          <img
            src="/api/images/hyprnote/icon.png"
            alt="Hyprnote"
            width={144}
            height={144}
            className="size-36 mx-auto rounded-[40px] border border-neutral-100"
          />
        </div>
        <h2 className="text-2xl sm:text-3xl font-serif">
          Start using your AI assistant
        </h2>
        <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
          Get AI-powered help before, during, and after every meeting with
          Hyprnote
        </p>
        <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/download/"
            className={cn([
              "group px-6 h-12 flex items-center justify-center text-base sm:text-lg",
              "bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full",
              "shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
              "transition-all",
            ])}
          >
            Download for free
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m12.75 15 3-3m0 0-3-3m3 3h-7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </Link>
          <Link
            to="/product/ai-notetaking/"
            className={cn([
              "px-6 h-12 flex items-center justify-center text-base sm:text-lg",
              "border border-neutral-300 text-stone-600 rounded-full",
              "hover:bg-white transition-colors",
            ])}
          >
            Learn about AI Notetaking
          </Link>
        </div>
      </div>
    </section>
  );
}
