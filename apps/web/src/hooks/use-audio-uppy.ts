import Uppy, { type UploadResult } from "@uppy/core";
import Tus from "@uppy/tus";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  buildObjectName,
  getTusEndpoint,
  STORAGE_CONFIG,
} from "@hypr/supabase/storage";

import { env } from "@/env";
import { getSupabaseBrowserClient } from "@/functions/supabase";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return {
    authorization: `Bearer ${token}`,
    "x-upsert": "true",
  };
}

type UploadState = {
  status: "idle" | "uploading" | "done" | "error";
  progress: number;
  fileId: string | null;
  error: string | null;
};

export function useAudioUppy() {
  const [state, setState] = useState<UploadState>({
    status: "idle",
    progress: 0,
    fileId: null,
    error: null,
  });

  const uppyRef = useRef<Uppy | null>(null);
  const generationRef = useRef(0);

  const uppy = useMemo(() => {
    const instance = new Uppy({
      restrictions: {
        maxNumberOfFiles: 1,
        allowedFileTypes: ["audio/*"],
      },
      autoProceed: false,
    });

    instance.use(Tus, {
      endpoint: getTusEndpoint(env.VITE_SUPABASE_URL!),
      chunkSize: STORAGE_CONFIG.chunkSize,
      retryDelays: [...STORAGE_CONFIG.retryDelays],
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      allowedMetaFields: [
        "bucketName",
        "objectName",
        "contentType",
        "cacheControl",
      ],
      onBeforeRequest: async (req) => {
        const headers = await getAuthHeaders();
        for (const [key, value] of Object.entries(headers)) {
          req.setHeader(key, value);
        }
      },
      onShouldRetry: (err, _retryAttempt, _options, next) => next(err),
    });

    uppyRef.current = instance;
    return instance;
  }, []);

  useEffect(() => {
    const onFileAdded = async (file: {
      id: string;
      name: string;
      type?: string;
    }) => {
      const generation = generationRef.current;
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      if (generation !== generationRef.current) return;

      const userId = data?.session?.user?.id;
      if (!userId) {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: "Not authenticated",
        }));
        return;
      }

      const objectName = buildObjectName(userId, file.name);
      uppy.setFileMeta(file.id, {
        bucketName: STORAGE_CONFIG.bucketName,
        objectName,
        contentType: file.type || "audio/mpeg",
        cacheControl: "3600",
      });

      setState({
        status: "uploading",
        progress: 0,
        fileId: objectName,
        error: null,
      });

      uppy.upload();
    };

    const onProgress = (progress: number) => {
      setState((prev) => ({ ...prev, progress }));
    };

    const onComplete = (
      result: UploadResult<Record<string, unknown>, Record<string, never>>,
    ) => {
      if (result.failed && result.failed.length > 0) {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: "Upload failed",
        }));
      } else {
        setState((prev) => ({ ...prev, status: "done", progress: 100 }));
      }
    };

    const onUploadError = (_file: unknown, error: Error) => {
      setState((prev) => ({ ...prev, status: "error", error: error.message }));
    };

    const onError = (error: Error) => {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: error.message,
      }));
    };

    uppy.on("file-added", onFileAdded);
    uppy.on("progress", onProgress);
    uppy.on("complete", onComplete);
    uppy.on("error", onError);
    uppy.on("upload-error", onUploadError);

    return () => {
      uppy.off("file-added", onFileAdded);
      uppy.off("progress", onProgress);
      uppy.off("complete", onComplete);
      uppy.off("error", onError);
      uppy.off("upload-error", onUploadError);
    };
  }, [uppy]);

  useEffect(() => {
    return () => {
      uppyRef.current?.cancelAll();
    };
  }, []);

  const addFile = (file: File) => {
    generationRef.current++;
    uppy.cancelAll();
    setState({ status: "idle", progress: 0, fileId: null, error: null });
    uppy.addFile({
      name: file.name,
      type: file.type,
      data: file,
    });
  };

  const reset = () => {
    generationRef.current++;
    uppy.cancelAll();
    setState({ status: "idle", progress: 0, fileId: null, error: null });
  };

  return {
    addFile,
    reset,
    status: state.status,
    progress: state.progress,
    fileId: state.fileId,
    error: state.error,
  };
}
