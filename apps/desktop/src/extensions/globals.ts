import * as React from "react";
import * as ReactDOM from "react-dom";
import * as jsxRuntime from "react/jsx-runtime";
import * as tinybaseUiReact from "tinybase/ui-react";
import * as main from "~/store/tinybase/store/main";
import { useTabs } from "~/store/zustand/tabs";

import * as utils from "@hypr/utils";

import { getUiComponentAlias } from "../../../../extensions/shared/runtime";

const rawHyprUiModules = import.meta.glob<Record<string, unknown>>(
  "../../../../packages/ui/src/components/**/*.{ts,tsx}",
  { eager: true },
);

const hyprUiModules = Object.entries(rawHyprUiModules).reduce<
  Record<string, Record<string, unknown>>
>((acc, [modulePath, moduleExports]) => {
  const relativeFromSrc =
    modulePath.split("packages/ui/src/")[1] ??
    modulePath.split("packages\\ui\\src\\")[1];

  if (!relativeFromSrc) {
    return acc;
  }

  const normalized = relativeFromSrc
    .replace(/\\/g, "/")
    .replace(/\.(ts|tsx)$/, "");

  if (!normalized.startsWith("components/")) {
    return acc;
  }

  acc[normalized] = moduleExports as Record<string, unknown>;
  return acc;
}, {});

type HyprnoteRuntime = {
  react: typeof React;
  reactDom: typeof ReactDOM;
  jsxRuntime: typeof jsxRuntime;
  tinybaseUiReact: typeof tinybaseUiReact;
  store: typeof main;
  tabs: { useTabs: typeof useTabs };
  ui: Record<string, Record<string, unknown>>;
  utils: typeof utils;
};

declare global {
  interface Window {
    __hypr_react: typeof React;
    __hypr_react_dom: typeof ReactDOM;
    __hypr_jsx_runtime: typeof jsxRuntime;
    __hypr_ui: Record<string, Record<string, unknown>>;
    __hypr_utils: typeof utils;
    __hypr_store: typeof main;
    __hypr_tabs: { useTabs: typeof useTabs };
    __hypr_tinybase_ui_react: typeof tinybaseUiReact;
    __hyprnote: HyprnoteRuntime;
  }
}

export function initExtensionGlobals() {
  window.__hypr_react = React;
  window.__hypr_react_dom = ReactDOM;
  window.__hypr_jsx_runtime = jsxRuntime;
  window.__hypr_utils = utils;
  window.__hypr_tinybase_ui_react = tinybaseUiReact;

  window.__hypr_ui = hyprUiModules;

  window.__hypr_store = main;
  window.__hypr_tabs = { useTabs };

  const uiNamespace = Object.entries(window.__hypr_ui).reduce<
    Record<string, Record<string, unknown>>
  >((acc, [subpath, module]) => {
    acc[getUiComponentAlias(subpath)] = module as Record<string, unknown>;
    return acc;
  }, {});

  window.__hyprnote = {
    react: window.__hypr_react,
    reactDom: window.__hypr_react_dom,
    jsxRuntime: window.__hypr_jsx_runtime,
    tinybaseUiReact: window.__hypr_tinybase_ui_react,
    store: window.__hypr_store,
    tabs: window.__hypr_tabs,
    ui: uiNamespace,
    utils,
  };
}
