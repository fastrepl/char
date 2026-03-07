import { createMergeableStore } from "tinybase/with-schemas";
import { describe, expect, test, vi } from "vitest";

const {
  setRespectDoNotDisturb,
  setIgnoredBundleIds,
  setMicActiveThreshold,
  setDisabled,
  startServer,
  stopServer,
} = vi.hoisted(() => ({
  setRespectDoNotDisturb: vi
    .fn()
    .mockResolvedValue({ status: "ok", data: null }),
  setIgnoredBundleIds: vi.fn().mockResolvedValue({ status: "ok", data: null }),
  setMicActiveThreshold: vi
    .fn()
    .mockResolvedValue({ status: "ok", data: null }),
  setDisabled: vi.fn().mockResolvedValue({ status: "ok", data: null }),
  startServer: vi.fn().mockResolvedValue({ status: "ok", data: null }),
  stopServer: vi.fn().mockResolvedValue({ status: "ok", data: null }),
}));

vi.mock("@tauri-apps/plugin-autostart", () => ({
  enable: vi.fn(),
  disable: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-process", () => ({
  relaunch: vi.fn(),
}));

vi.mock("@hypr/plugin-analytics", () => ({
  commands: {
    setDisabled,
  },
}));

vi.mock("@hypr/plugin-detect", () => ({
  commands: {
    setRespectDoNotDisturb,
    setIgnoredBundleIds,
    setMicActiveThreshold,
  },
}));

vi.mock("@hypr/plugin-local-stt", () => ({
  commands: {
    startServer,
    stopServer,
  },
}));

vi.mock("@hypr/plugin-windows", () => ({
  getCurrentWebviewWindowLabel: () => "main",
}));

vi.mock("@hypr/plugin-store2", () => ({
  commands: {
    save: vi.fn(),
  },
}));

import {
  applyInitialSettingsSideEffects,
  SCHEMA,
} from "~/store/tinybase/store/settings";

describe("applyInitialSettingsSideEffects", () => {
  test("applies persisted detect settings on startup", () => {
    const store = createMergeableStore()
      .setTablesSchema(SCHEMA.table)
      .setValuesSchema(SCHEMA.value);

    store.setValues({
      respect_dnd: true,
      ignored_platforms: '["Codex","app.spokenly"]',
      mic_active_threshold: 30,
      telemetry_consent: false,
      current_stt_provider: "hyprnote",
      current_stt_model: "base",
    });

    applyInitialSettingsSideEffects(store);

    expect(setRespectDoNotDisturb).toHaveBeenCalledWith(true);
    expect(setIgnoredBundleIds).toHaveBeenCalledWith(["Codex", "app.spokenly"]);
    expect(setMicActiveThreshold).toHaveBeenCalledWith(30);
    expect(setDisabled).toHaveBeenCalledWith(true);
    expect(startServer).toHaveBeenCalledWith("base");
    expect(stopServer).not.toHaveBeenCalled();
  });
});
