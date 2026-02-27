import { createStore } from "zustand";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";
import {
  type DenoiseEvent,
  commands as listener2Commands,
  events as listener2Events,
} from "@hypr/plugin-listener2";

type DenoiseJob = {
  status: "running" | "completed" | "failed";
  progress: number;
  error?: string;
};

type DenoiseState = {
  jobs: Record<string, DenoiseJob>;
};

type DenoiseActions = {
  startDenoise: (sessionId: string) => Promise<void>;
  confirmDenoise: (sessionId: string) => Promise<void>;
  revertDenoise: (sessionId: string) => Promise<void>;
  getJob: (sessionId: string) => DenoiseJob | undefined;
};

function createDenoiseStore() {
  return createStore<DenoiseState & DenoiseActions>((set, get) => ({
    jobs: {},

    getJob: (sessionId: string) => {
      return get().jobs[sessionId];
    },

    confirmDenoise: async (sessionId: string) => {
      const result = await listener2Commands.audioConfirmDenoise(sessionId);
      if (result.status === "error") {
        set((state) => ({
          jobs: {
            ...state.jobs,
            [sessionId]: {
              status: "failed",
              progress: 0,
              error: result.error,
            },
          },
        }));
        return;
      }

      const { [sessionId]: _, ...rest } = get().jobs;
      set({ jobs: rest });
    },

    revertDenoise: async (sessionId: string) => {
      const result = await listener2Commands.audioRevertDenoise(sessionId);
      if (result.status === "error") {
        set((state) => ({
          jobs: {
            ...state.jobs,
            [sessionId]: {
              status: "failed",
              progress: 0,
              error: result.error,
            },
          },
        }));
        return;
      }

      const { [sessionId]: _, ...rest } = get().jobs;
      set({ jobs: rest });
    },

    startDenoise: async (sessionId: string) => {
      const existing = get().jobs[sessionId];
      if (existing?.status === "running") {
        return;
      }

      const audioPathResult = await fsSyncCommands.audioPath(sessionId);
      if (audioPathResult.status === "error") {
        set((state) => ({
          jobs: {
            ...state.jobs,
            [sessionId]: {
              status: "failed",
              progress: 0,
              error: audioPathResult.error,
            },
          },
        }));
        return;
      }

      const sessionDirResult = await fsSyncCommands.sessionDir(sessionId);
      if (sessionDirResult.status === "error") {
        set((state) => ({
          jobs: {
            ...state.jobs,
            [sessionId]: {
              status: "failed",
              progress: 0,
              error: sessionDirResult.error,
            },
          },
        }));
        return;
      }

      const inputPath = audioPathResult.data;
      const outputPath = `${sessionDirResult.data}/audio-postprocess.wav`;

      set((state) => ({
        jobs: {
          ...state.jobs,
          [sessionId]: { status: "running", progress: 0 },
        },
      }));

      const unlisten = await listener2Events.denoiseEvent.listen(
        (event: { payload: DenoiseEvent }) => {
          const data = event.payload;

          if (!("session_id" in data) || data.session_id !== sessionId) {
            return;
          }

          switch (data.type) {
            case "denoiseProgress":
              set((state) => ({
                jobs: {
                  ...state.jobs,
                  [sessionId]: { status: "running", progress: data.percentage },
                },
              }));
              break;
            case "denoiseCompleted":
              set((state) => ({
                jobs: {
                  ...state.jobs,
                  [sessionId]: { status: "completed", progress: 100 },
                },
              }));
              unlisten();
              break;
            case "denoiseFailed":
              set((state) => ({
                jobs: {
                  ...state.jobs,
                  [sessionId]: {
                    status: "failed",
                    progress: 0,
                    error: data.error,
                  },
                },
              }));
              unlisten();
              break;
          }
        },
      );

      const result = await listener2Commands.runDenoise({
        session_id: sessionId,
        input_path: inputPath,
        output_path: outputPath,
      });

      if (result.status === "error") {
        set((state) => ({
          jobs: {
            ...state.jobs,
            [sessionId]: { status: "failed", progress: 0, error: result.error },
          },
        }));
        unlisten();
      }
    },
  }));
}

export const denoiseStore = createDenoiseStore();
