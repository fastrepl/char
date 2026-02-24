import { createClient as createDeepgramClient } from "@deepgram/sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  getFileTranscriptionResultByPipelineId,
  getFileTranscriptionStatusByPipelineId,
  postFileTranscriptionStart,
} from "@hypr/api-client";
import { createClient } from "@hypr/api-client/client";

import { env, requireEnv } from "@/env";
import { getSupabaseServerClient } from "@/functions/supabase";

export type PipelineStatusType =
  | "QUEUED"
  | "TRANSCRIBING"
  | "TRANSCRIBED"
  | "LLM_RUNNING"
  | "DONE"
  | "ERROR";

export type StatusStateType = {
  status: PipelineStatusType;
  transcript?: string;
  llmResult?: string;
  error?: string;
};

export const startAudioPipeline = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      fileId: z.string(),
      pipelineId: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      return { error: true, message: "Unauthorized" };
    }

    const client = createClient({
      baseUrl: env.VITE_API_URL,
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    const { data: result, error } = await postFileTranscriptionStart({
      client,
      body: {
        fileId: data.fileId,
        pipelineId: data.pipelineId,
      },
    });

    if (error || !result) {
      return { error: true, message: "Failed to start pipeline" };
    }

    return {
      success: true,
      pipelineId: result.pipelineId,
      invocationId: result.invocationId,
    };
  });

export const getAudioPipelineStatus = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      pipelineId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      return { error: true, message: "Unauthorized" };
    }

    const client = createClient({
      baseUrl: env.VITE_API_URL,
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    const { data: status, error } =
      await getFileTranscriptionStatusByPipelineId({
        client,
        path: { pipelineId: data.pipelineId },
      });

    if (error || !status) {
      return { error: true, message: "Failed to get pipeline status" };
    }

    return {
      success: true,
      status,
    };
  });

export const getAudioPipelineResult = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      pipelineId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      return { error: true, message: "Unauthorized" };
    }

    const client = createClient({
      baseUrl: env.VITE_API_URL,
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    const { data: result, error } =
      await getFileTranscriptionResultByPipelineId({
        client,
        path: { pipelineId: data.pipelineId },
      });

    if (error || !result) {
      return { error: true, message: "Failed to get pipeline result" };
    }

    return {
      success: true,
      result,
    };
  });

export const transcribeAudio = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      audioUrl: z.string(),
      fileName: z.string(),
      fileSize: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return { error: true, message: "Unauthorized" };
    }

    const deepgram = createDeepgramClient(
      requireEnv(env.DEEPGRAM_API_KEY, "DEEPGRAM_API_KEY"),
    );

    const transcriptionRecord = await supabase
      .from("transcriptions")
      .insert({
        user_id: userData.user.id,
        file_name: data.fileName,
        file_size: data.fileSize,
        status: "processing",
        progress: 0,
      })
      .select()
      .single();

    if (transcriptionRecord.error) {
      return { error: true, message: transcriptionRecord.error.message };
    }

    try {
      const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
        {
          url: data.audioUrl,
        },
        {
          model: "nova-2",
          smart_format: true,
        },
      );

      if (error) {
        await supabase
          .from("transcriptions")
          .update({
            status: "failed",
            error: error.message,
            updated_at: new Date().toISOString(),
          })
          .eq("id", transcriptionRecord.data.id);

        return { error: true, message: error.message };
      }

      const transcript =
        result.results.channels[0].alternatives[0].transcript || "";

      await supabase
        .from("transcriptions")
        .update({
          status: "completed",
          progress: 100,
          transcript,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transcriptionRecord.data.id);

      return {
        success: true,
        transcriptionId: transcriptionRecord.data.id,
        transcript,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";

      await supabase
        .from("transcriptions")
        .update({
          status: "failed",
          error: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transcriptionRecord.data.id);

      return { error: true, message: errorMessage };
    }
  });

export const getTranscription = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return { error: true, message: "Unauthorized" };
    }

    const { data: transcription, error } = await supabase
      .from("transcriptions")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userData.user.id)
      .single();

    if (error) {
      return { error: true, message: error.message };
    }

    return { success: true, transcription };
  });
