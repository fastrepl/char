import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { cn } from "@hypr/utils";

import { Image } from "@/components/image";
import { SlashSeparator } from "@/components/slash-separator";
import { useAnalytics } from "@/hooks/use-posthog";

export const Route = createFileRoute("/_view/download/")({
  component: Component,
});

function Component() {
  return (
    <div
      className="bg-linear-to-b from-white via-blue-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto bg-white border-x border-neutral-100">
        <div
          className={cn([
            "flex items-center justify-center gap-2 text-center",
            "bg-stone-50/70 border-b border-stone-100",
            "py-3 px-4",
            "font-serif text-sm text-stone-700",
            "hover:bg-stone-50 transition-all",
          ])}
        >
          <span>
            Mac (Apple Silicon) features on-device speech-to-text. Intel Mac
            available with cloud-based transcription.
          </span>
        </div>

        <div className="py-12">
          <section className="py-16 px-4 sm:px-6">
            <div className="flex flex-col gap-6 max-w-2xl mx-auto text-center mb-16">
              <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-700">
                Download Char
              </h1>
              <p className="text-lg sm:text-xl text-neutral-600">
                Choose your platform to get started with Char
              </p>
            </div>

            <div className="mb-16">
              <h2 className="text-2xl font-serif tracking-tight mb-6 text-center">
                macOS
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <DownloadCard
                  iconName="simple-icons:apple"
                  spec="macOS 14.2+ (Apple Silicon)"
                  downloadUrl="/download/apple-silicon"
                  nightlyDownloadUrl="/download/nightly/apple-silicon"
                  platform="macos-apple-silicon"
                />
                <DownloadCard
                  iconName="simple-icons:apple"
                  spec="macOS 14.2+ (Intel)"
                  downloadUrl="/download/apple-intel"
                  nightlyDownloadUrl="/download/nightly/apple-intel"
                  platform="macos-intel"
                />
              </div>
            </div>
          </section>
          <SlashSeparator />
          <FAQSection />
          <SlashSeparator />
          <CTASection />
        </div>
      </div>
    </div>
  );
}

function DownloadCard({
  iconName,
  spec,
  downloadUrl,
  nightlyDownloadUrl,
  platform,
}: {
  iconName: string;
  spec: string;
  downloadUrl: string;
  nightlyDownloadUrl: string;
  platform: string;
}) {
  const { track } = useAnalytics();
  const [isNightly, setIsNightly] = useState(false);

  const handleClick = () => {
    track("download_clicked", {
      platform: isNightly ? `${platform}-nightly` : platform,
      spec,
      source: "download_page",
    });
  };

  return (
    <div
      className={cn([
        "flex flex-col items-center p-6 rounded-xs border transition-all duration-200",
        isNightly
          ? ["bg-blue-50/50 border-blue-200"]
          : ["bg-white border-neutral-100 hover:bg-stone-50"],
      ])}
    >
      <Icon icon={iconName} className="text-5xl text-neutral-700 mb-4" />
      <p className="text-sm text-neutral-600 mb-6 text-center">{spec}</p>

      <div className="relative w-full group/tooltip">
        <a
          href={isNightly ? nightlyDownloadUrl : downloadUrl}
          download
          onClick={handleClick}
          className={cn([
            "group gap-2 w-full px-4 h-11 flex items-center justify-center rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all text-base font-medium",
            isNightly
              ? ["bg-linear-to-b from-[#03BCF1] to-[#127FE5] text-white"]
              : ["bg-linear-to-t from-stone-600 to-stone-500 text-white"],
          ])}
        >
          {isNightly ? "Download Nightly" : "Download"}
          <Icon
            icon="ph:arrow-circle-right"
            className="text-xl group-hover:translate-x-1 transition-transform"
          />
        </a>
      </div>

      <button
        onClick={() => setIsNightly(!isNightly)}
        className="mt-3 text-xs text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
      >
        {isNightly
          ? "It might be less stable though."
          : "Want to get faster updates?"}
      </button>
    </div>
  );
}

function FAQSection() {
  const faqs = [
    {
      question: "Which platforms are currently supported?",
      answer:
        "macOS 14.2+ with both Apple Silicon and Intel is currently available. Windows and Linux are planned for March 2026, and iOS/Android for April 2026.",
    },
    {
      question: "What's special about the Mac version?",
      answer:
        "The Mac (Apple Silicon) version features on-device speech-to-text, ensuring your audio never leaves your device for complete privacy.",
    },
    {
      question: "Do I need an internet connection?",
      answer:
        "For the free version with local transcription on Mac, no internet is required. Cloud features in the Pro plan require an internet connection.",
    },
    {
      question: "How do I get started after downloading?",
      answer:
        "Simply install the app and launch it. For the free version, you can optionally bring your own API keys for LLM features. Check our documentation for detailed setup instructions.",
    },
  ];

  return (
    <section className="py-16 px-4 laptop:px-0">
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
    <section className="py-16 bg-linear-to-t from-stone-50/30 to-stone-100/30 px-4 laptop:px-0">
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
        <h2 className="text-2xl sm:text-3xl font-serif">
          Need something else?
        </h2>
        <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
          Book a call to discuss custom solutions for your specific needs
        </p>
        <div className="pt-6">
          <Link
            to="/founders/"
            search={{ source: "download" }}
            className="px-6 h-12 flex items-center justify-center text-base sm:text-lg bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all"
          >
            Book a call
          </Link>
        </div>
      </div>
    </section>
  );
}
