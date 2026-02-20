import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { cn } from "@hypr/utils";

import { Image } from "@/components/image";
import { SlashSeparator } from "@/components/slash-separator";
import { usePlatform } from "@/hooks/use-platform";
import { useAnalytics } from "@/hooks/use-posthog";

export const Route = createFileRoute("/_view/download/")({
  component: Component,
});

function Component() {
  const platform = usePlatform();
  const isMacDesktop = platform === "mac";

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
            available with cloud-based transcription. Windows and Linux coming
            March 2026.
          </span>
        </div>

        <div className="py-12">
          <section className="py-16 px-4 sm:px-6">
            <div className="flex flex-col gap-6 max-w-2xl mx-auto text-center mb-16">
              <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600">
                Download Char
              </h1>
              <p className="text-lg sm:text-xl text-neutral-600">
                Choose your platform to get started with Char
              </p>
            </div>

            <div className="mb-16">
              <h2 className="text-2xl font-serif tracking-tight mb-6 text-center">
                Desktop
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DownloadCard
                  iconName="simple-icons:apple"
                  spec="macOS 14.2+ (Apple Silicon)"
                  downloadUrl="/download/apple-silicon"
                  available={true}
                  platform="macos-apple-silicon"
                />
                <DownloadCard
                  iconName="simple-icons:apple"
                  spec="macOS 14.2+ (Intel)"
                  downloadUrl="/download/apple-intel"
                  available={true}
                  platform="macos-intel"
                />
                <DownloadCard
                  iconName="simple-icons:windows"
                  spec="Windows"
                  downloadUrl="#"
                  available={false}
                  platform="windows"
                />
              </div>

              <h2 className="text-2xl font-serif tracking-tight mb-6 mt-16 text-center">
                Linux
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <DownloadCard
                  iconName="simple-icons:linux"
                  spec="Linux (AppImage)"
                  downloadUrl="#"
                  available={false}
                  platform="linux-appimage"
                />
                <DownloadCard
                  iconName="simple-icons:linux"
                  spec="Linux (.deb)"
                  downloadUrl="#"
                  available={false}
                  platform="linux-deb"
                />
              </div>
            </div>

            {isMacDesktop && (
              <div className="mb-16">
                <h2 className="text-2xl font-serif tracking-tight mb-6 text-center">
                  Homebrew
                </h2>
                <div className="max-w-2xl mx-auto">
                  <HomebrewCard />
                </div>
              </div>
            )}

            <div className="mb-16">
              <div className="flex flex-col items-center gap-2 mb-6">
                <h2 className="text-2xl font-serif tracking-tight text-center">
                  Nightly Builds
                </h2>
                <p className="text-sm text-neutral-500 text-center max-w-lg">
                  Get the latest features before they are officially released.
                  Nightly builds may be less stable.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DownloadCard
                  iconName="simple-icons:apple"
                  spec="macOS 14.2+ (Apple Silicon)"
                  downloadUrl="/download/nightly/apple-silicon"
                  available={true}
                  platform="macos-apple-silicon-nightly"
                  beta={true}
                />
                <DownloadCard
                  iconName="simple-icons:apple"
                  spec="macOS 14.2+ (Intel)"
                  downloadUrl="/download/nightly/apple-intel"
                  available={true}
                  platform="macos-intel-nightly"
                  beta={true}
                />
                <DownloadCard
                  iconName="simple-icons:windows"
                  spec="Windows"
                  downloadUrl="/download/nightly/windows"
                  available={false}
                  platform="windows-nightly"
                  beta={true}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mt-6">
                <DownloadCard
                  iconName="simple-icons:linux"
                  spec="Linux (AppImage)"
                  downloadUrl="/download/nightly/linux-appimage"
                  available={false}
                  platform="linux-appimage-nightly"
                  beta={true}
                />
                <DownloadCard
                  iconName="simple-icons:linux"
                  spec="Linux (.deb)"
                  downloadUrl="/download/nightly/linux-deb"
                  available={false}
                  platform="linux-deb-nightly"
                  beta={true}
                />
                <DownloadCard
                  iconName="simple-icons:linux"
                  spec="Linux ARM (AppImage)"
                  downloadUrl="/download/nightly/linux-appimage-aarch64"
                  available={false}
                  platform="linux-appimage-aarch64-nightly"
                  beta={true}
                />
                <DownloadCard
                  iconName="simple-icons:linux"
                  spec="Linux ARM (.deb)"
                  downloadUrl="/download/nightly/linux-deb-aarch64"
                  available={false}
                  platform="linux-deb-aarch64-nightly"
                  beta={true}
                />
              </div>

              {isMacDesktop && (
                <div className="max-w-2xl mx-auto mt-6">
                  <HomebrewNightlyCard />
                </div>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-serif tracking-tight mb-6 text-center">
                Mobile
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <DownloadCard
                  iconName="simple-icons:ios"
                  spec="iOS 15+"
                  downloadUrl="#"
                  available={false}
                  platform="ios"
                />
                <DownloadCard
                  iconName="simple-icons:android"
                  spec="Android 10+"
                  downloadUrl="#"
                  available={false}
                  platform="android"
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

function HomebrewCard() {
  const [copied, setCopied] = useState(false);
  const command = "brew tap fastrepl/hyprnote && brew install hyprnote --cask";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center p-6 rounded-xs border border-neutral-100 bg-white">
      <Icon
        icon="simple-icons:homebrew"
        className="text-5xl text-neutral-700 mb-4"
      />
      <p className="text-sm text-neutral-600 mb-4 text-center">
        Install via Homebrew on macOS
      </p>
      <div className="w-full group relative">
        <code className="flex items-center justify-between w-full px-4 py-3 bg-stone-50 border border-neutral-200 rounded-lg text-sm font-mono text-stone-700">
          <span className="flex-1 text-center">{command}</span>
          <button
            onClick={handleCopy}
            className={cn([
              "cursor-pointer flex items-center justify-center transition-all relative",
              "ml-2 px-2 py-1 rounded",
              copied
                ? ["opacity-100 text-green-600"]
                : [
                    "opacity-30 group-hover:opacity-100 text-neutral-600 hover:bg-stone-100",
                  ],
            ])}
          >
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            {copied && (
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-stone-800 text-white text-xs rounded whitespace-nowrap">
                Copied!
              </span>
            )}
          </button>
        </code>
      </div>
    </div>
  );
}

function HomebrewNightlyCard() {
  const [copied, setCopied] = useState(false);
  const command =
    "brew tap fastrepl/hyprnote && brew install char@nightly --cask";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center p-6 rounded-xs border border-neutral-100 bg-white">
      <Icon
        icon="simple-icons:homebrew"
        className="text-5xl text-neutral-700 mb-4"
      />
      <p className="text-sm text-neutral-600 mb-4 text-center">
        Install nightly via Homebrew on macOS
      </p>
      <div className="w-full group relative">
        <code className="flex items-center justify-between w-full px-4 py-3 bg-stone-50 border border-neutral-200 rounded-lg text-sm font-mono text-stone-700">
          <span className="flex-1 text-center">{command}</span>
          <button
            onClick={handleCopy}
            className={cn([
              "cursor-pointer flex items-center justify-center transition-all relative",
              "ml-2 px-2 py-1 rounded",
              copied
                ? ["opacity-100 text-green-600"]
                : [
                    "opacity-30 group-hover:opacity-100 text-neutral-600 hover:bg-stone-100",
                  ],
            ])}
          >
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            {copied && (
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-stone-800 text-white text-xs rounded whitespace-nowrap">
                Copied!
              </span>
            )}
          </button>
        </code>
      </div>
    </div>
  );
}

function DownloadCard({
  iconName,
  spec,
  downloadUrl,
  available,
  platform,
  beta = false,
}: {
  iconName: string;
  spec: string;
  downloadUrl: string;
  available: boolean;
  platform: string;
  beta?: boolean;
}) {
  const { track } = useAnalytics();

  const handleClick = () => {
    track("download_clicked", {
      platform,
      spec,
      source: "download_page",
    });
  };

  return (
    <div className="flex flex-col items-center p-6 rounded-xs border border-neutral-100 bg-white hover:bg-stone-50 transition-all duration-200">
      <Icon icon={iconName} className="text-5xl text-neutral-700 mb-4" />
      <p className="text-sm text-neutral-600 mb-6 text-center">{spec}</p>

      {available ? (
        <div className="relative w-full group/tooltip">
          <a
            href={downloadUrl}
            download
            onClick={handleClick}
            className="group gap-2 w-full px-4 h-11 flex items-center justify-center bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all text-base font-medium"
          >
            {beta ? (
              <>
                Download <span className="font-mono">Nightly</span>
              </>
            ) : (
              "Download"
            )}
            <Icon
              icon="ph:arrow-circle-right"
              className="text-xl group-hover:translate-x-1 transition-transform"
            />
          </a>
        </div>
      ) : (
        <button
          disabled
          className={cn([
            "w-full px-4 h-11 rounded-full font-medium cursor-not-allowed",
            "bg-linear-to-t from-stone-600 to-stone-500 text-white",
            "opacity-50",
          ])}
        >
          Planned
        </button>
      )}
    </div>
  );
}

function FAQSection() {
  const faqs = [
    {
      question: "Which platforms are currently supported?",
      answer:
        "macOS 14.2+ with Apple Silicon is currently available. Windows and Linux are planned for March 2026, and iOS/Android for April 2026. Please note that these dates are subject to change and may be delayed.",
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
        <h2 className="text-3xl font-serif text-stone-600 mb-16 text-center">
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
