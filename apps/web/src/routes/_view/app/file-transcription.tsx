import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import NoteEditor, { type JSONContent } from "@hypr/tiptap/editor";
import { EMPTY_TIPTAP_DOC } from "@hypr/tiptap/shared";
import "@hypr/tiptap/styles.css";
import { cn } from "@hypr/utils";

import {
  FileInfo,
  TranscriptDisplay,
} from "@/components/transcription/transcript-display";
import { UploadArea } from "@/components/transcription/upload-area";
import {
  getAudioPipelineStatus,
  startAudioPipeline,
  type StatusStateType,
} from "@/functions/transcription";
import { uploadAudioFile } from "@/functions/upload";

export const Route = createFileRoute("/_view/app/file-transcription")({
  component: Component,
  validateSearch: (search: Record<string, unknown>) => ({
    id: (search.id as string) || undefined,
  }),
});

function Component() {
  const [file, setFile] = useState<File | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState<JSONContent>(EMPTY_TIPTAP_DOC);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const uploadMutation = useMutation({
    mutationFn: async (selectedFile: File) => {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result?.toString().split(",")[1];
          if (!result) {
            reject(new Error("Failed to read file"));
          } else {
            resolve(result);
          }
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(selectedFile);
      });

      const uploadResult = await uploadAudioFile({
        data: {
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileData: base64Data,
        },
      });

      if ("error" in uploadResult && uploadResult.error) {
        throw new Error(uploadResult.message || "Failed to upload file");
      }
      if (!("fileId" in uploadResult)) {
        throw new Error("Failed to get file ID");
      }

      return uploadResult.fileId;
    },
    onSuccess: (newFileId) => {
      setFileId(newFileId);
    },
  });

  const startPipelineMutation = useMutation({
    mutationFn: async (fileIdArg: string) => {
      const pipelineResult = await startAudioPipeline({
        data: { fileId: fileIdArg },
      });

      if ("error" in pipelineResult && pipelineResult.error) {
        throw new Error(pipelineResult.message || "Failed to start pipeline");
      }
      if (!("pipelineId" in pipelineResult)) {
        throw new Error("Failed to get pipeline ID");
      }

      return pipelineResult.pipelineId;
    },
    onSuccess: (newPipelineId) => {
      setPipelineId(newPipelineId);
    },
  });

  const pipelineStatusQuery = useQuery({
    queryKey: ["audioPipelineStatus", pipelineId],
    queryFn: async (): Promise<StatusStateType> => {
      if (!pipelineId) {
        throw new Error("Missing pipelineId");
      }
      const res = (await getAudioPipelineStatus({
        data: { pipelineId },
      })) as
        | { success: true; status: StatusStateType }
        | { error: true; message?: string };
      if ("error" in res && res.error) {
        throw new Error(res.message ?? "Failed to get pipeline status");
      }
      if (!("status" in res) || !res.status) {
        throw new Error("Invalid response from pipeline status");
      }
      return res.status;
    },
    enabled: !!pipelineId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      const isTerminal = status === "DONE" || status === "ERROR";
      return isTerminal ? false : 2000;
    },
  });

  useEffect(() => {
    const data = pipelineStatusQuery.data;
    if (data?.status === "DONE" && data.transcript) {
      setTranscript(data.transcript);
    }
  }, [pipelineStatusQuery.data]);

  const isProcessing =
    (!!pipelineId &&
      !["DONE", "ERROR"].includes(pipelineStatusQuery.data?.status ?? "")) ||
    startPipelineMutation.isPending;

  const pipelineStatus = pipelineStatusQuery.data?.status;

  const status = (() => {
    if (pipelineStatusQuery.data?.status === "ERROR") {
      return "error" as const;
    }
    if (pipelineStatusQuery.data?.status === "DONE" || transcript) {
      return "done" as const;
    }
    if (pipelineStatus === "LLM_RUNNING") {
      return "summarizing" as const;
    }
    if (pipelineStatus === "TRANSCRIBED") {
      return "summarizing" as const;
    }
    if (pipelineStatus === "TRANSCRIBING") {
      return "transcribing" as const;
    }
    if (pipelineStatus === "QUEUED" || pipelineId) {
      return "queued" as const;
    }
    if (uploadMutation.isPending) {
      return "uploading" as const;
    }
    if (fileId) {
      return "uploaded" as const;
    }
    return "idle" as const;
  })();

  const errorMessage =
    (uploadMutation.error instanceof Error
      ? uploadMutation.error.message
      : null) ??
    (startPipelineMutation.error instanceof Error
      ? startPipelineMutation.error.message
      : null) ??
    (pipelineStatusQuery.isError && pipelineStatusQuery.error instanceof Error
      ? pipelineStatusQuery.error.message
      : null) ??
    (pipelineStatusQuery.data?.status === "ERROR"
      ? (pipelineStatusQuery.data.error ?? null)
      : null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setFileId(null);
    setPipelineId(null);
    setTranscript(null);
    uploadMutation.reset();
    startPipelineMutation.reset();
    uploadMutation.mutate(selectedFile);
  };

  const handleStartTranscription = () => {
    if (!fileId) return;
    startPipelineMutation.mutate(fileId);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFileId(null);
    setPipelineId(null);
    setTranscript(null);
    setNoteContent(EMPTY_TIPTAP_DOC);
    uploadMutation.reset();
    startPipelineMutation.reset();
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
                        isUploading={uploadMutation.isPending}
                        isProcessing={isProcessing}
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
