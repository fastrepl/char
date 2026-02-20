/**
 * Hyprnote Extension Runtime Types
 *
 * AUTO-GENERATED - DO NOT EDIT MANUALLY
 * Run: deno task generate
 */

// @hypr/store - TinyBase store with app data (sessions, events, humans, etc.)
declare module "@hypr/store" {
  import type * as _UI from "tinybase/ui-react/with-schemas";
  import type { TablesSchema, ValuesSchema } from "tinybase/with-schemas";

  export const SCHEMA: {
    value: ValuesSchema;
    table: TablesSchema;
  };

  export type Schemas = [typeof SCHEMA.table, typeof SCHEMA.value];

  export const STORE_ID: "main";
  export const UI: _UI.WithSchemas<Schemas>;
  export const INDEXES: {
    eventsByDate: string;
    sessionByDateWithoutEvent: string;
    sessionsByEvent: string;
    humansByOrg: string;
    sessionParticipantsBySession: string;
    foldersByParent: string;
    sessionsByFolder: string;
    transcriptBySession: string;
    tagSessionsBySession: string;
    chatMessagesByGroup: string;
    sessionsByHuman: string;
    enhancedNotesBySession: string;
  };
  export const QUERIES: {
    timelineEvents: string;
    timelineSessions: string;
    visibleOrganizations: string;
    visibleHumans: string;
    visibleTemplates: string;
    visibleFolders: string;
    llmProviders: string;
    sttProviders: string;
    sessionParticipantsWithDetails: string;
    sessionRecordingTimes: string;
  };
  export const METRICS: {
    totalHumans: string;
    totalOrganizations: string;
  };
  export const RELATIONSHIPS: {
    sessionToFolder: string;
    sessionToEvent: string;
    folderToParentFolder: string;
    enhancedNoteToSession: string;
  };
}

// @hypr/tabs - Tab navigation (open sessions, events, etc.)
declare module "@hypr/tabs" {
  export const useTabs: {
    <T>(
      selector: (state: {
        openNew: (
          tab:
            | { type: "sessions"; id: string }
            | { type: "events"; id: string }
            | { type: "humans"; id: string }
            | { type: "organizations"; id: string }
            | { type: "folders"; id: string | null }
            | {
                type: "contacts";
                state?: {
                  selectedOrganization?: string | null;
                  selectedPerson?: string | null;
                };
              }
            | { type: "empty" }
            | {
                type: "extension";
                extensionId: string;
                state?: Record<string, unknown>;
              },
        ) => void;
      }) => T,
    ): T;
  };
}

// @hypr/ui - UI components (shadcn-style)
declare module "@hypr/ui/components/icons/outlook" {
  import type * as React from "react";
  export const OutlookIcon: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/accordion" {
  import type * as React from "react";
  export const Accordion: React.ComponentType<Record<string, unknown>>;
  export const AccordionContent: React.ComponentType<Record<string, unknown>>;
  export const AccordionItem: React.ComponentType<Record<string, unknown>>;
  export const AccordionTrigger: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/avatar" {
  import type * as React from "react";
  export const Avatar: React.ComponentType<Record<string, unknown>>;
  export const AvatarFallback: React.ComponentType<Record<string, unknown>>;
  export const AvatarImage: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/badge" {
  import type * as React from "react";
  export const Badge: React.ComponentType<Record<string, unknown>>;
  export const badgeVariants: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/bottom-sheet" {
  import type * as React from "react";
  export const BottomSheet: React.ComponentType<Record<string, unknown>>;
  export const BottomSheetContent: React.ComponentType<Record<string, unknown>>;
  export const BottomSheetTrigger: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/breadcrumb" {
  import type * as React from "react";
  export const Breadcrumb: React.ComponentType<Record<string, unknown>>;
  export const BreadcrumbEllipsis: React.ComponentType<Record<string, unknown>>;
  export const BreadcrumbItem: React.ComponentType<Record<string, unknown>>;
  export const BreadcrumbLink: React.ComponentType<Record<string, unknown>>;
  export const BreadcrumbList: React.ComponentType<Record<string, unknown>>;
  export const BreadcrumbPage: React.ComponentType<Record<string, unknown>>;
  export const BreadcrumbSeparator: React.ComponentType<
    Record<string, unknown>
  >;
}

declare module "@hypr/ui/components/ui/button" {
  import type * as React from "react";
  export const Button: React.ComponentType<Record<string, unknown>>;
  export const buttonVariants: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/button-group" {
  import type * as React from "react";
  export const ButtonGroup: React.ComponentType<Record<string, unknown>>;
  export const ButtonGroupSeparator: React.ComponentType<
    Record<string, unknown>
  >;
  export const ButtonGroupText: React.ComponentType<Record<string, unknown>>;
  export const buttonGroupVariants: React.ComponentType<
    Record<string, unknown>
  >;
}

declare module "@hypr/ui/components/ui/card" {
  import type * as React from "react";
  export const Card: React.ComponentType<Record<string, unknown>>;
  export const CardHeader: React.ComponentType<Record<string, unknown>>;
  export const CardTitle: React.ComponentType<Record<string, unknown>>;
  export const CardDescription: React.ComponentType<Record<string, unknown>>;
  export const CardContent: React.ComponentType<Record<string, unknown>>;
  export const CardFooter: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/carousel" {
  import type * as React from "react";
  export const Carousel: React.ComponentType<Record<string, unknown>>;
  export const CarouselContent: React.ComponentType<Record<string, unknown>>;
  export const CarouselItem: React.ComponentType<Record<string, unknown>>;
  export const CarouselNext: React.ComponentType<Record<string, unknown>>;
  export const CarouselPrevious: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/checkbox" {
  import type * as React from "react";
  export const Checkbox: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/command" {
  import type * as React from "react";
  export const Command: React.ComponentType<Record<string, unknown>>;
  export const CommandDialog: React.ComponentType<Record<string, unknown>>;
  export const CommandEmpty: React.ComponentType<Record<string, unknown>>;
  export const CommandGroup: React.ComponentType<Record<string, unknown>>;
  export const CommandInput: React.ComponentType<Record<string, unknown>>;
  export const CommandItem: React.ComponentType<Record<string, unknown>>;
  export const CommandList: React.ComponentType<Record<string, unknown>>;
  export const CommandSeparator: React.ComponentType<Record<string, unknown>>;
  export const CommandShortcut: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/context-menu" {
  import type * as React from "react";
  export const ContextMenu: React.ComponentType<Record<string, unknown>>;
  export const ContextMenuCheckboxItem: React.ComponentType<
    Record<string, unknown>
  >;
  export const ContextMenuContent: React.ComponentType<Record<string, unknown>>;
  export const ContextMenuGroup: React.ComponentType<Record<string, unknown>>;
  export const ContextMenuItem: React.ComponentType<Record<string, unknown>>;
  export const ContextMenuLabel: React.ComponentType<Record<string, unknown>>;
  export const ContextMenuPortal: React.ComponentType<Record<string, unknown>>;
  export const ContextMenuRadioGroup: React.ComponentType<
    Record<string, unknown>
  >;
  export const ContextMenuRadioItem: React.ComponentType<
    Record<string, unknown>
  >;
  export const ContextMenuSeparator: React.ComponentType<
    Record<string, unknown>
  >;
  export const ContextMenuShortcut: React.ComponentType<
    Record<string, unknown>
  >;
  export const ContextMenuSub: React.ComponentType<Record<string, unknown>>;
  export const ContextMenuSubContent: React.ComponentType<
    Record<string, unknown>
  >;
  export const ContextMenuSubTrigger: React.ComponentType<
    Record<string, unknown>
  >;
  export const ContextMenuTrigger: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/dancing-sticks" {
  import type * as React from "react";
  export const DancingSticks: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/dialog" {
  import type * as React from "react";
  export const Dialog: React.ComponentType<Record<string, unknown>>;
  export const DialogClose: React.ComponentType<Record<string, unknown>>;
  export const DialogContent: React.ComponentType<Record<string, unknown>>;
  export const DialogDescription: React.ComponentType<Record<string, unknown>>;
  export const DialogFooter: React.ComponentType<Record<string, unknown>>;
  export const DialogHeader: React.ComponentType<Record<string, unknown>>;
  export const DialogOverlay: React.ComponentType<Record<string, unknown>>;
  export const DialogPortal: React.ComponentType<Record<string, unknown>>;
  export const DialogTitle: React.ComponentType<Record<string, unknown>>;
  export const DialogTrigger: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/dropdown-menu" {
  import type * as React from "react";
  export const DropdownMenu: React.ComponentType<Record<string, unknown>>;
  export const DropdownMenuCheckboxItem: React.ComponentType<
    Record<string, unknown>
  >;
  export const DropdownMenuContent: React.ComponentType<
    Record<string, unknown>
  >;
  export const DropdownMenuGroup: React.ComponentType<Record<string, unknown>>;
  export const DropdownMenuItem: React.ComponentType<Record<string, unknown>>;
  export const DropdownMenuLabel: React.ComponentType<Record<string, unknown>>;
  export const DropdownMenuPortal: React.ComponentType<Record<string, unknown>>;
  export const DropdownMenuRadioGroup: React.ComponentType<
    Record<string, unknown>
  >;
  export const DropdownMenuRadioItem: React.ComponentType<
    Record<string, unknown>
  >;
  export const DropdownMenuSeparator: React.ComponentType<
    Record<string, unknown>
  >;
  export const DropdownMenuShortcut: React.ComponentType<
    Record<string, unknown>
  >;
  export const DropdownMenuSub: React.ComponentType<Record<string, unknown>>;
  export const DropdownMenuSubContent: React.ComponentType<
    Record<string, unknown>
  >;
  export const DropdownMenuSubTrigger: React.ComponentType<
    Record<string, unknown>
  >;
  export const DropdownMenuTrigger: React.ComponentType<
    Record<string, unknown>
  >;
}

declare module "@hypr/ui/components/ui/form" {
  import type * as React from "react";
  export const Form: React.ComponentType<Record<string, unknown>>;
  export const FormControl: React.ComponentType<Record<string, unknown>>;
  export const FormDescription: React.ComponentType<Record<string, unknown>>;
  export const FormField: React.ComponentType<Record<string, unknown>>;
  export const FormItem: React.ComponentType<Record<string, unknown>>;
  export const FormLabel: React.ComponentType<Record<string, unknown>>;
  export const FormMessage: React.ComponentType<Record<string, unknown>>;
  export const useFormField: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/hover-card" {
  import type * as React from "react";
  export const HoverCard: React.ComponentType<Record<string, unknown>>;
  export const HoverCardContent: React.ComponentType<Record<string, unknown>>;
  export const HoverCardTrigger: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/input" {
  import type * as React from "react";
  export const Input: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/input-group" {
  import type * as React from "react";
  export const InputGroup: React.ComponentType<Record<string, unknown>>;
  export const InputGroupAddon: React.ComponentType<Record<string, unknown>>;
  export const InputGroupButton: React.ComponentType<Record<string, unknown>>;
  export const InputGroupInput: React.ComponentType<Record<string, unknown>>;
  export const InputGroupText: React.ComponentType<Record<string, unknown>>;
  export const InputGroupTextarea: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/kbd" {
  import type * as React from "react";
  export const Kbd: React.ComponentType<Record<string, unknown>>;
  export const KbdGroup: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/label" {
  import type * as React from "react";
  export const Label: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/marquee" {
  import type * as React from "react";
  export const Marquee: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/modal" {
  import type * as React from "react";
  export const Modal: React.ComponentType<Record<string, unknown>>;
  export const ModalHeader: React.ComponentType<Record<string, unknown>>;
  export const ModalBody: React.ComponentType<Record<string, unknown>>;
  export const ModalFooter: React.ComponentType<Record<string, unknown>>;
  export const ModalTitle: React.ComponentType<Record<string, unknown>>;
  export const ModalDescription: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/popover" {
  import type * as React from "react";
  export const Popover: React.ComponentType<Record<string, unknown>>;
  export const PopoverAnchor: React.ComponentType<Record<string, unknown>>;
  export const PopoverContent: React.ComponentType<Record<string, unknown>>;
  export const PopoverTrigger: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/progress" {
  import type * as React from "react";
  export const Progress: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/progressive-blur" {
  import type * as React from "react";
  export const GRADIENT_ANGLES: React.ComponentType<Record<string, unknown>>;
  export const ProgressiveBlur: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/radio-group" {
  import type * as React from "react";
  export const RadioGroup: React.ComponentType<Record<string, unknown>>;
  export const RadioGroupItem: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/resizable" {
  import type * as React from "react";
  export const ResizableHandle: React.ComponentType<Record<string, unknown>>;
  export const ResizablePanel: React.ComponentType<Record<string, unknown>>;
  export const ResizablePanelGroup: React.ComponentType<
    Record<string, unknown>
  >;
}

declare module "@hypr/ui/components/ui/scroll-fade" {
  import type * as React from "react";
  export const useScrollFade: React.ComponentType<Record<string, unknown>>;
  export const ScrollFadeOverlay: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/select" {
  import type * as React from "react";
  export const Select: React.ComponentType<Record<string, unknown>>;
  export const SelectContent: React.ComponentType<Record<string, unknown>>;
  export const SelectGroup: React.ComponentType<Record<string, unknown>>;
  export const SelectItem: React.ComponentType<Record<string, unknown>>;
  export const SelectLabel: React.ComponentType<Record<string, unknown>>;
  export const SelectScrollDownButton: React.ComponentType<
    Record<string, unknown>
  >;
  export const SelectScrollUpButton: React.ComponentType<
    Record<string, unknown>
  >;
  export const SelectSeparator: React.ComponentType<Record<string, unknown>>;
  export const SelectTrigger: React.ComponentType<Record<string, unknown>>;
  export const SelectValue: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/separator" {
  import type * as React from "react";
  export const Separator: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/slider" {
  import type * as React from "react";
  export const Slider: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/spinner" {
  import type * as React from "react";
  export const Spinner: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/splash" {
  import type * as React from "react";
  export const SplashLoader: React.ComponentType<Record<string, unknown>>;
  export const SplashScreen: React.ComponentType<Record<string, unknown>>;
  export const Splash: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/switch" {
  import type * as React from "react";
  export const Switch: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/tabs" {
  import type * as React from "react";
  export const Tabs: React.ComponentType<Record<string, unknown>>;
  export const TabsContent: React.ComponentType<Record<string, unknown>>;
  export const TabsList: React.ComponentType<Record<string, unknown>>;
  export const TabsTrigger: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/text-animate" {
  import type * as React from "react";
  export const TextAnimate: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/textarea" {
  import type * as React from "react";
  export const Textarea: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/toast" {
  import type * as React from "react";
  export const sonnerToast: React.ComponentType<Record<string, unknown>>;
  export const CustomToast: React.ComponentType<Record<string, unknown>>;
  export const toast: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/tooltip" {
  import type * as React from "react";
  export const Tooltip: React.ComponentType<Record<string, unknown>>;
  export const TooltipContent: React.ComponentType<Record<string, unknown>>;
  export const TooltipProvider: React.ComponentType<Record<string, unknown>>;
  export const TooltipTrigger: React.ComponentType<Record<string, unknown>>;
}

declare module "@hypr/ui/components/ui/typewriter" {
  import type * as React from "react";
  export const Typewriter: React.ComponentType<Record<string, unknown>>;
}

// hyprnote aggregate namespace
declare module "hyprnote" {
  import type * as React from "react";
  import type * as _UI from "tinybase/ui-react/with-schemas";
  import type { TablesSchema, ValuesSchema } from "tinybase/with-schemas";

  type StoreSchema = {
    value: ValuesSchema;
    table: TablesSchema;
  };
  type Schemas = [StoreSchema["table"], StoreSchema["value"]];

  export const store: {
    STORE_ID: "main";
    UI: _UI.WithSchemas<Schemas>;
    INDEXES: {
      eventsByDate: string;
      sessionByDateWithoutEvent: string;
      sessionsByEvent: string;
      humansByOrg: string;
      sessionParticipantsBySession: string;
      foldersByParent: string;
      sessionsByFolder: string;
      transcriptBySession: string;
      tagSessionsBySession: string;
      chatMessagesByGroup: string;
      sessionsByHuman: string;
      enhancedNotesBySession: string;
    };
    QUERIES: {
      timelineEvents: string;
      timelineSessions: string;
      visibleOrganizations: string;
      visibleHumans: string;
      visibleTemplates: string;
      visibleFolders: string;
      llmProviders: string;
      sttProviders: string;
      sessionParticipantsWithDetails: string;
      sessionRecordingTimes: string;
    };
    METRICS: {
      totalHumans: string;
      totalOrganizations: string;
    };
    RELATIONSHIPS: {
      sessionToFolder: string;
      sessionToEvent: string;
      folderToParentFolder: string;
      enhancedNoteToSession: string;
    };
  };
  export const tabs: {
    useTabs: {
      <T>(
        selector: (state: {
          openNew: (
            tab:
              | { type: "sessions"; id: string }
              | { type: "events"; id: string }
              | { type: "humans"; id: string }
              | { type: "organizations"; id: string }
              | { type: "folders"; id: string | null }
              | {
                  type: "contacts";
                  state?: {
                    selectedOrganization?: string | null;
                    selectedPerson?: string | null;
                  };
                }
              | { type: "empty" }
              | {
                  type: "extension";
                  extensionId: string;
                  state?: Record<string, unknown>;
                },
          ) => void;
        }) => T,
      ): T;
    };
  };
  export const ui: {
    outlook: {
      OutlookIcon: React.ComponentType<Record<string, unknown>>;
    };
    accordion: {
      Accordion: React.ComponentType<Record<string, unknown>>;
      AccordionContent: React.ComponentType<Record<string, unknown>>;
      AccordionItem: React.ComponentType<Record<string, unknown>>;
      AccordionTrigger: React.ComponentType<Record<string, unknown>>;
    };
    avatar: {
      Avatar: React.ComponentType<Record<string, unknown>>;
      AvatarFallback: React.ComponentType<Record<string, unknown>>;
      AvatarImage: React.ComponentType<Record<string, unknown>>;
    };
    badge: {
      Badge: React.ComponentType<Record<string, unknown>>;
      badgeVariants: React.ComponentType<Record<string, unknown>>;
    };
    bottomSheet: {
      BottomSheet: React.ComponentType<Record<string, unknown>>;
      BottomSheetContent: React.ComponentType<Record<string, unknown>>;
      BottomSheetTrigger: React.ComponentType<Record<string, unknown>>;
    };
    breadcrumb: {
      Breadcrumb: React.ComponentType<Record<string, unknown>>;
      BreadcrumbEllipsis: React.ComponentType<Record<string, unknown>>;
      BreadcrumbItem: React.ComponentType<Record<string, unknown>>;
      BreadcrumbLink: React.ComponentType<Record<string, unknown>>;
      BreadcrumbList: React.ComponentType<Record<string, unknown>>;
      BreadcrumbPage: React.ComponentType<Record<string, unknown>>;
      BreadcrumbSeparator: React.ComponentType<Record<string, unknown>>;
    };
    button: {
      Button: React.ComponentType<Record<string, unknown>>;
      buttonVariants: React.ComponentType<Record<string, unknown>>;
    };
    buttonGroup: {
      ButtonGroup: React.ComponentType<Record<string, unknown>>;
      ButtonGroupSeparator: React.ComponentType<Record<string, unknown>>;
      ButtonGroupText: React.ComponentType<Record<string, unknown>>;
      buttonGroupVariants: React.ComponentType<Record<string, unknown>>;
    };
    card: {
      Card: React.ComponentType<Record<string, unknown>>;
      CardHeader: React.ComponentType<Record<string, unknown>>;
      CardTitle: React.ComponentType<Record<string, unknown>>;
      CardDescription: React.ComponentType<Record<string, unknown>>;
      CardContent: React.ComponentType<Record<string, unknown>>;
      CardFooter: React.ComponentType<Record<string, unknown>>;
    };
    carousel: {
      Carousel: React.ComponentType<Record<string, unknown>>;
      CarouselContent: React.ComponentType<Record<string, unknown>>;
      CarouselItem: React.ComponentType<Record<string, unknown>>;
      CarouselNext: React.ComponentType<Record<string, unknown>>;
      CarouselPrevious: React.ComponentType<Record<string, unknown>>;
    };
    checkbox: {
      Checkbox: React.ComponentType<Record<string, unknown>>;
    };
    command: {
      Command: React.ComponentType<Record<string, unknown>>;
      CommandDialog: React.ComponentType<Record<string, unknown>>;
      CommandEmpty: React.ComponentType<Record<string, unknown>>;
      CommandGroup: React.ComponentType<Record<string, unknown>>;
      CommandInput: React.ComponentType<Record<string, unknown>>;
      CommandItem: React.ComponentType<Record<string, unknown>>;
      CommandList: React.ComponentType<Record<string, unknown>>;
      CommandSeparator: React.ComponentType<Record<string, unknown>>;
      CommandShortcut: React.ComponentType<Record<string, unknown>>;
    };
    contextMenu: {
      ContextMenu: React.ComponentType<Record<string, unknown>>;
      ContextMenuCheckboxItem: React.ComponentType<Record<string, unknown>>;
      ContextMenuContent: React.ComponentType<Record<string, unknown>>;
      ContextMenuGroup: React.ComponentType<Record<string, unknown>>;
      ContextMenuItem: React.ComponentType<Record<string, unknown>>;
      ContextMenuLabel: React.ComponentType<Record<string, unknown>>;
      ContextMenuPortal: React.ComponentType<Record<string, unknown>>;
      ContextMenuRadioGroup: React.ComponentType<Record<string, unknown>>;
      ContextMenuRadioItem: React.ComponentType<Record<string, unknown>>;
      ContextMenuSeparator: React.ComponentType<Record<string, unknown>>;
      ContextMenuShortcut: React.ComponentType<Record<string, unknown>>;
      ContextMenuSub: React.ComponentType<Record<string, unknown>>;
      ContextMenuSubContent: React.ComponentType<Record<string, unknown>>;
      ContextMenuSubTrigger: React.ComponentType<Record<string, unknown>>;
      ContextMenuTrigger: React.ComponentType<Record<string, unknown>>;
    };
    dancingSticks: {
      DancingSticks: React.ComponentType<Record<string, unknown>>;
    };
    dialog: {
      Dialog: React.ComponentType<Record<string, unknown>>;
      DialogClose: React.ComponentType<Record<string, unknown>>;
      DialogContent: React.ComponentType<Record<string, unknown>>;
      DialogDescription: React.ComponentType<Record<string, unknown>>;
      DialogFooter: React.ComponentType<Record<string, unknown>>;
      DialogHeader: React.ComponentType<Record<string, unknown>>;
      DialogOverlay: React.ComponentType<Record<string, unknown>>;
      DialogPortal: React.ComponentType<Record<string, unknown>>;
      DialogTitle: React.ComponentType<Record<string, unknown>>;
      DialogTrigger: React.ComponentType<Record<string, unknown>>;
    };
    dropdownMenu: {
      DropdownMenu: React.ComponentType<Record<string, unknown>>;
      DropdownMenuCheckboxItem: React.ComponentType<Record<string, unknown>>;
      DropdownMenuContent: React.ComponentType<Record<string, unknown>>;
      DropdownMenuGroup: React.ComponentType<Record<string, unknown>>;
      DropdownMenuItem: React.ComponentType<Record<string, unknown>>;
      DropdownMenuLabel: React.ComponentType<Record<string, unknown>>;
      DropdownMenuPortal: React.ComponentType<Record<string, unknown>>;
      DropdownMenuRadioGroup: React.ComponentType<Record<string, unknown>>;
      DropdownMenuRadioItem: React.ComponentType<Record<string, unknown>>;
      DropdownMenuSeparator: React.ComponentType<Record<string, unknown>>;
      DropdownMenuShortcut: React.ComponentType<Record<string, unknown>>;
      DropdownMenuSub: React.ComponentType<Record<string, unknown>>;
      DropdownMenuSubContent: React.ComponentType<Record<string, unknown>>;
      DropdownMenuSubTrigger: React.ComponentType<Record<string, unknown>>;
      DropdownMenuTrigger: React.ComponentType<Record<string, unknown>>;
    };
    form: {
      Form: React.ComponentType<Record<string, unknown>>;
      FormControl: React.ComponentType<Record<string, unknown>>;
      FormDescription: React.ComponentType<Record<string, unknown>>;
      FormField: React.ComponentType<Record<string, unknown>>;
      FormItem: React.ComponentType<Record<string, unknown>>;
      FormLabel: React.ComponentType<Record<string, unknown>>;
      FormMessage: React.ComponentType<Record<string, unknown>>;
      useFormField: React.ComponentType<Record<string, unknown>>;
    };
    hoverCard: {
      HoverCard: React.ComponentType<Record<string, unknown>>;
      HoverCardContent: React.ComponentType<Record<string, unknown>>;
      HoverCardTrigger: React.ComponentType<Record<string, unknown>>;
    };
    input: {
      Input: React.ComponentType<Record<string, unknown>>;
    };
    inputGroup: {
      InputGroup: React.ComponentType<Record<string, unknown>>;
      InputGroupAddon: React.ComponentType<Record<string, unknown>>;
      InputGroupButton: React.ComponentType<Record<string, unknown>>;
      InputGroupInput: React.ComponentType<Record<string, unknown>>;
      InputGroupText: React.ComponentType<Record<string, unknown>>;
      InputGroupTextarea: React.ComponentType<Record<string, unknown>>;
    };
    kbd: {
      Kbd: React.ComponentType<Record<string, unknown>>;
      KbdGroup: React.ComponentType<Record<string, unknown>>;
    };
    label: {
      Label: React.ComponentType<Record<string, unknown>>;
    };
    marquee: {
      Marquee: React.ComponentType<Record<string, unknown>>;
    };
    modal: {
      Modal: React.ComponentType<Record<string, unknown>>;
      ModalHeader: React.ComponentType<Record<string, unknown>>;
      ModalBody: React.ComponentType<Record<string, unknown>>;
      ModalFooter: React.ComponentType<Record<string, unknown>>;
      ModalTitle: React.ComponentType<Record<string, unknown>>;
      ModalDescription: React.ComponentType<Record<string, unknown>>;
    };
    popover: {
      Popover: React.ComponentType<Record<string, unknown>>;
      PopoverAnchor: React.ComponentType<Record<string, unknown>>;
      PopoverContent: React.ComponentType<Record<string, unknown>>;
      PopoverTrigger: React.ComponentType<Record<string, unknown>>;
    };
    progress: {
      Progress: React.ComponentType<Record<string, unknown>>;
    };
    progressiveBlur: {
      GRADIENT_ANGLES: React.ComponentType<Record<string, unknown>>;
      ProgressiveBlur: React.ComponentType<Record<string, unknown>>;
    };
    radioGroup: {
      RadioGroup: React.ComponentType<Record<string, unknown>>;
      RadioGroupItem: React.ComponentType<Record<string, unknown>>;
    };
    resizable: {
      ResizableHandle: React.ComponentType<Record<string, unknown>>;
      ResizablePanel: React.ComponentType<Record<string, unknown>>;
      ResizablePanelGroup: React.ComponentType<Record<string, unknown>>;
    };
    scrollFade: {
      useScrollFade: React.ComponentType<Record<string, unknown>>;
      ScrollFadeOverlay: React.ComponentType<Record<string, unknown>>;
    };
    select: {
      Select: React.ComponentType<Record<string, unknown>>;
      SelectContent: React.ComponentType<Record<string, unknown>>;
      SelectGroup: React.ComponentType<Record<string, unknown>>;
      SelectItem: React.ComponentType<Record<string, unknown>>;
      SelectLabel: React.ComponentType<Record<string, unknown>>;
      SelectScrollDownButton: React.ComponentType<Record<string, unknown>>;
      SelectScrollUpButton: React.ComponentType<Record<string, unknown>>;
      SelectSeparator: React.ComponentType<Record<string, unknown>>;
      SelectTrigger: React.ComponentType<Record<string, unknown>>;
      SelectValue: React.ComponentType<Record<string, unknown>>;
    };
    separator: {
      Separator: React.ComponentType<Record<string, unknown>>;
    };
    slider: {
      Slider: React.ComponentType<Record<string, unknown>>;
    };
    spinner: {
      Spinner: React.ComponentType<Record<string, unknown>>;
    };
    splash: {
      SplashLoader: React.ComponentType<Record<string, unknown>>;
      SplashScreen: React.ComponentType<Record<string, unknown>>;
      Splash: React.ComponentType<Record<string, unknown>>;
    };
    switch: {
      Switch: React.ComponentType<Record<string, unknown>>;
    };
    tabs: {
      Tabs: React.ComponentType<Record<string, unknown>>;
      TabsContent: React.ComponentType<Record<string, unknown>>;
      TabsList: React.ComponentType<Record<string, unknown>>;
      TabsTrigger: React.ComponentType<Record<string, unknown>>;
    };
    textAnimate: {
      TextAnimate: React.ComponentType<Record<string, unknown>>;
    };
    textarea: {
      Textarea: React.ComponentType<Record<string, unknown>>;
    };
    toast: {
      sonnerToast: React.ComponentType<Record<string, unknown>>;
      CustomToast: React.ComponentType<Record<string, unknown>>;
      toast: React.ComponentType<Record<string, unknown>>;
    };
    tooltip: {
      Tooltip: React.ComponentType<Record<string, unknown>>;
      TooltipContent: React.ComponentType<Record<string, unknown>>;
      TooltipProvider: React.ComponentType<Record<string, unknown>>;
      TooltipTrigger: React.ComponentType<Record<string, unknown>>;
    };
    typewriter: {
      Typewriter: React.ComponentType<Record<string, unknown>>;
    };
  };
  export interface ExtensionViewProps {
    extensionId: string;
    state?: Record<string, unknown>;
  }
}

// Global extension props (for convenience)
interface ExtensionViewProps {
  extensionId: string;
  state?: Record<string, unknown>;
}
