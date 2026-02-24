import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/enterprise")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Meeting AI Configured For Your Organization - Hyprnote" },
      {
        name: "description",
        content:
          "Deploy meeting AI on your infrastructure with full control over deployment, security, compliance, and access. Open source architecture you can verify and audit.",
      },
      {
        property: "og:title",
        content: "Meeting AI Configured For Your Organization - Hyprnote",
      },
      {
        property: "og:description",
        content:
          "Other AI note-takers ask you to trust their infrastructure, their models, and their policies. We built one where you control all three.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://hyprnote.com/enterprise",
      },
    ],
  }),
});

const deploymentFeatures = [
  {
    text: "On-premise servers, private cloud (AWS VPC, Azure VNet, GCP VPC), or hybrid deployments",
  },
  {
    text: "Air-gap compatible, works without internet connectivity in isolated networks",
  },
  {
    text: "Desktop apps (macOS now, Windows/Linux coming), web interface, mobile, or bot integration",
  },
  {
    text: "Bring your own models, swap STT and LLM providers anytime (local or cloud)",
  },
  {
    text: "No vendor lock-in, open source architecture you can fork if needed",
  },
];

const securityFeatures = [
  {
    text: "Encryption at rest (AES-256) with end-to-end encryption in development",
  },
  {
    text: "Zero-knowledge architecture. We can't access your unencrypted data",
  },
  {
    text: "SSO integration (SAML, OAuth) with multi-factor authentication",
  },
  {
    text: "Network traffic you can inspect yourself, no black box processing",
  },
  {
    text: "Open source codebase your security team can audit",
  },
];

const complianceFeatures = [
  {
    text: "HIPAA-compatible deployment options for healthcare environments",
  },
  {
    text: "Data residency controls, keep recordings in your geography (EU, US, custom regions)",
  },
  {
    text: "Multiple consent workflows: voice-activated, pre-meeting links, explicit prompts",
  },
  {
    text: "Configurable retention policies with automated deletion schedules",
  },
  {
    text: "Comprehensive audit logging for compliance reporting",
  },
  {
    text: "SOC 2 Type II certification in progress",
  },
];

const accessFeatures = [
  {
    text: "Role-based access control (admin, user, viewer) with custom role creation",
  },
  {
    text: "Team workspaces with isolated data boundaries",
  },
  {
    text: "Directory service integration (LDAP, Active Directory) for user provisioning",
  },
  {
    text: "Organization-wide policy enforcement (recording defaults, AI features, retention)",
  },
  {
    text: "Individual note-level permissions for sensitive meetings",
  },
  {
    text: "Access audit logs showing who viewed what and when",
  },
];

const faqs = [
  {
    question:
      "How can I boost my team's productivity while ensuring data sovereignty?",
    answer:
      "Deploy Hyprnote on your own infrastructure to maintain complete control over your data. Your meeting recordings and transcripts never leave your network, ensuring full compliance with data residency requirements.",
  },
  {
    question:
      "Is there a way to ensure consents are properly granted and managed?",
    answer:
      "Hyprnote provides multiple consent options including voice-activated consent during meetings, pre-meeting consent links, and explicit consent prompts when joining. We prioritize transparency and respect in every recording scenario.",
  },
  {
    question: "How secure is the platform?",
    answer:
      "We deeply prioritize security. We're working on end-to-end encryption, seamless SSO and MFA integration, and are actively pursuing SOC 2 Type II certification. All enterprise deployments meet industry-standard security requirements.",
  },
  {
    question: "How do you manage access control?",
    answer:
      "Administrators have granular control over permissions, team workspaces, and user access. Set role-based permissions, manage team structures, and maintain centralized oversight across your entire organization.",
  },
  {
    question: "What deployment options are available?",
    answer:
      "Hyprnote adapts to your workflow with multiple form factors: native desktop applications (currently available for macOS), web interface, mobile apps, or even bot integration for remote meeting capture. Choose the deployment method that works best for your team.",
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
        <header className="mb-8 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-stone-100 text-stone-600 text-sm mb-6">
            <Icon icon="mdi:office-building" className="text-lg" />
            <span>For Enterprise</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
            Meeting AI Configured
            <br />
            For Your Organization
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto">
            Other AI note-takers ask you to trust their infrastructure, their
            models, and their policies. We built one where you control all
            three.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/founders/"
              search={{ source: "enterprise" }}
              className={cn([
                "inline-flex items-center gap-2 px-8 py-3 text-base font-medium rounded-full",
                "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                "hover:scale-105 active:scale-95 transition-transform",
              ])}
            >
              <Icon icon="mdi:calendar" className="text-xl" />
              <span>Schedule a Demo</span>
            </Link>
            <Link
              to="/opensource/"
              className={cn([
                "inline-block px-8 py-3 text-base font-medium rounded-full",
                "border border-stone-300 text-stone-600",
                "hover:bg-stone-50 transition-colors",
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
    <section className="px-6 py-16 border-t border-neutral-100">
      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12">
          <FeatureBlock
            icon="mdi:server"
            number="1"
            title="Deployment"
            subtitle="Your infrastructure, your rules"
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
            subtitle="Built for regulated environments"
            features={complianceFeatures}
          />
          <FeatureBlock
            icon="mdi:account-key"
            number="4"
            title="Access"
            subtitle="Centralized oversight, granular control"
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
        <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center">
          <Icon icon={icon} className="text-2xl text-stone-600" />
        </div>
        <div>
          <div className="text-sm text-stone-500">
            {number}. {title}
          </div>
          <h3 className="text-lg font-medium text-stone-700">{subtitle}</h3>
        </div>
      </div>
      <ul className="space-y-2 ml-1">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <Icon
              icon="mdi:check-circle"
              className="text-stone-500 mt-0.5 flex-shrink-0"
            />
            <span className="text-neutral-600 text-sm leading-relaxed">
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
    <section className="px-6 py-16 bg-stone-50/50 border-t border-neutral-100">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-serif text-stone-600 mb-4">
          Vendor Promises vs. Verifiable Architecture
        </h2>
        <p className="text-xl text-neutral-600 mb-8">What Do You Choose?</p>
        <Link
          to="/github/"
          className={cn([
            "inline-flex items-center gap-2 px-6 py-3 text-base font-medium rounded-full",
            "border border-stone-300 text-stone-600",
            "hover:bg-white transition-colors",
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
    <section className="px-6 py-16 border-t border-neutral-100">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">
          Frequently Asked Questions
        </h2>
        <div className="flex flex-col gap-6">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border-b border-neutral-100 pb-6 last:border-b-0"
            >
              <h3 className="text-lg font-medium text-neutral-900 mb-2">
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
    <section className="px-6 py-16 bg-amber-50/50 border-t border-neutral-100">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-serif text-stone-600 mb-4">
          Deploy meeting AI on your terms
        </h2>
        <p className="text-neutral-600 mb-8">
          Let's walk through your deployment, security, and compliance
          requirements.
        </p>
        <Link
          to="/founders/"
          search={{ source: "enterprise-cta" }}
          className={cn([
            "inline-flex items-center gap-2 px-8 py-3 text-base font-medium rounded-full",
            "bg-linear-to-t from-stone-600 to-stone-500 text-white",
            "hover:scale-105 active:scale-95 transition-transform",
          ])}
        >
          <Icon icon="mdi:calendar" className="text-xl" />
          <span>Schedule a Demo</span>
        </Link>
      </div>
    </section>
  );
}
