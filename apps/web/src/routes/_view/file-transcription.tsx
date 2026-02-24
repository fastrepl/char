import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";

import type { JSONContent } from "@hypr/tiptap/editor";
import { EMPTY_TIPTAP_DOC } from "@hypr/tiptap/shared";
import "@hypr/tiptap/styles.css";

import { TranscriptDisplay } from "@/components/transcription/transcript-display";
import { UploadArea } from "@/components/transcription/upload-area";
import { fetchUser } from "@/functions/auth";

const NoteEditor = lazy(() => import("@hypr/tiptap/editor"));

export const Route = createFileRoute("/_view/file-transcription")({
  component: Component,
  validateSearch: (search: Record<string, unknown>) => ({
    id: (search.id as string) || undefined,
  }),
  beforeLoad: async ({ search }) => {
    const user = await fetchUser();
    if (user) {
      throw redirect({ to: "/app/file-transcription/", search });
    }
  },
  head: () => ({
    meta: [
      { title: "Free Audio Transcription Tool - Hyprnote" },
      {
        name: "description",
        content:
          "Transcribe audio files to text with AI-powered accuracy. Upload MP3, WAV, M4A, or other audio formats and get instant transcripts powered by Deepgram. Free to use.",
      },
      {
        property: "og:title",
        content: "Free Audio Transcription Tool - Hyprnote",
      },
      {
        property: "og:description",
        content:
          "Convert audio to text instantly. Upload your recordings and get accurate AI transcriptions. Supports multiple audio formats including MP3, WAV, and M4A.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://hyprnote.com/file-transcription",
      },
    ],
  }),
});

function Component() {
  const navigate = useNavigate({ from: Route.fullPath });
  const [noteContent, setNoteContent] = useState<JSONContent>(EMPTY_TIPTAP_DOC);

  const handleFileSelect = () => {
    navigate({ to: "/auth/", search: { redirect: "/file-transcription/" } });
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
        <div className="flex items-center justify-center py-16 lg:py-20 bg-linear-to-b from-stone-50/30 to-stone-100/30 border-b border-neutral-100">
          <div className="text-center max-w-2xl px-4">
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-stone-600 mb-4">
              Audio Transcription
            </h1>
            <p className="text-lg text-neutral-600 mb-6">
              Upload your audio file and get an accurate transcript powered by
              Deepgram. Supports MP3, WAV, M4A, and other common audio formats.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-neutral-500">
              <span className="flex items-center gap-1.5 px-3 py-1 bg-white border border-neutral-200 rounded-full">
                MP3
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 bg-white border border-neutral-200 rounded-full">
                WAV
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 bg-white border border-neutral-200 rounded-full">
                M4A
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 bg-white border border-neutral-200 rounded-full">
                FLAC
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 bg-white border border-neutral-200 rounded-full">
                OGG
              </span>
            </div>
          </div>
        </div>

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
                  <UploadArea
                    onFileSelect={handleFileSelect}
                    disabled={false}
                  />

                  <div>
                    <h3 className="text-sm font-medium text-neutral-700 mb-3">
                      Your Notes
                    </h3>
                    <div className="border border-neutral-200 rounded-xs p-4 min-h-[200px] bg-neutral-50/30">
                      <Suspense fallback={null}>
                        <NoteEditor
                          initialContent={noteContent}
                          handleChange={setNoteContent}
                          mentionConfig={mentionConfig}
                        />
                      </Suspense>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-serif font-medium mb-2">
                    Final Result
                  </h2>
                  <p className="text-sm text-neutral-600">
                    Combined notes with transcript
                  </p>
                </div>
                <Link
                  to="/auth/"
                  search={{ redirect: "/file-transcription" }}
                  className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all"
                >
                  Sign in
                </Link>
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
                    transcript={null}
                    status="idle"
                    error={null}
                  />
                </div>
              </div>

              <div className="p-4 bg-stone-50 border border-neutral-200 rounded-xs">
                <p className="text-sm text-neutral-600">
                  Sign in to view and save your transcription results
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-12 bg-stone-50/50 border-t border-neutral-100">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-serif text-stone-600 mb-8 text-center">
              Why Use Hyprnote for Transcription?
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-5 bg-white border border-neutral-200 rounded-lg">
                <h3 className="font-medium text-stone-700 mb-2">
                  AI-Powered Accuracy
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  Powered by Deepgram's advanced speech recognition for
                  industry-leading transcription accuracy across accents and
                  audio quality.
                </p>
              </div>
              <div className="p-5 bg-white border border-neutral-200 rounded-lg">
                <h3 className="font-medium text-stone-700 mb-2">
                  Speaker Diarization
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  Automatically identify and label different speakers in your
                  recordings for easy-to-follow transcripts.
                </p>
              </div>
              <div className="p-5 bg-white border border-neutral-200 rounded-lg">
                <h3 className="font-medium text-stone-700 mb-2">
                  Combine with Notes
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  Add your own notes alongside the transcript to create
                  comprehensive meeting documentation.
                </p>
              </div>
              <div className="p-5 bg-white border border-neutral-200 rounded-lg">
                <h3 className="font-medium text-stone-700 mb-2">
                  Multiple Formats
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  Upload MP3, WAV, M4A, FLAC, OGG, and other common audio
                  formats. No conversion needed.
                </p>
              </div>
              <div className="p-5 bg-white border border-neutral-200 rounded-lg">
                <h3 className="font-medium text-stone-700 mb-2">
                  Fast Processing
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  Get your transcripts quickly with optimized processing. Most
                  files are transcribed in seconds.
                </p>
              </div>
              <div className="p-5 bg-white border border-neutral-200 rounded-lg">
                <h3 className="font-medium text-stone-700 mb-2">
                  Export & Share
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  Download your transcripts or share them with your team. Keep
                  your meeting records organized.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-12 border-t border-neutral-100 text-center">
          <h2 className="text-2xl font-serif text-stone-600 mb-4">
            Want Real-Time Transcription?
          </h2>
          <p className="text-neutral-600 mb-6 max-w-xl mx-auto">
            Download Hyprnote for live meeting transcription with local AI
            processing, automatic summaries, and complete privacy.
          </p>
          <Link
            to="/download/"
            className="inline-block px-6 py-2.5 text-sm font-medium rounded-full bg-linear-to-t from-stone-600 to-stone-500 text-white hover:scale-105 active:scale-95 transition-transform"
          >
            Download Hyprnote Free
          </Link>
        </div>
      </div>
    </div>
  );
}
