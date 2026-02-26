import { describe, expect, test, vi } from "vitest";
import { createTestMainStore } from "~/store/tinybase/persister/testing/mocks";

import type { ParsedDocument } from "@hypr/plugin-fs-sync";

import { SESSION_MEMO_FILE } from "../../shared";
import { buildNoteSaveOps } from "./note";

vi.mock("@tauri-apps/api/path", () => ({
  sep: () => "/",
}));

describe("buildNoteSaveOps", () => {
  test("stores mention content as json to avoid lossy markdown conversion", () => {
    const store = createTestMainStore();
    const sessionId = "session-1";
    const contentWithMention = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Talk to " },
            {
              type: "mention-@",
              attrs: { id: "human-1", type: "human", label: "Alice" },
            },
          ],
        },
      ],
    });

    store.setRow("sessions", sessionId, {
      user_id: "user-1",
      created_at: "2024-01-01T00:00:00Z",
      title: "Test Session",
      folder_id: "",
      event_json: "",
      raw_md: contentWithMention,
    });

    const ops = buildNoteSaveOps(store, store.getTables(), "/data");
    const writeBatch = ops.find((op) => op.type === "write-document-batch");

    expect(writeBatch).toBeDefined();

    const memoItem = (
      writeBatch as { items: Array<[ParsedDocument, string]> }
    ).items.find(
      ([_, path]) =>
        path === `/data/sessions/${sessionId}/${SESSION_MEMO_FILE}`,
    );

    expect(memoItem).toBeDefined();
    expect(memoItem?.[0].content).toBe(contentWithMention);
  });

  test("converts non-mention tiptap json to markdown", () => {
    const store = createTestMainStore();
    const sessionId = "session-2";
    const contentWithoutMention = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "hello world" }],
        },
      ],
    });

    store.setRow("sessions", sessionId, {
      user_id: "user-1",
      created_at: "2024-01-01T00:00:00Z",
      title: "Test Session",
      folder_id: "",
      event_json: "",
      raw_md: contentWithoutMention,
    });

    const ops = buildNoteSaveOps(store, store.getTables(), "/data");
    const writeBatch = ops.find((op) => op.type === "write-document-batch");
    const memoItem = (
      writeBatch as { items: Array<[ParsedDocument, string]> }
    ).items.find(
      ([_, path]) =>
        path === `/data/sessions/${sessionId}/${SESSION_MEMO_FILE}`,
    );

    expect(memoItem).toBeDefined();
    expect(memoItem?.[0].content).toContain("hello world");
    expect(memoItem?.[0].content.startsWith('{"type":"doc"')).toBe(false);
  });
});
