import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Menu, X, XIcon } from "lucide-react";
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

type AppSearch = {
  type?: "screenshot";
  id?: string;
};

export const Route = createFileRoute("/_view/press-kit/app")({
  component: Component,
  validateSearch: (search: Record<string, unknown>): AppSearch => {
    return {
      type: search.type === "screenshot" ? search.type : undefined,
      id: typeof search.id === "string" ? search.id : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "App Screenshots - Char Press Kit" },
      {
        name: "description",
        content: "Download Char app screenshots and UI assets.",
      },
    ],
  }),
});

const screenshots = [
  {
    id: "float-compact",
    name: "float-compact.jpg",
    url: "/api/images/hyprnote/float-compact.jpg",
    description: "Compact floating window mode",
  },
  {
    id: "float-memos",
    name: "float-memos.jpg",
    url: "/api/images/hyprnote/float-memos.jpg",
    description: "Floating window with memos",
  },
  {
    id: "float-transcript",
    name: "float-transcript.jpg",
    url: "/api/images/hyprnote/float-transcript.jpg",
    description: "Floating window with transcript",
  },
  {
    id: "float-insights",
    name: "float-insights.jpg",
    url: "/api/images/hyprnote/float-insights.jpg",
    description: "Floating window with AI insights",
  },
  {
    id: "float-chat",
    name: "float-chat.jpg",
    url: "/api/images/hyprnote/float-chat.jpg",
    description: "Floating window with chat",
  },
  {
    id: "ai-notetaking-hero",
    name: "ai-notetaking-hero.jpg",
    url: "/api/images/hyprnote/ai-notetaking-hero.jpg",
    description: "AI notetaking hero image",
  },
  {
    id: "search-default",
    name: "search-default.jpg",
    url: "/api/images/hyprnote/mini-apps/search-default.jpg",
    description: "Search suggestions",
  },
  {
    id: "search-semantic",
    name: "search-semantic.jpg",
    url: "/api/images/hyprnote/mini-apps/search-semantic.jpg",
    description: "Semantic search",
  },
  {
    id: "search-filter",
    name: "search-filter.jpg",
    url: "/api/images/hyprnote/mini-apps/search-filter.jpg",
    description: "Search filters",
  },
];

type SelectedItem = { type: "screenshot"; data: (typeof screenshots)[0] };

function Component() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);

  useEffect(() => {
    if (search.type === "screenshot" && search.id) {
      const screenshot = screenshots.find((s) => s.id === search.id);
      if (screenshot) {
        setSelectedItem({ type: "screenshot", data: screenshot });
      }
    } else {
      setSelectedItem(null);
    }
  }, [search.type, search.id]);

  const handleSetSelectedItem = (item: SelectedItem | null) => {
    setSelectedItem(item);
    if (item === null) {
      navigate({ search: {}, resetScroll: false });
    } else if (item.type === "screenshot") {
      navigate({
        search: { type: "screenshot", id: item.data.id },
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
        <AppContentSection
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
        <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-700 mb-6">
          App Screenshots
        </h1>
        <p className="text-lg sm:text-xl text-neutral-600">
          Download high-quality screenshots of Char for press and marketing
          materials.
        </p>
      </div>
    </div>
  );
}

function AppContentSection({
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
          title="App Screenshots"
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
          <div className="h-[480px] relative">
            {!selectedItem ? (
              <AppGridView setSelectedItem={setSelectedItem} />
            ) : isMobile ? (
              <>
                <MobileSidebarDrawer
                  open={drawerOpen}
                  onClose={() => setDrawerOpen(false)}
                  selectedItem={selectedItem}
                  setSelectedItem={setSelectedItem}
                />
                <AppDetailContent
                  selectedItem={selectedItem}
                  setSelectedItem={setSelectedItem}
                />
              </>
            ) : (
              <AppDetailView
                selectedItem={selectedItem}
                setSelectedItem={setSelectedItem}
              />
            )}
          </div>

          <AppStatusBar selectedItem={selectedItem} />
        </MockWindow>
      </div>
    </section>
  );
}

function AppGridView({
  setSelectedItem,
}: {
  setSelectedItem: (item: SelectedItem) => void;
}) {
  return (
    <div className="p-8 overflow-y-auto h-[480px]">
      <ScreenshotsGrid setSelectedItem={setSelectedItem} />
    </div>
  );
}

function ScreenshotsGrid({
  setSelectedItem,
}: {
  setSelectedItem: (item: SelectedItem) => void;
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4 px-2">
        Screenshots
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 content-start">
        {screenshots.map((screenshot) => (
          <button
            key={screenshot.id}
            onClick={() =>
              setSelectedItem({
                type: "screenshot",
                data: screenshot,
              })
            }
            className="group flex flex-col items-center text-center p-4 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer h-fit"
          >
            <div className="mb-3 w-16 h-16">
              <Image
                src={screenshot.url}
                alt={screenshot.name}
                width={64}
                height={64}
                className="w-16 h-16 rounded-lg border border-neutral-200 object-cover group-hover:scale-110 transition-transform"
              />
            </div>
            <div className="font-medium text-stone-700 text-sm truncate w-full">
              {screenshot.name}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function AppDetailView({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem;
  setSelectedItem: (item: SelectedItem | null) => void;
}) {
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const sidebarScrollPosRef = useRef<number>(0);

  useEffect(() => {
    const el = sidebarScrollRef.current;
    if (!el) return;

    el.scrollTop = sidebarScrollPosRef.current;

    const handleScroll = () => {
      sidebarScrollPosRef.current = el.scrollTop;
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [selectedItem]);

  return (
    <ResizablePanelGroup direction="horizontal" className="h-[480px]">
      <AppSidebar
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
        scrollRef={sidebarScrollRef}
      />
      <ResizableHandle withHandle className="bg-neutral-200 w-px" />
      <AppDetailPanel
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
              <span className="text-sm font-medium text-stone-700">
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
              <ScreenshotsSidebar
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

function AppDetailContent({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem;
  setSelectedItem: (item: SelectedItem | null) => void;
}) {
  return (
    <div className="h-full flex flex-col">
      {selectedItem?.type === "screenshot" && (
        <ScreenshotDetail
          screenshot={selectedItem.data}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}

function AppSidebar({
  selectedItem,
  setSelectedItem,
  scrollRef,
}: {
  selectedItem: SelectedItem;
  setSelectedItem: (item: SelectedItem) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <ResizablePanel defaultSize={35} minSize={25} maxSize={45}>
      <div ref={scrollRef} className="p-4 h-full overflow-y-auto">
        <ScreenshotsSidebar
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
        />
      </div>
    </ResizablePanel>
  );
}

function ScreenshotsSidebar({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem;
  setSelectedItem: (item: SelectedItem) => void;
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3 px-2">
        Screenshots
      </div>
      <div className="flex flex-col gap-3">
        {screenshots.map((screenshot) => (
          <button
            key={screenshot.id}
            onClick={() =>
              setSelectedItem({
                type: "screenshot",
                data: screenshot,
              })
            }
            className={cn([
              "w-full bg-stone-50 border rounded-lg p-3 hover:border-stone-400 hover:bg-stone-100 transition-colors text-left flex items-center gap-3 cursor-pointer",
              selectedItem?.type === "screenshot" &&
              selectedItem.data.id === screenshot.id
                ? "border-stone-600 bg-stone-100"
                : "border-neutral-200",
            ])}
          >
            <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden border border-neutral-200">
              <Image
                src={screenshot.url}
                alt={screenshot.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-700 truncate">
                {screenshot.name}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function AppDetailPanel({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem;
  setSelectedItem: (item: SelectedItem | null) => void;
}) {
  return (
    <ResizablePanel defaultSize={65}>
      <div className="h-full flex flex-col">
        {selectedItem?.type === "screenshot" && (
          <ScreenshotDetail
            screenshot={selectedItem.data}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </div>
    </ResizablePanel>
  );
}

function ScreenshotDetail({
  screenshot,
  onClose,
}: {
  screenshot: (typeof screenshots)[0];
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [screenshot.id]);

  return (
    <>
      <div className="py-2 px-4 flex items-center justify-between border-b border-neutral-200">
        <h2 className="font-medium text-stone-700">{screenshot.name}</h2>
        <div className="flex items-center gap-2">
          <a
            href={screenshot.url}
            download={screenshot.name}
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
          src={screenshot.url}
          alt={screenshot.name}
          className="w-full object-cover mb-6 rounded-lg"
        />

        <p className="text-sm text-neutral-600">{screenshot.description}</p>
      </div>
    </>
  );
}

function AppStatusBar({ selectedItem }: { selectedItem: SelectedItem | null }) {
  return (
    <div className="bg-stone-50 border-t border-neutral-200 px-4 py-2">
      <span className="text-xs text-neutral-500">
        {selectedItem
          ? `Viewing ${selectedItem.data.name}`
          : `${screenshots.length} items, 1 group`}
      </span>
    </div>
  );
}
