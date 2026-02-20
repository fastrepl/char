/**
 * Hyprnote Extension Runtime Configuration
 *
 * This is the SINGLE SOURCE OF TRUTH for what's available to extensions.
 * From this config, we generate:
 *   - types/hypr-extension.d.ts (TypeScript types for extension developers)
 *   - Build plugin mappings (esbuild externals)
 *   - Documentation
 *
 * The desktop app's extension-globals.ts must expose these same globals.
 */

export interface ModuleConfig {
  global: string;
  description?: string;
}

export interface SubpathModuleConfig extends ModuleConfig {
  subpaths: string[];
}

export function getUiComponentAlias(subpath: string): string {
  const segments = subpath.split("/");
  const name = segments[segments.length - 1] ?? subpath;
  return name.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}

export const CORE_MODULES = {
  react: { global: "__hypr_react" },
  "react/jsx-runtime": { global: "__hypr_jsx_runtime" },
  "react-dom": { global: "__hypr_react_dom" },
} as const satisfies Record<string, ModuleConfig>;

export const HYPR_MODULES = {
  "@hypr/tabs": {
    global: "__hypr_tabs",
    description: "Tab navigation (open sessions, events, etc.)",
    exports: {
      useTabs: {
        type: `{
    <T>(selector: (state: {
      openNew: (tab:
        | { type: "sessions"; id: string }
        | { type: "events"; id: string }
        | { type: "humans"; id: string }
        | { type: "organizations"; id: string }
        | { type: "folders"; id: string | null }
        | { type: "contacts"; state?: { selectedOrganization?: string | null; selectedPerson?: string | null } }
        | { type: "empty" }
        | { type: "extension"; extensionId: string; state?: Record<string, unknown> }
      ) => void;
    }) => T): T;
  }`,
        description: "Hook to access tab navigation",
      },
    },
  },
  "@hypr/store": {
    global: "__hypr_store",
    description:
      "TinyBase store with app data (sessions, events, humans, etc.)",
    exports: {
      STORE_ID: {
        type: '"main"',
        description: "The main store identifier",
      },
      UI: {
        type: `_UI.WithSchemas<Schemas>`,
        description: "TinyBase UI hooks",
      },
      INDEXES: {
        type: `{
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
  }`,
        description: "Available TinyBase indexes",
      },
      QUERIES: {
        type: `{
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
  }`,
        description: "Available TinyBase queries",
      },
      METRICS: {
        type: `{
    totalHumans: string;
    totalOrganizations: string;
  }`,
        description: "Available TinyBase metrics",
      },
      RELATIONSHIPS: {
        type: `{
    sessionToFolder: string;
    sessionToEvent: string;
    folderToParentFolder: string;
    enhancedNoteToSession: string;
  }`,
        description: "Available TinyBase relationships",
      },
    },
  },
  "@hypr/ui": {
    global: "__hypr_ui",
    description: "UI components (shadcn-style)",
  },
} as const;
