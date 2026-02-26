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
      { label: "Bring Your Own Key (STT & LLM)", included: true },
      { label: "Export to PDF, TXT, Markdown", included: true },
      {
        label: "Local-first Data Architecture",
        included: true,
        tooltip:
          "Filesystem-based by default: notes and transcripts are stored on your device first.",
      },
      { label: "Templates & Chat", included: true },
      { label: "Integrations", included: false, comingSoon: true },
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
      {
        label: "Speaker Identification",
        included: true,
        comingSoon: true,
      },
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
      className="flex-1 bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <TeamPricingBanner />
        <HeroSection />
        <SlashSeparator />
        <PricingCardsSection />
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
        "bg-stone-50/70 border-b border-stone-100",
        "py-3 px-4",
        "font-serif text-sm text-stone-700",
      ])}
    >
      <span>
        <strong>Early Bird Discount:</strong> Get 68% off as we launch our new
        version and help with migration —{" "}
        <strong>offer ends February 28th</strong>
      </span>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="flex flex-col items-center text-center gap-6 py-24 px-4 laptop:px-0 border-b border-neutral-100">
      <div className="flex flex-col gap-4 max-w-3xl">
        <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-700">
          Pricing
        </h1>
        <p className="text-lg sm:text-xl text-neutral-600">
          Start for free, upgrade when you need cloud features.
        </p>
      </div>
    </section>
  );
}

function PricingCardsSection() {
  return (
    <section className="py-16 px-4 laptop:px-0">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
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
        "border rounded-xs overflow-hidden flex flex-col transition-transform",
        plan.popular
          ? "border-stone-600 shadow-lg relative scale-105"
          : "border-neutral-100",
      ])}
    >
      {plan.popular && (
        <div className="bg-stone-600 text-white text-center py-2 px-4 text-sm font-medium">
          Most Popular
        </div>
      )}

      <div className="p-8 flex-1 flex flex-col">
        <div className="mb-6">
          <h2 className="text-2xl font-serif text-stone-700 mb-2">
            {plan.name}
          </h2>
          <p className="text-sm text-neutral-600 mb-4">{plan.description}</p>

          {plan.price ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-serif text-stone-700">
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
                <span className="text-green-700 font-medium">(save 76%)</span>
              </div>
            </div>
          ) : (
            <div className="text-4xl font-serif text-stone-700">Free</div>
          )}
        </div>

        <div className="flex flex-col gap-3 flex-1">
          {plan.features.map((feature, idx) => {
            const IconComponent =
              feature.included === true
                ? CheckCircle2
                : feature.included === "partial"
                  ? MinusCircle
                  : XCircle;

            return (
              <div key={idx} className="flex gap-3 items-start">
                <IconComponent
                  className={cn([
                    "size-4.5 mt-0.5 shrink-0",
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
                    {feature.comingSoon && (
                      <span className="text-xs font-medium text-neutral-500 bg-neutral-200 px-2 py-0.5 rounded-full">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  {feature.tooltip && (
                    <div className="text-xs text-neutral-500 italic mt-0.5">
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
              "mt-8 w-full h-10 flex items-center justify-center text-sm font-medium transition-all cursor-pointer",
              "bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
            ])}
          >
            Get Started
          </Link>
        ) : (
          <Link
            to="/download/"
            className={cn([
              "mt-8 w-full h-10 flex items-center justify-center text-sm font-medium transition-all cursor-pointer",
              "bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 rounded-full shadow-xs hover:shadow-md hover:scale-[102%] active:scale-[98%]",
            ])}
          >
            Download for free
          </Link>
        )}
      </div>
    </div>
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
      question: "Do you offer student discounts?",
      answer:
        "Yes, we provide student discounts. Contact us and we’ll help you get set up with student pricing.",
    },
  ];

  return (
    <section className="py-16 px-4 laptop:px-0 border-t border-neutral-100">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-serif text-stone-700 mb-16 text-center">
          Frequently Asked Questions
        </h2>
        <div className="flex flex-col gap-6">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="border-b border-neutral-100 pb-6 last:border-b-0"
            >
              <h3 className="text-lg font-medium text-neutral-900 mb-2">
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
    <section className="py-16 border-t border-neutral-100 bg-linear-to-t from-stone-50/30 to-stone-100/30 px-4 laptop:px-0">
      <div className="flex flex-col gap-6 items-center text-center">
        <div className="mb-4 size-40 shadow-2xl border border-neutral-100 flex justify-center items-center rounded-[48px] bg-transparent">
          <Image
            src="/api/images/hyprnote/icon.png"
            alt="Char"
            width={144}
            height={144}
            className="size-36 mx-auto rounded-[40px] border border-neutral-100"
          />
        </div>
        <h2 className="text-2xl sm:text-3xl font-serif">Need a team plan?</h2>
        <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
          Book a call to discuss custom team pricing and enterprise solutions
        </p>
        <div className="pt-6">
          <Link
            to="/founders/"
            search={{ source: "team-plan" }}
            className="px-6 h-12 flex items-center justify-center text-base sm:text-lg bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all"
          >
            Book a call
          </Link>
        </div>
      </div>
    </section>
  );
}
