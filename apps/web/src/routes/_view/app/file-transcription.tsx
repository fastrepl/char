import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { sttListenBatch, sttStatus } from "@hypr/api-client";
import type {
  ListenCallbackResponse,
  PipelineStatus,
  SttStatusResponse,
} from "@hypr/api-client";
import { createClient } from "@hypr/api-client/client";
import NoteEditor, { type JSONContent } from "@hypr/tiptap/editor";
import { EMPTY_TIPTAP_DOC } from "@hypr/tiptap/shared";
import "@hypr/tiptap/styles.css";
import { cn } from "@hypr/utils";

import {
  FileInfo,
  TranscriptDisplay,
} from "@/components/transcription/transcript-display";
import { UploadArea } from "@/components/transcription/upload-area";
import { env } from "@/env";
import { getSupabaseBrowserClient } from "@/functions/supabase";
import { useAudioUppy } from "@/hooks/use-audio-uppy";

function createAuthClient(accessToken: string) {
  return createClient({
    baseUrl: env.VITE_API_URL,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function getAccessToken(): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) {
    throw new Error("Not authenticated");
  }
  return token;
}

function extractTranscript(response: SttStatusResponse): string | null {
  if (response.status !== "done" || !response.rawResult) return null;

  // Soniox: { text: "...", tokens: [...] }
  if (typeof response.rawResult.text === "string") {
    return response.rawResult.text;
  }

  // Deepgram: { results: { channels: [{ alternatives: [{ transcript: "..." }] }] } }
  const results = response.rawResult.results as
    | { channels?: Array<{ alternatives?: Array<{ transcript?: string }> }> }
    | undefined;
  const transcript = results?.channels?.[0]?.alternatives?.[0]?.transcript;
  if (typeof transcript === "string") {
    return transcript;
  }

  return null;
}

export const Route = createFileRoute("/_view/app/file-transcription")({
  component: Component,
  validateSearch: (search: Record<string, unknown>) => ({
    id: (search.id as string) || undefined,
  }),
});

function Component() {
  const { id: searchId } = Route.useSearch();

  const [file, setFile] = useState<File | null>(null);
  const [pipelineId, setPipelineId] = useState<string | null>(searchId ?? null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState<JSONContent>(EMPTY_TIPTAP_DOC);
  const [isMounted, setIsMounted] = useState(false);

  const {
    addFile: uppyAddFile,
    reset: uppyReset,
    status: uppyStatus,
    progress: uppyProgress,
    fileId: uppyFileId,
    error: uppyError,
  } = useAudioUppy();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const startPipelineMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const token = await getAccessToken();
      const client = createAuthClient(token);
      const { data, error } = await sttListenBatch({
        client,
        body: { url: fileId },
        query: { callback: "true", provider: "deepgram" },
      });
      if (error || !data) {
        throw new Error("Failed to start transcription");
      }
      // callback mode returns ListenCallbackResponse, not BatchResponse
      return (data as unknown as ListenCallbackResponse).request_id;
    },
    onSuccess: (newPipelineId) => {
      setPipelineId(newPipelineId);
      const url = new URL(window.location.href);
      url.searchParams.set("id", newPipelineId);
      window.history.replaceState({}, "", url.toString());
    },
  });

  const pipelineStatusQuery = useQuery({
    queryKey: ["audioPipelineStatus", pipelineId],
    queryFn: async (): Promise<SttStatusResponse> => {
      if (!pipelineId) {
        throw new Error("Missing pipelineId");
      }
      const token = await getAccessToken();
      const client = createAuthClient(token);
      const { data, error } = await sttStatus({
        client,
        path: { pipeline_id: pipelineId },
      });
      if (error) {
        throw new Error("Failed to get status");
      }
      return data!;
    },
    enabled: !!pipelineId,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === "done" || s === "error" ? false : 2000;
    },
  });

  useEffect(() => {
    const data = pipelineStatusQuery.data;
    if (data) {
      const text = extractTranscript(data);
      if (text) {
        setTranscript(text);
      }
    }
  }, [pipelineStatusQuery.data]);

  const isProcessing =
    (!!pipelineId &&
      !satisfies(pipelineStatusQuery.data?.status, ["done", "error"])) ||
    startPipelineMutation.isPending;

  const pipelineStatus = pipelineStatusQuery.data?.status;

  const status = (() => {
    if (pipelineStatus === "error") {
      return "error" as const;
    }
    if (pipelineStatus === "done" || transcript) {
      return "done" as const;
    }
    if (pipelineStatus === "processing" || pipelineId) {
      return "transcribing" as const;
    }
    if (uppyStatus === "uploading") {
      return "uploading" as const;
    }
    if (uppyStatus === "error") {
      return "error" as const;
    }
    if (uppyStatus === "done" && uppyFileId) {
      return "uploaded" as const;
    }
    return "idle" as const;
  })();

  const errorMessage =
    uppyError ??
    (startPipelineMutation.error instanceof Error
      ? startPipelineMutation.error.message
      : null) ??
    (pipelineStatusQuery.isError && pipelineStatusQuery.error instanceof Error
      ? pipelineStatusQuery.error.message
      : null) ??
    (pipelineStatus === "error"
      ? (pipelineStatusQuery.data?.error ?? null)
      : null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setPipelineId(null);
    setTranscript(null);
    startPipelineMutation.reset();
    uppyAddFile(selectedFile);
  };

  const handleStartTranscription = () => {
    if (!uppyFileId) return;
    startPipelineMutation.mutate(uppyFileId);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPipelineId(null);
    setTranscript(null);
    setNoteContent(EMPTY_TIPTAP_DOC);
    startPipelineMutation.reset();
    uppyReset();
  };

  const mentionConfig = useMemo(
    () => ({
      trigger: "@",
      handleSearch: async () => {
        return [];
      },
    }),
    [],
  );

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="max-w-7xl mx-auto border-x border-neutral-100">
        <div className="flex items-center justify-center py-20 bg-linear-to-b from-stone-50/30 to-stone-100/30 border-b border-neutral-100">
          <div className="text-center max-w-2xl px-4">
            <h1 className="font-serif text-3xl font-medium mb-4">
              Audio Transcription
            </h1>
            <p className="text-neutral-600">
              Upload your audio file and get an accurate transcript powered by
              Deepgram
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="max-w-6xl mx-auto px-4 pt-8">
            <div className="border border-red-200 bg-red-50 rounded-xs p-4">
              <p className="text-sm text-red-600">{errorMessage}</p>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-serif font-medium mb-2">
                  Raw Note + Audio
                </h2>
                <p className="text-sm text-neutral-600">
                  Upload your audio and add your notes
                </p>
              </div>

              <div className="border border-neutral-200 rounded-lg shadow-xs bg-white overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100 bg-neutral-50/50">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="ml-2 text-sm text-neutral-500">
                    meeting content
                  </span>
                </div>

                <div className="p-6 flex flex-col gap-6">
                  {!file ? (
                    <UploadArea
                      onFileSelect={handleFileSelect}
                      disabled={isProcessing}
                    />
                  ) : (
                    <div className="flex flex-col gap-4">
                      <FileInfo
                        fileName={file.name}
                        fileSize={file.size}
                        onRemove={handleRemoveFile}
                        isUploading={uppyStatus === "uploading"}
                        isProcessing={isProcessing}
                        uploadProgress={uppyProgress}
                      />
                      {status === "uploaded" && (
                        <button
                          onClick={handleStartTranscription}
                          className={cn([
                            "w-full flex items-center justify-center gap-2",
                            "px-4 py-3 rounded-lg",
                            "bg-linear-to-t from-stone-600 to-stone-500",
                            "text-white font-medium",
                            "shadow-md hover:shadow-lg",
                            "hover:scale-[101%] active:scale-[99%]",
                            "transition-all",
                          ])}
                        >
                          <Play size={18} />
                          Start Transcription
                        </button>
                      )}
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-medium text-neutral-700 mb-3">
                      Your Notes
                    </h3>
                    <div className="border border-neutral-200 rounded-xs p-4 min-h-[200px] bg-neutral-50/30">
                      {isMounted && (
                        <NoteEditor
                          initialContent={noteContent}
                          handleChange={setNoteContent}
                          mentionConfig={mentionConfig}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-serif font-medium mb-2">
                  Final Result
                </h2>
                <p className="text-sm text-neutral-600">
                  Combined notes with transcript
                </p>
              </div>

              <div className="border border-neutral-200 rounded-lg shadow-xs bg-white overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100 bg-neutral-50/50">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="ml-2 text-sm text-neutral-500">summary</span>
                </div>

                <div className="p-6">
                  <TranscriptDisplay
                    transcript={transcript}
                    status={status}
                    error={errorMessage}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function satisfies(
  value: PipelineStatus | undefined,
  targets: PipelineStatus[],
): boolean {
  return value != null && targets.includes(value);
}
