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

import { MockWindow } from "@/components/mock-window";

type BrandSearch = {
  type?: "visual" | "typography" | "color";
  id?: string;
};

export const Route = createFileRoute("/_view/brand")({
  component: Component,
  validateSearch: (search: Record<string, unknown>): BrandSearch => {
    return {
      type:
        search.type === "visual" ||
        search.type === "typography" ||
        search.type === "color"
          ? search.type
          : undefined,
      id: typeof search.id === "string" ? search.id : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Brand - Hyprnote Press Kit" },
      {
        name: "description",
        content:
          "Download Hyprnote logos, icons, and brand assets. Learn about our visual identity, typography, and color palette.",
      },
    ],
  }),
});

const VISUAL_ASSETS = [
  {
    id: "icon",
    name: "Icon",
    url: "/api/images/hyprnote/icon.png",
    description: "Hyprnote app icon",
  },
  {
    id: "logo",
    name: "Logo",
    url: "/api/images/hyprnote/logo.png",
    description: "Hyprnote wordmark logo",
  },
  {
    id: "symbol-logo",
    name: "Symbol + Logo",
    url: "/api/images/hyprnote/symbol+logo.png",
    description: "Hyprnote icon with wordmark",
  },
  {
    id: "og-image",
    name: "OpenGraph Image",
    url: "/api/images/hyprnote/og-image.jpg",
    description: "Social media preview image",
  },
];

const TYPOGRAPHY = [
  {
    id: "primary-font",
    name: "Inter",
    fontFamily: "Inter",
    description:
      "Inter is our primary typeface for UI and body text. Clean, modern, and highly legible.",
    preview: "The quick brown fox jumps over the lazy dog",
    usage: "Body text, UI elements, navigation",
  },
  {
    id: "display-font",
    name: "Lora",
    fontFamily: "Lora",
    description:
      "Lora is our display typeface for headlines and featured text. Adds elegance and personality.",
    preview: "The quick brown fox jumps over the lazy dog",
    usage: "Headlines, titles, featured content",
  },
];

const COLORS = [
  {
    id: "stone-600",
    name: "Stone 600",
    hex: "#57534e",
    description: "Primary text color",
  },
  {
    id: "stone-500",
    name: "Stone 500",
    hex: "#78716c",
    description: "Secondary text color",
  },
  {
    id: "neutral-600",
    name: "Neutral 600",
    hex: "#525252",
    description: "Body text",
  },
  {
    id: "neutral-500",
    name: "Neutral 500",
    hex: "#737373",
    description: "Muted text",
  },
  {
    id: "neutral-100",
    name: "Neutral 100",
    hex: "#f5f5f5",
    description: "Background, borders",
  },
  {
    id: "stone-50",
    name: "Stone 50",
    hex: "#fafaf9",
    description: "Light backgrounds",
  },
];

type SelectedItem =
  | { type: "visual"; data: (typeof VISUAL_ASSETS)[0] }
  | { type: "typography"; data: (typeof TYPOGRAPHY)[0] }
  | { type: "color"; data: (typeof COLORS)[0] };

function Component() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);

  useEffect(() => {
    if (search.type === "visual" && search.id) {
      const asset = VISUAL_ASSETS.find((a) => a.id === search.id);
      if (asset) {
        setSelectedItem({ type: "visual", data: asset });
      } else {
        setSelectedItem(null);
      }
    } else if (search.type === "typography" && search.id) {
      const font = TYPOGRAPHY.find((f) => f.id === search.id);
      if (font) {
        setSelectedItem({ type: "typography", data: font });
      } else {
        setSelectedItem(null);
      }
    } else if (search.type === "color" && search.id) {
      const color = COLORS.find((c) => c.id === search.id);
      if (color) {
        setSelectedItem({ type: "color", data: color });
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
    } else if (item.type === "visual") {
      navigate({
        search: { type: "visual", id: item.data.id },
        resetScroll: false,
      });
    } else if (item.type === "typography") {
      navigate({
        search: { type: "typography", id: item.data.id },
        resetScroll: false,
      });
    } else if (item.type === "color") {
      navigate({
        search: { type: "color", id: item.data.id },
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
        <BrandContentSection
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
          Brand
        </h1>
        <p className="text-lg sm:text-xl text-neutral-600">
          Download Hyprnote logos, icons, and brand assets. Learn about our
          visual identity, typography, and color palette.
        </p>
      </div>
    </div>
  );
}

function BrandContentSection({
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
          title="Brand"
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
              <BrandGridView setSelectedItem={setSelectedItem} />
            ) : isMobile ? (
              <>
                <MobileSidebarDrawer
                  open={drawerOpen}
                  onClose={() => setDrawerOpen(false)}
                  selectedItem={selectedItem}
                  setSelectedItem={setSelectedItem}
                />
                <BrandDetailContent
                  selectedItem={selectedItem}
                  setSelectedItem={setSelectedItem}
                />
              </>
            ) : (
              <BrandDetailView
                selectedItem={selectedItem}
                setSelectedItem={setSelectedItem}
              />
            )}
          </div>

          <BrandStatusBar selectedItem={selectedItem} />
        </MockWindow>
      </div>
    </section>
  );
}

function BrandGridView({
  setSelectedItem,
}: {
  setSelectedItem: (item: SelectedItem) => void;
}) {
  return (
    <div className="p-8 overflow-y-auto h-[480px]">
      <VisualAssetsGrid setSelectedItem={setSelectedItem} />
      <TypographyGrid setSelectedItem={setSelectedItem} />
      <ColorsGrid setSelectedItem={setSelectedItem} />
    </div>
  );
}

function VisualAssetsGrid({
  setSelectedItem,
}: {
  setSelectedItem: (item: SelectedItem) => void;
}) {
  return (
    <div className="mb-8">
      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4 px-2">
        Visual Assets
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 content-start">
        {VISUAL_ASSETS.map((asset) => (
          <button
            key={asset.id}
            onClick={() => setSelectedItem({ type: "visual", data: asset })}
            className="group flex flex-col items-center text-center p-4 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer h-fit"
          >
            <div className="mb-3 w-16 h-16 flex items-center justify-center">
              <img
                src={asset.url}
                alt={asset.name}
                className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform"
              />
            </div>
            <div className="font-medium text-stone-600">{asset.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function TypographyGrid({
  setSelectedItem,
}: {
  setSelectedItem: (item: SelectedItem) => void;
}) {
  return (
    <div className="mb-8 border-t border-neutral-100 pt-8">
      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4 px-2">
        Typography
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 content-start">
        {TYPOGRAPHY.map((font) => (
          <button
            key={font.id}
            onClick={() => setSelectedItem({ type: "typography", data: font })}
            className="group flex flex-col items-center text-center p-4 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer h-fit"
          >
            <div
              className="mb-3 w-16 h-16 flex items-center justify-center text-3xl font-medium text-stone-600 group-hover:scale-110 transition-transform"
              style={{ fontFamily: font.fontFamily }}
            >
              Aa
            </div>
            <div
              className="font-medium text-stone-600"
              style={{ fontFamily: font.fontFamily }}
            >
              {font.name}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ColorsGrid({
  setSelectedItem,
}: {
  setSelectedItem: (item: SelectedItem) => void;
}) {
  return (
    <div className="border-t border-neutral-100 pt-8">
      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4 px-2">
        Colors
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 content-start">
        {COLORS.map((color) => (
          <button
            key={color.id}
            onClick={() => setSelectedItem({ type: "color", data: color })}
            className="group flex flex-col items-center text-center p-4 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer h-fit"
          >
            <div className="mb-3 w-16 h-16 flex items-center justify-center">
              <div
                className="w-16 h-16 rounded-lg border border-neutral-200 group-hover:scale-110 transition-transform shadow-xs"
                style={{ backgroundColor: color.hex }}
              />
            </div>
            <div className="font-medium text-stone-600">{color.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function BrandDetailView({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem;
  setSelectedItem: (item: SelectedItem | null) => void;
}) {
  return (
    <ResizablePanelGroup direction="horizontal" className="h-[480px]">
      <BrandSidebar
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
      />
      <ResizableHandle withHandle className="bg-neutral-200 w-px" />
      <BrandDetailPanel
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
              type: "tween",
              duration: 0.2,
              ease: "easeOut",
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
              <VisualAssetsSidebar
                selectedItem={selectedItem}
                setSelectedItem={(item) => {
                  setSelectedItem(item);
                  onClose();
                }}
              />
              <TypographySidebar
                selectedItem={selectedItem}
                setSelectedItem={(item) => {
                  setSelectedItem(item);
                  onClose();
                }}
              />
              <ColorsSidebar
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

function BrandDetailContent({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem;
  setSelectedItem: (item: SelectedItem | null) => void;
}) {
  return (
    <div className="h-full flex flex-col">
      {selectedItem.type === "visual" && (
        <VisualAssetDetail
          asset={selectedItem.data}
          onClose={() => setSelectedItem(null)}
        />
      )}
      {selectedItem.type === "typography" && (
        <TypographyDetail
          font={selectedItem.data}
          onClose={() => setSelectedItem(null)}
        />
      )}
      {selectedItem.type === "color" && (
        <ColorDetail
          color={selectedItem.data}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}

function BrandSidebar({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem;
  setSelectedItem: (item: SelectedItem) => void;
}) {
  return (
    <ResizablePanel defaultSize={35} minSize={25} maxSize={45}>
      <div className="h-full overflow-y-auto p-4">
        <VisualAssetsSidebar
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
        />
        <TypographySidebar
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
        />
        <ColorsSidebar
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
        />
      </div>
    </ResizablePanel>
  );
}

function VisualAssetsSidebar({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem;
  setSelectedItem: (item: SelectedItem) => void;
}) {
  return (
    <div className="mb-6">
      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3 px-2">
        Visual Assets
      </div>
      <div className="flex flex-col gap-3">
        {VISUAL_ASSETS.map((asset) => (
          <button
            key={asset.id}
            onClick={() => setSelectedItem({ type: "visual", data: asset })}
            className={cn([
              "w-full bg-stone-50 border rounded-lg p-3 hover:border-stone-400 hover:bg-stone-100 transition-colors text-left flex items-center gap-3 cursor-pointer",
              selectedItem?.type === "visual" &&
              selectedItem.data.id === asset.id
                ? "border-stone-600 bg-stone-100"
                : "border-neutral-200",
            ])}
          >
            <div className="w-12 h-12 shrink-0 flex items-center justify-center overflow-hidden">
              <img
                src={asset.url}
                alt={asset.name}
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-600 truncate">
                {asset.name}
              </p>
              <p className="text-xs text-neutral-500 truncate">
                {asset.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function TypographySidebar({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem;
  setSelectedItem: (item: SelectedItem) => void;
}) {
  return (
    <div className="mb-6">
      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3 px-2">
        Typography
      </div>
      <div className="flex flex-col gap-3">
        {TYPOGRAPHY.map((font) => (
          <button
            key={font.id}
            onClick={() => setSelectedItem({ type: "typography", data: font })}
            className={cn([
              "w-full bg-stone-50 border rounded-lg p-3 hover:border-stone-400 hover:bg-stone-100 transition-colors text-left flex items-center gap-3 cursor-pointer",
              selectedItem?.type === "typography" &&
              selectedItem.data.id === font.id
                ? "border-stone-600 bg-stone-100"
                : "border-neutral-200",
            ])}
          >
            <div
              className="w-12 h-12 shrink-0 flex items-center justify-center text-2xl font-medium text-stone-600"
              style={{ fontFamily: font.fontFamily }}
            >
              Aa
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium text-stone-600 truncate"
                style={{ fontFamily: font.fontFamily }}
              >
                {font.name}
              </p>
              <p
                className="text-xs text-neutral-500 truncate"
                style={{ fontFamily: font.fontFamily }}
              >
                {font.fontFamily}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ColorsSidebar({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem;
  setSelectedItem: (item: SelectedItem) => void;
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3 px-2">
        Colors
      </div>
      <div className="flex flex-col gap-3">
        {COLORS.map((color) => (
          <button
            key={color.id}
            onClick={() => setSelectedItem({ type: "color", data: color })}
            className={cn([
              "w-full bg-stone-50 border rounded-lg p-3 hover:border-stone-400 hover:bg-stone-100 transition-colors text-left flex items-center gap-3 cursor-pointer",
              selectedItem?.type === "color" &&
              selectedItem.data.id === color.id
                ? "border-stone-600 bg-stone-100"
                : "border-neutral-200",
            ])}
          >
            <div className="w-12 h-12 shrink-0 flex items-center justify-center">
              <div
                className="w-10 h-10 rounded-lg border border-neutral-200 shadow-xs"
                style={{ backgroundColor: color.hex }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-600 truncate">
                {color.name}
              </p>
              <p className="text-xs text-neutral-500 truncate font-mono">
                {color.hex}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function BrandDetailPanel({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem;
  setSelectedItem: (item: SelectedItem | null) => void;
}) {
  return (
    <ResizablePanel defaultSize={65}>
      <div className="h-full flex flex-col">
        {selectedItem.type === "visual" && (
          <VisualAssetDetail
            asset={selectedItem.data}
            onClose={() => setSelectedItem(null)}
          />
        )}
        {selectedItem.type === "typography" && (
          <TypographyDetail
            font={selectedItem.data}
            onClose={() => setSelectedItem(null)}
          />
        )}
        {selectedItem.type === "color" && (
          <ColorDetail
            color={selectedItem.data}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </div>
    </ResizablePanel>
  );
}

function VisualAssetDetail({
  asset,
  onClose,
}: {
  asset: (typeof VISUAL_ASSETS)[0];
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [asset.id]);

  return (
    <>
      <div className="py-2 px-4 flex items-center justify-between border-b border-neutral-200">
        <h2 className="font-medium text-stone-600">{asset.name}</h2>
        <div className="flex items-center gap-2">
          <a
            href={asset.url}
            download
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
        <img
          src={asset.url}
          alt={asset.name}
          className="max-w-[400px] w-full h-auto object-contain mb-6"
        />
        <p className="text-sm text-neutral-600">{asset.description}</p>
      </div>
    </>
  );
}

function TypographyDetail({
  font,
  onClose,
}: {
  font: (typeof TYPOGRAPHY)[0];
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [font.id]);

  return (
    <>
      <div className="py-2 px-4 flex items-center justify-between border-b border-neutral-200">
        <h2 className="font-medium text-stone-600">{font.name}</h2>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
        >
          <XIcon size={16} />
        </button>
      </div>

      <div ref={scrollRef} className="p-4 overflow-y-auto">
        <div className="flex flex-col gap-6">
          <div>
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Font Family
            </h3>
            <p
              className="text-lg text-stone-600"
              style={{ fontFamily: font.fontFamily }}
            >
              {font.fontFamily}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Description
            </h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              {font.description}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Usage
            </h3>
            <p className="text-sm text-neutral-600">{font.usage}</p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">
              Preview
            </h3>
            <div className="flex flex-col gap-4 p-6 bg-stone-50 border border-neutral-200 rounded-lg">
              <div
                className="text-4xl text-stone-600"
                style={{ fontFamily: font.fontFamily }}
              >
                {font.preview}
              </div>
              <div
                className="text-2xl text-stone-600"
                style={{ fontFamily: font.fontFamily }}
              >
                {font.preview}
              </div>
              <div
                className="text-base text-stone-600"
                style={{ fontFamily: font.fontFamily }}
              >
                {font.preview}
              </div>
              <div
                className="text-sm text-stone-600"
                style={{ fontFamily: font.fontFamily }}
              >
                {font.preview}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ColorDetail({
  color,
  onClose,
}: {
  color: (typeof COLORS)[0];
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [color.id]);

  return (
    <>
      <div className="py-2 px-4 flex items-center justify-between border-b border-neutral-200">
        <h2 className="font-medium text-stone-600">{color.name}</h2>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
        >
          <XIcon size={16} />
        </button>
      </div>

      <div ref={scrollRef} className="p-4 overflow-y-auto">
        <div className="flex flex-col gap-6">
          <div>
            <div
              className="w-full h-48 rounded-lg border border-neutral-200 shadow-xs mb-4"
              style={{ backgroundColor: color.hex }}
            />
          </div>

          <div>
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Hex Value
            </h3>
            <p className="text-lg text-stone-600 font-mono">{color.hex}</p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Usage
            </h3>
            <p className="text-sm text-neutral-600">{color.description}</p>
          </div>
        </div>
      </div>
    </>
  );
}

function BrandStatusBar({
  selectedItem,
}: {
  selectedItem: SelectedItem | null;
}) {
  const totalItems = VISUAL_ASSETS.length + TYPOGRAPHY.length + COLORS.length;

  return (
    <div className="bg-stone-50 border-t border-neutral-200 px-4 py-2">
      <span className="text-xs text-neutral-500">
        {selectedItem
          ? `Viewing ${selectedItem.data.name}`
          : `${totalItems} items, 3 groups`}
      </span>
    </div>
  );
}
