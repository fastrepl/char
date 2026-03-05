import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/enterprise")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Meeting AI configured for your organization - Char" },
      {
        name: "description",
        content:
          "Run meeting AI on your servers. Open source, auditable, and built so your data never leaves your network.",
      },
      {
        property: "og:title",
        content: "Meeting AI configured for your organization - Char",
      },
      {
        property: "og:description",
        content:
          "Other AI note-takers ask you to trust their infrastructure, their models, and their policies. We built one where you control all three.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://char.com/enterprise",
      },
    ],
  }),
});

const deploymentFeatures = [
  {
    text: "On-premise, private cloud (AWS VPC, Azure VNet, GCP VPC), or hybrid",
  },
  {
    text: "Air-gap compatible. Works without internet in isolated networks",
  },
  {
    text: "Desktop app (macOS now, Windows/Linux coming), web, mobile, or bot integration",
  },
  {
    text: "Swap STT and LLM providers anytime. Bring your own models, local or cloud",
  },
  {
    text: "Open source. Fork it if you want",
  },
];

const securityFeatures = [
  {
    text: "AES-256 encryption at rest. End-to-end encryption in development",
  },
  {
    text: "Zero-knowledge architecture. We can't read your data",
  },
  {
    text: "SSO (SAML, OAuth) and MFA",
  },
  {
    text: "All network traffic is inspectable. No black box",
  },
  {
    text: "Open source. Your security team can audit every line",
  },
];

const complianceFeatures = [
  {
    text: "HIPAA-compatible deployment for healthcare",
  },
  {
    text: "Data residency controls. Keep recordings in your geography (EU, US, custom regions)",
  },
  {
    text: "Consent workflows: voice-activated, pre-meeting links, or explicit prompts",
  },
  {
    text: "Configurable retention policies with automated deletion",
  },
  {
    text: "Audit logging for compliance reporting",
  },
  {
    text: "SOC 2 Type II certification in progress",
  },
];

const accessFeatures = [
  {
    text: "Role-based access (admin, user, viewer) with custom roles",
  },
  {
    text: "Team workspaces with isolated data boundaries",
  },
  {
    text: "LDAP and Active Directory integration for user provisioning",
  },
  {
    text: "Org-wide policy enforcement: recording defaults, AI features, retention",
  },
  {
    text: "Note-level permissions for sensitive meetings",
  },
  {
    text: "Audit logs showing who viewed what and when",
  },
];

const faqs = [
  {
    question: "How does Char handle data sovereignty?",
    answer:
      "Your data stays on your network. Recordings and transcripts don't leave it. Deploy on your own infrastructure and you're in full compliance with data residency requirements.",
  },
  {
    question: "How does recording consent work?",
    answer:
      "Participants always know when recording is on. You can use voice-activated consent, pre-meeting consent links, or explicit prompts when joining.",
  },
  {
    question: "How secure is the platform?",
    answer:
      "Security is the reason we built it this way. AES-256 encryption at rest, SSO and MFA, SOC 2 Type II certification in progress. The codebase is open source so your team can audit it directly.",
  },
  {
    question: "How do you manage access control?",
    answer:
      "Admins set who can access what. Role-based permissions, team workspaces, and you can scope access down to individual notes if needed.",
  },
  {
    question: "What deployment options are available?",
    answer:
      "Desktop app (macOS now, Windows and Linux coming), web interface, mobile apps, or bot integration for remote meetings. Pick what works for your team.",
  },
];

function Component() {
  return (
    <div
      className="min-h-screen overflow-x-hidden bg-linear-to-b from-white via-stone-50/20 to-white"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="mx-auto max-w-6xl border-x border-neutral-100 bg-white">
        <HeroSection />
        <FeaturesSection />
        <VerifiableSection />
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
        <header className="mx-auto mb-8 max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-stone-100 px-4 py-2 text-sm text-stone-600">
            <Icon icon="mdi:office-building" className="text-lg" />
            <span>For Enterprise</span>
          </div>
          <h1 className="mb-6 font-serif text-4xl tracking-tight text-stone-700 sm:text-5xl">
            Meeting AI configured
            <br />
            for your organization
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-neutral-600 sm:text-xl">
            Other AI note-takers ask you to trust their infrastructure, their
            models, and their policies. We built one where you control all
            three.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              to="/founders/"
              search={{ source: "enterprise" }}
              className={cn([
                "inline-flex items-center gap-2 rounded-full px-8 py-3 text-base font-medium",
                "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                "transition-transform hover:scale-105 active:scale-95",
              ])}
            >
              <Icon icon="mdi:calendar" className="text-xl" />
              <span>Schedule a Demo</span>
            </Link>
            <Link
              to="/opensource/"
              className={cn([
                "inline-block rounded-full px-8 py-3 text-base font-medium",
                "border border-stone-300 text-stone-600",
                "transition-colors hover:bg-stone-50",
              ])}
            >
              View Source Code
            </Link>
          </div>
          <div className="mt-6 text-sm text-neutral-500">
            Backed by Y Combinator
          </div>
        </header>
      </div>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section className="border-t border-neutral-100 px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <div className="grid gap-12 md:grid-cols-2">
          <FeatureBlock
            icon="mdi:server"
            number="1"
            title="Deployment"
            subtitle="Run it on your servers"
            features={deploymentFeatures}
          />
          <FeatureBlock
            icon="mdi:shield-lock"
            number="2"
            title="Security"
            subtitle="Passes the security review"
            features={securityFeatures}
          />
          <FeatureBlock
            icon="mdi:clipboard-check"
            number="3"
            title="Compliance"
            subtitle="Works in regulated industries"
            features={complianceFeatures}
          />
          <FeatureBlock
            icon="mdi:account-key"
            number="4"
            title="Access"
            subtitle="You decide who sees what"
            features={accessFeatures}
          />
        </div>
      </div>
    </section>
  );
}

function FeatureBlock({
  icon,
  number,
  title,
  subtitle,
  features,
}: {
  icon: string;
  number: string;
  title: string;
  subtitle: string;
  features: { text: string }[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100">
          <Icon icon={icon} className="text-2xl text-stone-600" />
        </div>
        <div>
          <div className="text-sm text-stone-500">
            {number}. {title}
          </div>
          <h3 className="text-lg font-medium text-stone-700">{subtitle}</h3>
        </div>
      </div>
      <ul className="ml-1 space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <Icon
              icon="mdi:check-circle"
              className="mt-0.5 flex-shrink-0 text-stone-500"
            />
            <span className="text-sm leading-relaxed text-neutral-600">
              {feature.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VerifiableSection() {
  return (
    <section className="border-t border-neutral-100 bg-stone-50/50 px-6 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mb-4 font-serif text-3xl text-stone-700">
          Vendor Promises vs. Verifiable Architecture
        </h2>
        <p className="mb-8 text-xl text-neutral-600">What Do You Choose?</p>
        <Link
          to="/github/"
          className={cn([
            "inline-flex items-center gap-2 rounded-full px-6 py-3 text-base font-medium",
            "border border-stone-300 text-stone-600",
            "transition-colors hover:bg-white",
          ])}
        >
          <Icon icon="mdi:code-braces" className="text-xl" />
          <span>Inspect the Code</span>
        </Link>
      </div>
    </section>
  );
}

function FAQSection() {
  return (
    <section className="border-t border-neutral-100 px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-8 text-center font-serif text-3xl text-stone-700">
          Frequently Asked Questions
        </h2>
        <div className="flex flex-col gap-6">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border-b border-neutral-100 pb-6 last:border-b-0"
            >
              <h3 className="mb-2 text-lg font-medium text-neutral-900">
                <span className="text-stone-600">Q:</span> {faq.question}
              </h3>
              <p className="text-neutral-600">
                <span className="font-medium text-stone-600">A:</span>{" "}
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="border-t border-neutral-100 bg-amber-50/50 px-6 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="mb-4 font-serif text-3xl text-stone-700">
          Deploy meeting AI on your terms
        </h2>
        <p className="mb-8 text-neutral-600">
          Tell us what you need and we'll figure out the setup.
        </p>
        <Link
          to="/founders/"
          search={{ source: "enterprise-cta" }}
          className={cn([
            "inline-flex items-center gap-2 rounded-full px-8 py-3 text-base font-medium",
            "bg-linear-to-t from-stone-600 to-stone-500 text-white",
            "transition-transform hover:scale-105 active:scale-95",
          ])}
        >
          <Icon icon="mdi:calendar" className="text-xl" />
          <span>Schedule a Demo</span>
        </Link>
      </div>
    </section>
  );
}
