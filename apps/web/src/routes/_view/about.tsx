import { Icon } from "@iconify-icon/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Mail, Menu, X, XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@hypr/ui/components/ui/resizable";
import { useIsMobile } from "@hypr/ui/hooks/use-mobile";
import { cn } from "@hypr/utils";

import { Image } from "@/components/image";
import { MockWindow } from "@/components/mock-window";
import { FOUNDERS, TEAM_PHOTOS } from "@/lib/team";

type AboutSearch = {
  type?: "story" | "founder" | "photo";
  id?: string;
};

export const Route = createFileRoute("/_view/about")({
  component: Component,
  validateSearch: (search: Record<string, unknown>): AboutSearch => {
    return {
      type:
        search.type === "story" ||
        search.type === "founder" ||
        search.type === "photo"
          ? search.type
          : undefined,
      id: typeof search.id === "string" ? search.id : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Team - Hyprnote Press Kit" },
      {
        name: "description",
        content: "Meet the Hyprnote team and download team photos.",
      },
    ],
  }),
});

type SelectedItem =
  | { type: "story" }
  | { type: "founder"; data: (typeof FOUNDERS)[number] }
  | { type: "photo"; data: (typeof TEAM_PHOTOS)[number] };

function Component() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);

  useEffect(() => {
    if (search.type === "story") {
      setSelectedItem({ type: "story" });
    } else if (search.type === "founder" && search.id) {
      const founder = FOUNDERS.find((f) => f.id === search.id);
      if (founder) {
        setSelectedItem({ type: "founder", data: founder });
      } else {
        setSelectedItem(null);
      }
    } else if (search.type === "photo" && search.id) {
      const photo = TEAM_PHOTOS.find((p) => p.id === search.id);
      if (photo) {
        setSelectedItem({ type: "photo", data: photo });
      } else {
        setSelectedItem(null);
      }
    } else {
      setSelectedItem(null);
    }
  }, [search.type, search.id]);

  const handleSetSelectedItem = (item: SelectedItem | null) => {
    setSelectedItem(item);
    if (item === null) {
      navigate({ search: {}, resetScroll: false });
    } else if (item.type === "story") {
      navigate({ search: { type: "story" }, resetScroll: false });
    } else if (item.type === "founder") {
      navigate({
        search: { type: "founder", id: item.data.id },
        resetScroll: false,
      });
    } else if (item.type === "photo") {
      navigate({
        search: { type: "photo", id: item.data.id },
        resetScroll: false,
      });
    }
  };

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <HeroSection />
        <AboutContentSection
          selectedItem={selectedItem}
          setSelectedItem={handleSetSelectedItem}
        />
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <div className="px-6 py-16 lg:py-24">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
          About
        </h1>
        <p className="text-lg sm:text-xl text-neutral-600">
          Learn about Hyprnote, meet our team, and discover the story behind our
          privacy-first note-taking platform.
        </p>
      </div>
    </div>
  );
}

function AboutContentSection({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem | null;
  setSelectedItem: (item: SelectedItem | null) => void;
}) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <section className="px-6 pb-16 lg:pb-24">
      <div className="max-w-4xl mx-auto">
        <MockWindow
          title="About"
          className="rounded-lg w-full max-w-none"
          prefixIcons={
            isMobile &&
            selectedItem && (
              <button
                onClick={() => setDrawerOpen(true)}
                className="p-1 hover:bg-neutral-200 rounded transition-colors"
                aria-label="Open navigation"
              >
                <Menu className="w-4 h-4 text-neutral-600" />
              </button>
            )
          }
        >
          <div className="h-120 relative">
            {!selectedItem ? (
              <AboutGridView setSelectedItem={setSelectedItem} />
            ) : isMobile ? (
              <>
                <MobileSidebarDrawer
                  open={drawerOpen}
                  onClose={() => setDrawerOpen(false)}
                  selectedItem={selectedItem}
                  setSelectedItem={setSelectedItem}
                />
                <AboutDetailContent
                  selectedItem={selectedItem}
                  setSelectedItem={setSelectedItem}
                />
              </>
            ) : (
              <AboutDetailView
                selectedItem={selectedItem}
                setSelectedItem={setSelectedItem}
              />
            )}
          </div>

          <AboutStatusBar selectedItem={selectedItem} />
        </MockWindow>
      </div>
    </section>
  );
}

function AboutGridView({
  setSelectedItem,
}: {
  setSelectedItem: (item: SelectedItem) => void;
}) {
  return (
    <div className="p-8 overflow-y-auto h-120">
      <OurStoryGrid setSelectedItem={setSelectedItem} />
      <FoundersGrid setSelectedItem={setSelectedItem} />
      <TeamPhotosGrid setSelectedItem={setSelectedItem} />
    </div>
  );
}

function OurStoryGrid({
  setSelectedItem,
}: {
  setSelectedItem: (item: SelectedItem) => void;
}) {
  return (
    <div className="mb-8">
      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4 px-2">
        Our Story
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 content-start">
        <button
          onClick={() => setSelectedItem({ type: "story" })}
          className="group flex flex-col items-center text-center p-4 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer h-fit"
        >
          <div className="mb-3 w-16 h-16 flex items-center justify-center">
            <Image
              src="/api/images/icons/textedit.webp"
              alt="Our Story"
              width={64}
              height={64}
              className="w-16 h-16 group-hover:scale-110 transition-transform"
            />
          </div>
          <div className="font-medium text-stone-600">Our Story.txt</div>
        </button>
      </div>
    </div>
  );
}

function FoundersGrid({
  setSelectedItem,
}: {
  setSelectedItem: (item: SelectedItem) => void;
}) {
  return (
    <div className="mb-8 border-t border-neutral-100 pt-8">
      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4 px-2">
        Founders
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 content-start">
        {FOUNDERS.map((founder) => (
          <button
            key={founder.id}
            onClick={() =>
              setSelectedItem({
                type: "founder",
                data: founder,
              })
            }
            className="group flex flex-col items-center text-center p-4 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer h-fit"
          >
            <div className="mb-3 w-16 h-16">
              <Image
                src={founder.avatar}
                alt={founder.name}
                width={64}
                height={64}
                className="w-16 h-16 rounded-full border-2 border-neutral-200 object-cover group-hover:scale-110 transition-transform"
              />
            </div>
            <div className="font-medium text-stone-600">{founder.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function TeamPhotosGrid({
  setSelectedItem,
}: {
  setSelectedItem: (item: SelectedItem) => void;
}) {
  return (
    <div className="border-t border-neutral-100 pt-8">
      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4 px-2">
        Team Photos
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 content-start">
        {TEAM_PHOTOS.map((photo) => (
          <button
            key={photo.id}
            onClick={() => setSelectedItem({ type: "photo", data: photo })}
            className="group flex flex-col items-center text-center p-4 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer h-fit"
          >
            <div className="mb-3 w-16 h-16">
              <Image
                src={photo.url}
                alt={photo.name}
                width={64}
                height={64}
                className="w-16 h-16 rounded-lg border border-neutral-200 object-cover group-hover:scale-110 transition-transform"
              />
            </div>
            <div className="font-medium text-stone-600 text-sm truncate w-full">
              {photo.name}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function AboutDetailView({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem;
  setSelectedItem: (item: SelectedItem | null) => void;
}) {
  return (
    <ResizablePanelGroup direction="horizontal" className="h-120">
      <AboutSidebar
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
      />
      <ResizableHandle withHandle className="bg-neutral-200 w-px" />
      <AboutDetailPanel
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
      />
    </ResizablePanelGroup>
  );
}

function MobileSidebarDrawer({
  open,
  onClose,
  selectedItem,
  setSelectedItem,
}: {
  open: boolean;
  onClose: () => void;
  selectedItem: SelectedItem;
  setSelectedItem: (item: SelectedItem) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="absolute inset-0 z-40 bg-black/20"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className="absolute left-0 top-0 bottom-0 z-50 w-72 bg-white border-r border-neutral-200 shadow-lg"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 300,
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-stone-50">
              <span className="text-sm font-medium text-stone-600">
                Navigation
              </span>
              <button
                onClick={onClose}
                className="p-1 hover:bg-neutral-200 rounded transition-colors"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4 text-neutral-600" />
              </button>
            </div>
            <div className="h-[calc(100%-49px)] overflow-y-auto p-4">
              <OurStorySidebar
                selectedItem={selectedItem}
                setSelectedItem={(item) => {
                  setSelectedItem(item);
                  onClose();
                }}
              />
              <FoundersSidebar
                selectedItem={selectedItem}
                setSelectedItem={(item) => {
                  setSelectedItem(item);
                  onClose();
                }}
              />
              <TeamPhotosSidebar
                selectedItem={selectedItem}
                setSelectedItem={(item) => {
                  setSelectedItem(item);
                  onClose();
                }}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function AboutDetailContent({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem;
  setSelectedItem: (item: SelectedItem | null) => void;
}) {
  return (
    <div className="h-full flex flex-col">
      {selectedItem?.type === "story" && (
        <StoryDetail onClose={() => setSelectedItem(null)} />
      )}
      {selectedItem?.type === "founder" && (
        <FounderDetail
          founder={selectedItem.data}
          onClose={() => setSelectedItem(null)}
        />
      )}
      {selectedItem?.type === "photo" && (
        <PhotoDetail
          photo={selectedItem.data}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}

function AboutSidebar({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem;
  setSelectedItem: (item: SelectedItem) => void;
}) {
  return (
    <ResizablePanel defaultSize={35} minSize={25} maxSize={45}>
      <div className="p-4 h-full overflow-y-auto">
        <OurStorySidebar
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
        />
        <FoundersSidebar
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
        />
        <TeamPhotosSidebar
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
        />
      </div>
    </ResizablePanel>
  );
}

function OurStorySidebar({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem;
  setSelectedItem: (item: SelectedItem) => void;
}) {
  return (
    <div className="mb-6">
      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3 px-2">
        Our Story
      </div>
      <button
        onClick={() => setSelectedItem({ type: "story" })}
        className={cn([
          "w-full bg-stone-50 border rounded-lg p-3 hover:border-stone-400 hover:bg-stone-100 transition-colors text-left flex items-center gap-3 cursor-pointer",
          selectedItem?.type === "story"
            ? "border-stone-600 bg-stone-100"
            : "border-neutral-200",
        ])}
      >
        <div className="w-12 h-12 shrink-0 flex items-center justify-center">
          <Image
            src="/api/images/icons/textedit.webp"
            alt="Our Story"
            width={48}
            height={48}
            className="w-12 h-12"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-600 truncate">
            Our Story.txt
          </p>
        </div>
      </button>
    </div>
  );
}

function FoundersSidebar({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem;
  setSelectedItem: (item: SelectedItem) => void;
}) {
  return (
    <div className="mb-6">
      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3 px-2">
        Founders
      </div>
      <div className="flex flex-col gap-3">
        {FOUNDERS.map((founder) => (
          <button
            key={founder.id}
            onClick={() =>
              setSelectedItem({
                type: "founder",
                data: founder,
              })
            }
            className={cn([
              "w-full bg-stone-50 border rounded-lg p-3 hover:border-stone-400 hover:bg-stone-100 transition-colors text-left flex items-center gap-3 cursor-pointer",
              selectedItem?.type === "founder" &&
              selectedItem.data.id === founder.id
                ? "border-stone-600 bg-stone-100"
                : "border-neutral-200",
            ])}
          >
            <div className="w-12 h-12 shrink-0 rounded-full overflow-hidden border-2 border-neutral-200">
              <Image
                src={founder.avatar}
                alt={founder.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-600 truncate">
                {founder.name}
              </p>
              <p className="text-xs text-neutral-500 truncate">
                {founder.role}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function TeamPhotosSidebar({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem;
  setSelectedItem: (item: SelectedItem) => void;
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3 px-2">
        Team Photos
      </div>
      <div className="flex flex-col gap-3">
        {TEAM_PHOTOS.map((photo) => (
          <button
            key={photo.id}
            onClick={() =>
              setSelectedItem({
                type: "photo",
                data: photo,
              })
            }
            className={cn([
              "w-full bg-stone-50 border rounded-lg p-3 hover:border-stone-400 hover:bg-stone-100 transition-colors text-left flex items-center gap-3 cursor-pointer",
              selectedItem?.type === "photo" &&
              selectedItem.data.id === photo.id
                ? "border-stone-600 bg-stone-100"
                : "border-neutral-200",
            ])}
          >
            <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden border border-neutral-200">
              <Image
                src={photo.url}
                alt={photo.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-600 truncate">
                {photo.name}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function AboutDetailPanel({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem;
  setSelectedItem: (item: SelectedItem | null) => void;
}) {
  return (
    <ResizablePanel defaultSize={65}>
      <div className="h-full flex flex-col">
        {selectedItem?.type === "story" && (
          <StoryDetail onClose={() => setSelectedItem(null)} />
        )}
        {selectedItem?.type === "founder" && (
          <FounderDetail
            founder={selectedItem.data}
            onClose={() => setSelectedItem(null)}
          />
        )}
        {selectedItem?.type === "photo" && (
          <PhotoDetail
            photo={selectedItem.data}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </div>
    </ResizablePanel>
  );
}

function StoryDetail({ onClose }: { onClose: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, []);

  return (
    <>
      <div className="py-2 px-4 flex items-center justify-between border-b border-neutral-200">
        <h2 className="font-medium text-stone-600">Our Story.txt</h2>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
        >
          <XIcon size={16} />
        </button>
      </div>

      <div ref={scrollRef} className="p-4 overflow-y-auto">
        <div className="prose prose-stone max-w-none">
          <h2 className="text-3xl font-serif text-stone-600 mb-4">
            How We Landed on Hyprnote
          </h2>
          <p className="text-base text-neutral-500 italic mb-8">
            Our story and what we believe
          </p>

          <p className="text-base text-neutral-600 leading-relaxed mb-4">
            Hyprnote didn't start as a note-app. We were actually building an AI
            hardware toy for kids. It was fun, but for two people, hardware was
            too slow and too heavy. When we stepped back, we realized the thing
            we cared about wasn't the toy — it was helping people capture and
            understand conversations.
          </p>

          <p className="text-base text-neutral-600 leading-relaxed mb-4">
            At the same time, I was drowning in meetings and trying every AI
            notetaker out there. They were slow, distracting, or shipped every
            word to the cloud. None of them felt like something I'd trust or
            enjoy using. That became the real beginning of Hyprnote.
          </p>

          <p className="text-base text-neutral-600 leading-relaxed mb-8">
            We built the first version quickly. And it showed. Too many
            features, too many ideas, no clear philosophy. Even after YC, we
            kept moving without asking the hard questions. The product worked,
            but it didn't feel right. So we made the hard call: stop patching,
            start over. Burn it down and rebuild from scratch with a simple,
            focused point of view.
          </p>

          <h3 className="text-2xl font-serif text-stone-600 mb-4 mt-8">
            Our manifesto
          </h3>
          <p className="text-base text-neutral-600 leading-relaxed mb-4">
            We believe in the power of notetaking, not notetakers. Meetings
            should be moments of presence. If you're not adding value, your time
            is better spent elsewhere — for you and for your team.
          </p>

          <p className="text-base text-neutral-600 leading-relaxed mb-4">
            Hyprnote exists to preserve what makes us human: conversations that
            spark ideas and collaboration that moves work forward. We build
            tools that amplify human agency, not replace it. No ghost bots. No
            silent note lurkers. Just people, thinking together.
          </p>

          <p className="text-base text-neutral-600 leading-relaxed mb-8">
            We stand with those who value real connection and purposeful work.
          </p>

          <h3 className="text-2xl font-serif text-stone-600 mb-4 mt-8">
            Where we are now
          </h3>
          <p className="text-base text-neutral-600 leading-relaxed mb-8">
            Hyprnote today is the result of that reset. A fast, private,
            local-first notetaker built for people like us: meeting-heavy,
            privacy-conscious, and tired of complicated tools. It stays on your
            device. It respects your data. And it helps you think better, not
            attend meetings on autopilot.
          </p>

          <p className="text-base text-neutral-600 leading-relaxed mb-2">
            This is how we got here: a messy start, a full rewrite, and a clear
            belief that great work comes from humans — not from machines
            pretending to be in the room.
          </p>

          <div className="flex flex-col gap-2">
            <div>
              <p className="text-base text-neutral-600 font-medium italic font-serif">
                Hyprnote
              </p>
              <p className="text-sm text-neutral-500">John Jeong, Yujong Lee</p>
            </div>

            <div>
              <Image
                src="/api/images/hyprnote/signature-dark.svg"
                alt="Hyprnote Signature"
                width={124}
                height={60}
                layout="constrained"
                className="opacity-80 object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function FounderDetail({
  founder,
  onClose,
}: {
  founder: (typeof FOUNDERS)[number];
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [founder.id]);

  return (
    <>
      <div className="py-2 px-4 flex items-center justify-between border-b border-neutral-200">
        <h2 className="font-medium text-stone-600">{founder.name}</h2>
        <div className="flex items-center gap-2">
          <a
            href={founder.avatar}
            download={`${founder.name.toLowerCase().replace(" ", "-")}.png`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 rounded-full shadow-xs hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all"
          >
            Download Photo
          </a>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
          >
            <XIcon size={16} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="p-4 overflow-y-auto">
        <div className="flex justify-center mb-6">
          <Image
            src={founder.avatar}
            alt={founder.name}
            width={200}
            height={200}
            className="w-48 h-48 rounded-full border-4 border-neutral-200 object-cover"
          />
        </div>

        <div>
          <h3 className="text-2xl font-serif text-stone-600 mb-1">
            {founder.name}
          </h3>
          <p className="text-sm text-neutral-500 uppercase tracking-wider mb-4">
            {founder.role}
          </p>
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            {founder.bio}
          </p>

          <div className="flex flex-wrap gap-2">
            {founder.email && (
              <a
                href={`mailto:${founder.email}`}
                className="flex items-center gap-2 px-3 py-2 text-xs border border-neutral-300 text-stone-600 rounded-full hover:bg-stone-50 transition-colors"
                aria-label="Email"
              >
                <Mail className="w-3 h-3" />
                <span>Email</span>
              </a>
            )}
            {founder.links.twitter && (
              <a
                href={founder.links.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-xs border border-neutral-300 text-stone-600 rounded-full hover:bg-stone-50 transition-colors"
                aria-label="Twitter"
              >
                <Icon icon="mdi:twitter" className="text-sm" />
                <span>Twitter</span>
              </a>
            )}
            {founder.links.github && (
              <a
                href={founder.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-xs border border-neutral-300 text-stone-600 rounded-full hover:bg-stone-50 transition-colors"
                aria-label="GitHub"
              >
                <Icon icon="mdi:github" className="text-sm" />
                <span>GitHub</span>
              </a>
            )}
            {founder.links.linkedin && (
              <a
                href={founder.links.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-xs border border-neutral-300 text-stone-600 rounded-full hover:bg-stone-50 transition-colors"
                aria-label="LinkedIn"
              >
                <Icon icon="mdi:linkedin" className="text-sm" />
                <span>LinkedIn</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function PhotoDetail({
  photo,
  onClose,
}: {
  photo: (typeof TEAM_PHOTOS)[number];
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [photo.id]);

  return (
    <>
      <div className="py-2 px-4 flex items-center justify-between border-b border-neutral-200">
        <h2 className="font-medium text-stone-600">{photo.name}</h2>
        <div className="flex items-center gap-2">
          <a
            href={photo.url}
            download={photo.name}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 rounded-full shadow-xs hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all"
          >
            Download
          </a>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
          >
            <XIcon size={16} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="p-4 overflow-y-auto">
        <Image
          src={photo.url}
          alt={photo.name}
          className="w-full object-cover mb-6 rounded-lg"
        />

        <p className="text-sm text-neutral-600">
          Team photo from the Hyprnote team.
        </p>
      </div>
    </>
  );
}

function AboutStatusBar({
  selectedItem,
}: {
  selectedItem: SelectedItem | null;
}) {
  const totalItems = 1 + FOUNDERS.length + TEAM_PHOTOS.length;

  return (
    <div className="bg-stone-50 border-t border-neutral-200 px-4 py-2">
      <span className="text-xs text-neutral-500">
        {selectedItem
          ? selectedItem.type === "founder"
            ? `Viewing ${selectedItem.data.name}`
            : selectedItem.type === "photo"
              ? `Viewing ${selectedItem.data.name}`
              : "Viewing Our Story"
          : `${totalItems} items, 3 groups`}
      </span>
    </div>
  );
}
