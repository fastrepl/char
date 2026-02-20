import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

import { SlashSeparator } from "@/components/slash-separator";

export const Route = createFileRoute("/_view/privacy")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Privacy - Char" },
      {
        name: "description",
        content:
          "Your privacy is not just a feature at Char—it's our foundation. Learn how we protect your meeting data with local-first architecture and zero data collection.",
      },
      { property: "og:title", content: "Privacy - Char" },
      {
        property: "og:description",
        content:
          "We believe your conversations belong to you, not to us or anyone else. Discover how Char puts your privacy first.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hyprnote.com/privacy" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Privacy - Char" },
      {
        name: "twitter:description",
        content:
          "We believe your conversations belong to you, not to us or anyone else. Discover how Char puts your privacy first.",
      },
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
        <PrivacyPromiseSection />
        <SlashSeparator />
        <DataOwnershipSection />
        <SlashSeparator />
        <NoTrackingSection />
        <SlashSeparator />
        <TransparencySection />
        <SlashSeparator />
        <PrivacyComparisonSection />
        <SlashSeparator />
        <CTASection />
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30">
      <div className="px-6 py-12 lg:py-20">
        <header className="mb-12 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 rounded-full text-sm text-stone-600 mb-6">
            <Icon icon="mdi:eye-off" className="text-lg" />
            <span>Privacy-first by design</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-stone-600 mb-6">
            Your conversations
            <br />
            belong to you
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 leading-relaxed max-w-3xl mx-auto">
            At Char, we believe privacy isn't just a feature—it's a fundamental
            right. Your meeting conversations contain your most sensitive ideas,
            strategies, and personal moments. We've built Char to ensure they
            stay yours, and yours alone.
          </p>
        </header>
      </div>
    </div>
  );
}

function PrivacyPromiseSection() {
  const promises = [
    {
      icon: "mdi:cloud-off-outline",
      title: "No cloud uploads",
      description:
        "Your audio recordings and transcripts are processed and stored entirely on your device. We never upload your meeting content to our servers.",
    },
    {
      icon: "mdi:database-off",
      title: "No data collection",
      description:
        "We don't collect, analyze, or monetize your meeting data. Your conversations are not used to train AI models or sold to third parties.",
    },
    {
      icon: "mdi:account-off",
      title: "No account required",
      description:
        "Use Char without creating an account. Your identity remains private, and there's no profile data for us to store or leak.",
    },
    {
      icon: "mdi:chart-line",
      title: "Minimal telemetry",
      description:
        "Our optional, anonymized telemetry helps us improve the app without compromising your privacy. It's off by default and contains no personal data.",
    },
  ];

  return (
    <section className="px-6 py-12 lg:py-16">
      <h2 className="text-3xl font-serif text-stone-600 mb-4 text-center">
        Our privacy promise
      </h2>
      <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
        These aren't just policies—they're principles embedded in our
        architecture. We couldn't violate your privacy even if we wanted to.
      </p>
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {promises.map((promise, index) => (
          <div
            key={index}
            className="p-6 border border-neutral-200 rounded-lg bg-white"
          >
            <Icon
              icon={promise.icon}
              className="text-3xl text-stone-600 mb-4"
            />
            <h3 className="text-xl font-serif text-stone-600 mb-2">
              {promise.title}
            </h3>
            <p className="text-neutral-600">{promise.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DataOwnershipSection() {
  return (
    <section className="px-6 py-12 lg:py-16 bg-stone-50/30">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Icon
            icon="mdi:folder-lock"
            className="text-5xl text-stone-600 mb-4"
          />
          <h2 className="text-3xl font-serif text-stone-600 mb-4">
            You own your data, completely
          </h2>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            With Char, data ownership isn't a marketing term—it's a technical
            reality. Your data lives on your device, in formats you control.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center p-6">
            <Icon
              icon="mdi:folder-home"
              className="text-4xl text-stone-600 mb-4 mx-auto"
            />
            <h3 className="font-medium text-stone-600 mb-2">Local storage</h3>
            <p className="text-sm text-neutral-600">
              All your notes, recordings, and transcripts are stored in a local
              database on your computer. No cloud dependency, no remote access.
            </p>
          </div>
          <div className="text-center p-6">
            <Icon
              icon="mdi:export"
              className="text-4xl text-stone-600 mb-4 mx-auto"
            />
            <h3 className="font-medium text-stone-600 mb-2">Full export</h3>
            <p className="text-sm text-neutral-600">
              Export all your data anytime in standard formats. Your notes,
              transcripts, and recordings are always accessible and portable.
            </p>
          </div>
          <div className="text-center p-6">
            <Icon
              icon="mdi:delete-forever"
              className="text-4xl text-stone-600 mb-4 mx-auto"
            />
            <h3 className="font-medium text-stone-600 mb-2">True deletion</h3>
            <p className="text-sm text-neutral-600">
              When you delete something, it's gone. No hidden backups, no
              retention periods, no "soft deletes" that keep your data around.
            </p>
          </div>
        </div>

        <div className="mt-12 p-8 border border-neutral-200 rounded-lg bg-white">
          <div className="flex items-start gap-4">
            <Icon
              icon="mdi:sync-off"
              className="text-3xl text-stone-600 shrink-0"
            />
            <div>
              <h3 className="text-xl font-serif text-stone-600 mb-3">
                Optional sync, your choice
              </h3>
              <p className="text-neutral-600">
                If you choose to sync across devices, your data is encrypted
                before it leaves your device. We use end-to-end encryption so
                even our servers can't read your content. But sync is entirely
                optional—Char works perfectly as a standalone, offline
                application.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function NoTrackingSection() {
  return (
    <section className="px-6 py-12 lg:py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Icon
            icon="mdi:shield-off-outline"
            className="text-5xl text-stone-600 mb-4"
          />
          <h2 className="text-3xl font-serif text-stone-600 mb-4">
            No tracking, no profiling
          </h2>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            We don't track your behavior, build profiles, or analyze your
            content. Your meeting data is not a product.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <div className="p-6 border border-neutral-200 rounded-lg bg-white">
            <div className="flex items-start gap-4">
              <Icon
                icon="mdi:robot-off"
                className="text-2xl text-stone-600 shrink-0 mt-1"
              />
              <div>
                <h3 className="font-medium text-stone-600 mb-2">
                  No AI training on your data
                </h3>
                <p className="text-neutral-600">
                  Your transcripts and notes are never used to train AI models.
                  The AI features in Char run locally on your device, and your
                  content stays private.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 border border-neutral-200 rounded-lg bg-white">
            <div className="flex items-start gap-4">
              <Icon
                icon="mdi:target-account"
                className="text-2xl text-stone-600 shrink-0 mt-1"
              />
              <div>
                <h3 className="font-medium text-stone-600 mb-2">
                  No behavioral tracking
                </h3>
                <p className="text-neutral-600">
                  We don't track how you use the app, what features you access,
                  or how long you spend on different tasks. Your usage patterns
                  are your business.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 border border-neutral-200 rounded-lg bg-white">
            <div className="flex items-start gap-4">
              <Icon
                icon="mdi:currency-usd-off"
                className="text-2xl text-stone-600 shrink-0 mt-1"
              />
              <div>
                <h3 className="font-medium text-stone-600 mb-2">
                  No data monetization
                </h3>
                <p className="text-neutral-600">
                  We make money by building a great product, not by selling your
                  data. Your information is never shared with advertisers, data
                  brokers, or any third parties.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TransparencySection() {
  return (
    <section className="px-6 py-12 lg:py-16 bg-stone-50/30">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Icon
            icon="mdi:code-braces"
            className="text-5xl text-stone-600 mb-4"
          />
          <h2 className="text-3xl font-serif text-stone-600 mb-4">
            Verify, don't trust
          </h2>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            We don't ask you to take our word for it. Char is fully open source,
            so you can verify every privacy claim yourself.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="p-6 border border-neutral-200 rounded-lg bg-white">
            <Icon
              icon="mdi:source-repository"
              className="text-3xl text-stone-600 mb-4"
            />
            <h3 className="text-xl font-serif text-stone-600 mb-2">
              Open source code
            </h3>
            <p className="text-neutral-600">
              Every line of code is public. See exactly how your data is
              handled, what network requests are made, and where your
              information is stored. No black boxes, no hidden behaviors.
            </p>
          </div>
          <div className="p-6 border border-neutral-200 rounded-lg bg-white">
            <Icon
              icon="mdi:file-document-check"
              className="text-3xl text-stone-600 mb-4"
            />
            <h3 className="text-xl font-serif text-stone-600 mb-2">
              Clear documentation
            </h3>
            <p className="text-neutral-600">
              Our privacy practices are documented in plain language. We explain
              what data exists, where it lives, and how it's protected—without
              legal jargon or hidden clauses.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://github.com/fastrepl/char"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 text-stone-600 hover:text-stone-800 font-medium"
          >
            <Icon icon="mdi:github" className="text-lg" />
            View source code
            <Icon icon="mdi:arrow-right" className="text-lg" />
          </a>
          <a
            href="/legal/privacy"
            className="inline-flex items-center justify-center gap-2 text-stone-600 hover:text-stone-800 font-medium"
          >
            <Icon icon="mdi:file-document" className="text-lg" />
            Read privacy policy
            <Icon icon="mdi:arrow-right" className="text-lg" />
          </a>
        </div>
      </div>
    </section>
  );
}

function PrivacyComparisonSection() {
  const comparisons = [
    {
      feature: "Audio processing",
      hyprnote: "On your device",
      others: "Cloud servers",
    },
    {
      feature: "Data storage",
      hyprnote: "Local only",
      others: "Their servers",
    },
    {
      feature: "AI training",
      hyprnote: "Never",
      others: "Often",
    },
    {
      feature: "Account required",
      hyprnote: "No",
      others: "Yes",
    },
    {
      feature: "Data monetization",
      hyprnote: "Never",
      others: "Common",
    },
    {
      feature: "Source code",
      hyprnote: "Open",
      others: "Closed",
    },
  ];

  return (
    <section className="px-6 py-12 lg:py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-serif text-stone-600 mb-4">
            How we compare
          </h2>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            Most meeting tools treat your data as their asset. We built Char
            differently.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="text-left py-4 px-4 font-medium text-stone-600">
                  Feature
                </th>
                <th className="text-center py-4 px-4 font-medium text-stone-600 bg-stone-50">
                  Char
                </th>
                <th className="text-center py-4 px-4 font-medium text-neutral-500">
                  Others
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((row, index) => (
                <tr key={index} className="border-b border-neutral-100">
                  <td className="py-4 px-4 text-neutral-600">{row.feature}</td>
                  <td className="py-4 px-4 text-center bg-stone-50">
                    <span className="inline-flex items-center gap-2 text-stone-600 font-medium">
                      <Icon
                        icon="mdi:check-circle"
                        className="text-lg text-green-600"
                      />
                      {row.hyprnote}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center text-neutral-500">
                    {row.others}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="px-6 py-16 lg:py-20 bg-stone-50/30">
      <div className="max-w-3xl mx-auto text-center">
        <Icon
          icon="mdi:shield-lock"
          className="text-5xl text-stone-600 mb-6 mx-auto"
        />
        <h2 className="text-3xl font-serif text-stone-600 mb-4">
          Take back control of your meeting data
        </h2>
        <p className="text-neutral-600 mb-8">
          Join thousands of professionals who refuse to compromise on privacy.
          Your conversations deserve better.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/download/"
            className={cn([
              "inline-flex items-center justify-center gap-2 px-8 py-3 text-base font-medium rounded-full",
              "bg-linear-to-t from-stone-600 to-stone-500 text-white",
              "hover:scale-105 active:scale-95 transition-transform shadow-md hover:shadow-lg",
            ])}
          >
            <Icon icon="mdi:download" className="text-lg" />
            Download Char
          </Link>
          <Link
            to="/security/"
            className={cn([
              "inline-flex items-center justify-center px-8 py-3 text-base font-medium rounded-full",
              "border border-neutral-300 text-stone-600",
              "hover:bg-stone-50 transition-colors",
            ])}
          >
            Learn about security
          </Link>
        </div>
      </div>
    </section>
  );
}
