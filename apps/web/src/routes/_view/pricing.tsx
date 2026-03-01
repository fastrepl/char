import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";

import { cn } from "@hypr/utils";

import { Image } from "@/components/image";
import { SlashSeparator } from "@/components/slash-separator";

export const Route = createFileRoute("/_view/pricing")({
  component: Component,
});

interface PricingPlan {
  name: string;
  price: { monthly: number; yearly: number } | null;
  originalPrice?: { monthly: number; yearly: number };
  description: string;
  popular?: boolean;
  features: Array<{
    label: string;
    included: boolean | "partial";
    tooltip?: string;
    comingSoon?: boolean;
    partiallyImplemented?: boolean;
  }>;
}

const pricingPlans: PricingPlan[] = [
  {
    name: "Free",
    price: null,
    description:
      "Fully functional with your own API keys. Perfect for individuals who want complete control.",
    features: [
      { label: "On-device Transcription", included: true },
      { label: "Save Audio Recordings", included: true },
      { label: "Audio Player with Transcript Tracking", included: true },
      { label: "Bring Your Own Key (STT & LLM)", included: true },
      { label: "Export to PDF, TXT, Markdown", included: true },
      {
        label: "Local-first Data Architecture",
        included: true,
        tooltip:
          "Filesystem-based by default: notes and transcripts are stored on your device first.",
      },
      {
        label: "Custom Content Base Location",
        included: true,
        tooltip: "Move your default content folder to any location you prefer.",
      },
      { label: "Templates", included: true },
      { label: "Shortcuts", included: true },
      { label: "Chat", included: true },
      { label: "Integrations", included: false },
      { label: "Cloud Services (STT & LLM)", included: false },
      { label: "Cloud Sync", included: false },
      { label: "Shareable Links", included: false },
    ],
  },
  {
    name: "Pro",
    price: {
      monthly: 8,
      yearly: 59,
    },
    originalPrice: {
      monthly: 25,
      yearly: 250,
    },
    description:
      "No API keys needed. Get cloud services, advanced sharing, and team features out of the box.",
    popular: true,
    features: [
      { label: "Everything in Free", included: true },
      { label: "Audio Player with Playback Rates", included: true },
      {
        label: "Speaker Identification",
        included: "partial",
        partiallyImplemented: true,
      },
      { label: "Advanced Templates", included: true },
      { label: "Integrations", included: true, comingSoon: true },
      { label: "Cloud Services (STT & LLM)", included: true },
      {
        label: "Cloud Sync",
        included: true,
        tooltip: "Select which notes to sync",
        comingSoon: true,
      },
      {
        label: "Shareable Links",
        included: true,
        tooltip: "DocSend-like: view tracking, expiration, revocation",
        comingSoon: true,
      },
    ],
  },
];

function Component() {
  return (
    <main
      className="min-h-screen flex-1 bg-linear-to-b from-white via-stone-50/20 to-white"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="mx-auto max-w-6xl border-x border-neutral-100 bg-white">
        <TeamPricingBanner />
        <HeroSection />
        <SlashSeparator />
        <PricingCardsSection />
        <SlashSeparator />
        <PricingLetterSection />
        <SlashSeparator />
        <FAQSection />
        <SlashSeparator />
        <CTASection />
      </div>
    </main>
  );
}

function TeamPricingBanner() {
  return (
    <div
      className={cn([
        "flex items-center justify-center gap-2 text-center",
        "border-b border-stone-100 bg-stone-50/70",
        "px-4 py-3",
        "font-serif text-sm text-stone-700",
      ])}
    >
      <span>
        <strong>Early Bird Discount:</strong> Get 68% off as we launch our new
        version and help with migration —{" "}
        <strong>offer extended while we finalize the new timeline</strong>
      </span>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="laptop:px-0 flex flex-col items-center gap-6 border-b border-neutral-100 px-4 py-24 text-center">
      <div className="flex max-w-3xl flex-col gap-4">
        <h1 className="font-serif text-4xl tracking-tight text-stone-700 sm:text-5xl">
          Pricing
        </h1>
        <p className="text-lg text-neutral-600 sm:text-xl">
          Start for free, upgrade when you need cloud features.
        </p>
      </div>
    </section>
  );
}

function PricingCardsSection() {
  return (
    <section className="laptop:px-0 px-4 py-16">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
        {pricingPlans.map((plan) => (
          <PricingCard key={plan.name} plan={plan} />
        ))}
      </div>
    </section>
  );
}

function PricingCard({ plan }: { plan: PricingPlan }) {
  return (
    <div
      className={cn([
        "flex flex-col overflow-hidden rounded-xs border transition-transform",
        plan.popular
          ? "relative scale-105 border-stone-600 shadow-lg"
          : "border-neutral-100",
      ])}
    >
      {plan.popular && (
        <div className="bg-stone-600 px-4 py-2 text-center text-sm font-medium text-white">
          Most Popular
        </div>
      )}

      <div className="flex flex-1 flex-col p-8">
        <div className="mb-6">
          <h2 className="mb-2 font-serif text-2xl text-stone-700">
            {plan.name}
          </h2>
          <p className="mb-4 text-sm text-neutral-600">{plan.description}</p>

          {plan.price ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-4xl text-stone-700">
                  ${plan.price.monthly}
                </span>
                {plan.originalPrice && (
                  <span className="text-xl text-neutral-400 line-through">
                    ${plan.originalPrice.monthly}
                  </span>
                )}
                <span className="text-neutral-600">/month</span>
              </div>
              <div className="text-sm text-neutral-600">
                or ${plan.price.yearly}/year{" "}
                {plan.originalPrice && (
                  <span className="text-neutral-400 line-through">
                    ${plan.originalPrice.yearly}
                  </span>
                )}{" "}
                <span className="font-medium text-green-700">(save 76%)</span>
              </div>
            </div>
          ) : (
            <div className="font-serif text-4xl text-stone-700">Free</div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3">
          {plan.features.map((feature, idx) => {
            const IconComponent =
              feature.included === true
                ? CheckCircle2
                : feature.included === "partial"
                  ? MinusCircle
                  : XCircle;

            return (
              <div key={idx} className="flex items-start gap-3">
                <IconComponent
                  className={cn([
                    "mt-0.5 size-4.5 shrink-0",
                    feature.included === true
                      ? "text-green-700"
                      : feature.included === "partial"
                        ? "text-yellow-600"
                        : "text-neutral-300",
                  ])}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn([
                        "text-sm",
                        feature.included === true
                          ? "text-neutral-900"
                          : feature.included === "partial"
                            ? "text-neutral-700"
                            : "text-neutral-400",
                      ])}
                    >
                      {feature.label}
                    </span>
                    {(feature.comingSoon || feature.partiallyImplemented) && (
                      <span
                        className={cn([
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          feature.partiallyImplemented
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-neutral-200 text-neutral-500",
                        ])}
                      >
                        {feature.partiallyImplemented
                          ? "Partially Implemented"
                          : "Coming Soon"}
                      </span>
                    )}
                  </div>
                  {feature.tooltip && (
                    <div className="mt-0.5 text-xs text-neutral-500 italic">
                      {feature.tooltip}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {plan.price ? (
          <Link
            to="/auth/"
            className={cn([
              "mt-8 flex h-10 w-full cursor-pointer items-center justify-center text-sm font-medium transition-all",
              "rounded-full bg-linear-to-t from-stone-600 to-stone-500 text-white shadow-md hover:scale-[102%] hover:shadow-lg active:scale-[98%]",
            ])}
          >
            Get Started
          </Link>
        ) : (
          <Link
            to="/download/"
            className={cn([
              "mt-8 flex h-10 w-full cursor-pointer items-center justify-center text-sm font-medium transition-all",
              "rounded-full bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 shadow-xs hover:scale-[102%] hover:shadow-md active:scale-[98%]",
            ])}
          >
            Download for free
          </Link>
        )}
      </div>
    </div>
  );
}

function PricingLetterSection() {
  return (
    <section className="laptop:px-0 bg-[linear-gradient(to_right,#f5f5f5_1px,transparent_1px),linear-gradient(to_bottom,#f5f5f5_1px,transparent_1px)] bg-size-[24px_24px] bg-position-[12px_12px,12px_12px] px-4 py-16">
      <div className="mx-auto max-w-4xl">
        <div
          className="border border-neutral-200 p-4"
          style={{
            backgroundImage: "url(/api/images/texture/white-leather.png)",
          }}
        >
          <div
            className="rounded-xs border border-neutral-200 bg-stone-50 p-8 sm:p-12"
            style={{
              backgroundImage: "url(/api/images/texture/paper.png)",
            }}
          >
            <h2 className="mb-2 font-serif text-2xl text-stone-700 sm:text-3xl">
              A note on our pricing
            </h2>
            <p className="mb-6 text-sm text-neutral-500 italic">March 2026</p>

            <div className="flex flex-col gap-4 leading-relaxed text-neutral-700">
              <p>
                When we launched Char Pro six months ago, we set the price at
                $8/month — well below what it actually costs us to run the
                service. We did this intentionally. We wanted as many people as
                possible to experience what a privacy-first, no-bot meeting
                notepad could be, without price being a barrier.
              </p>
              <p>
                But we want to be honest with you about the economics. Cloud
                speech-to-text is expensive. The providers we rely on to deliver
                accurate, real-time transcription charge between $0.36 and $1.44
                per hour of audio:
              </p>

              <div className="my-2 overflow-hidden rounded-xs border border-neutral-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-stone-100/60">
                      <th className="px-4 py-2.5 text-left font-medium text-stone-700">
                        Provider
                      </th>
                      <th className="px-4 py-2.5 text-left font-medium text-stone-700">
                        Cost / hour
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    <tr>
                      <td className="px-4 py-2 text-neutral-700">
                        OpenAI Whisper API
                      </td>
                      <td className="px-4 py-2 text-neutral-700">$0.36</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-neutral-700">
                        Deepgram Nova-3
                      </td>
                      <td className="px-4 py-2 text-neutral-700">$0.46</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-neutral-700">
                        AssemblyAI Universal
                      </td>
                      <td className="px-4 py-2 text-neutral-700">$0.65+</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-neutral-700">
                        Google Cloud STT
                      </td>
                      <td className="px-4 py-2 text-neutral-700">$0.96</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-neutral-700">
                        AWS Transcribe
                      </td>
                      <td className="px-4 py-2 text-neutral-700">$1.44</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p>
                A single one-hour meeting can cost us $0.50 or more in STT alone
                — before accounting for LLM inference, infrastructure, and
                bandwidth. At $8/month, a user who records just two hours a week
                would already put us at a loss. Many of our most active users
                record far more than that.
              </p>
              <p>
                We absorbed this for the past six months because we believed in
                getting Char into your hands first. That early-bird pricing
                helped us learn, iterate, and build something we are genuinely
                proud of — and it would not have been possible without you.
              </p>
              <p>
                Going forward, we will be adjusting our Pro pricing to reflect
                the real cost of delivering the service. We are committed to
                keeping Char affordable — especially compared to alternatives
                that charge $20–30/month while locking away your data — but we
                need pricing that lets us keep building sustainably.
              </p>
              <p>
                The free tier is not going anywhere. If you prefer to bring your
                own API keys, Char remains fully functional at no cost. And if
                you are on the current early-bird plan, we will honor your rate
                for as long as your subscription stays active.
              </p>
              <p>
                Thank you for believing in us early. We are just getting
                started.
              </p>
            </div>

            <div className="mt-12 mb-4 flex gap-2">
              <Image
                src="/api/images/team/john.png"
                alt="John Jeong"
                width={32}
                height={32}
                className="rounded-full border border-neutral-200 object-cover"
              />
              <Image
                src="/api/images/team/yujong.png"
                alt="Yujong Lee"
                width={32}
                height={32}
                className="rounded-full border border-neutral-200 object-cover"
              />
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <p className="font-serif text-base font-medium text-neutral-600 italic">
                  Char
                </p>
                <p className="text-sm text-neutral-500">
                  John Jeong, Yujong Lee
                </p>
              </div>

              <div>
                <Image
                  src="/char-signature.svg"
                  alt="Char Signature"
                  width={124}
                  height={60}
                  layout="constrained"
                  className="object-contain opacity-80"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const faqs = [
    {
      question: "What does on-device transcription mean?",
      answer:
        "All transcription happens on your device. Your audio never leaves your computer, ensuring complete privacy.",
    },
    {
      question: "What is local-first data architecture?",
      answer:
        "Your data is filesystem-based by default: notes and transcripts are saved on your device first, and you stay in control of where files live.",
    },
    {
      question: "What is BYOK (Bring Your Own Key)?",
      answer:
        "BYOK allows you to connect your own LLM provider (like OpenAI, Anthropic, or self-hosted models) for AI features while maintaining full control over your data.",
    },
    {
      question: "What's included in shareable links?",
      answer:
        "Pro users get DocSend-like controls: track who views your notes, set expiration dates, and revoke access anytime.",
    },
    {
      question: "What are templates?",
      answer:
        "Templates are our opinionated way to structure summaries. You can pick from a variety of templates we provide and create your own version as needed.",
    },
    {
      question: "What are advanced templates?",
      answer:
        "Advanced templates let you override Char’s default system prompt by configuring template variables and the overall instructions given to the AI.",
    },
    {
      question: "What are shortcuts?",
      answer:
        "Shortcuts are saved prompts you use repeatedly, like “Write a follow-up to blog blah” or “Create a one-pager of the important stuff that’s been discussed.” They’re available in chat via the / command.",
    },
    {
      question: "Do you offer student discounts?",
      answer:
        "Yes, we provide student discounts. Contact us and we’ll help you get set up with student pricing.",
    },
  ];

  return (
    <section className="laptop:px-0 border-t border-neutral-100 px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-16 text-center font-serif text-3xl text-stone-700">
          Frequently Asked Questions
        </h2>
        <div className="flex flex-col gap-6">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="border-b border-neutral-100 pb-6 last:border-b-0"
            >
              <h3 className="mb-2 text-lg font-medium text-neutral-900">
                {faq.question}
              </h3>
              <p className="text-neutral-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="laptop:px-0 border-t border-neutral-100 bg-linear-to-t from-stone-50/30 to-stone-100/30 px-4 py-16">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="mb-4 flex size-40 items-center justify-center rounded-[48px] border border-neutral-100 bg-transparent shadow-2xl">
          <Image
            src="/api/images/hyprnote/icon.png"
            alt="Char"
            width={144}
            height={144}
            className="mx-auto size-36 rounded-[40px] border border-neutral-100"
          />
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl">Need a team plan?</h2>
        <p className="mx-auto max-w-2xl text-lg text-neutral-600">
          Book a call to discuss custom team pricing and enterprise solutions
        </p>
        <div className="pt-6">
          <Link
            to="/founders/"
            search={{ source: "team-plan" }}
            className="flex h-12 items-center justify-center rounded-full bg-linear-to-t from-stone-600 to-stone-500 px-6 text-base text-white shadow-md transition-all hover:scale-[102%] hover:shadow-lg active:scale-[98%] sm:text-lg"
          >
            Book a call
          </Link>
        </div>
      </div>
    </section>
  );
}
