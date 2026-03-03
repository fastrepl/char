import { CalendarIcon, MonitorIcon, SearchIcon, UserIcon } from "lucide-react";

import type { ContextEntity, ContextEntityKind } from "./entities";

export type ContextChipProps = {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tooltip: string;
  removable?: boolean;
};

type EntityRenderer<E extends ContextEntity> = {
  toChip: (entity: E) => ContextChipProps | null;
};

type ExtractEntity<K extends ContextEntityKind> = Extract<
  ContextEntity,
  { kind: K }
>;

type RendererMap = {
  [K in ContextEntityKind]: EntityRenderer<ExtractEntity<K>>;
};

const renderers: RendererMap = {
  session: {
    toChip: (entity) => {
      const label = entity.title || entity.date || "Session";
      const tooltip =
        [entity.title, entity.date].filter(Boolean).join("\n") ||
        entity.sessionId;
      const isFromTool = entity.source === "tool";
      return {
        key: entity.key,
        icon: isFromTool ? SearchIcon : CalendarIcon,
        label,
        tooltip,
        removable: entity.removable,
      };
    },
  },

  account: {
    toChip: (entity) => {
      if (!entity.email && !entity.userId) return null;
      const lines: string[] = [];
      if (entity.email) lines.push(entity.email);
      if (entity.userId) lines.push(`ID: ${entity.userId}`);
      return {
        key: entity.key,
        icon: UserIcon,
        label: "Account",
        tooltip: lines.join("\n"),
      };
    },
  },

  device: {
    toChip: (entity) => {
      const lines: string[] = [];
      if (entity.platform) lines.push(`Platform: ${entity.platform}`);
      if (entity.arch) lines.push(`Architecture: ${entity.arch}`);
      if (entity.osVersion) lines.push(`OS Version: ${entity.osVersion}`);
      if (entity.appVersion) lines.push(`App: ${entity.appVersion}`);
      if (entity.buildHash) lines.push(`Build: ${entity.buildHash}`);
      if (entity.locale) lines.push(`Locale: ${entity.locale}`);
      return {
        key: entity.key,
        icon: MonitorIcon,
        label: "Device",
        tooltip: lines.join("\n"),
      };
    },
  },
} satisfies RendererMap;

export function renderChip(entity: ContextEntity): ContextChipProps | null {
  const renderer = renderers[entity.kind] as EntityRenderer<typeof entity>;
  return renderer.toChip(entity);
}
