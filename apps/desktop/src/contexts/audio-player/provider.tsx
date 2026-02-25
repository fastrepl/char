import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import WaveSurfer from "wavesurfer.js";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";

type AudioPlayerState = "playing" | "paused" | "stopped";

interface AudioPlayerContextValue {
  registerContainer: (el: HTMLDivElement | null) => void;
  wavesurfer: WaveSurfer | null;
  state: AudioPlayerState;
  time: { current: number; total: number };
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (sec: number) => void;
  audioExists: boolean;
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  }
  return context;
}

export function AudioPlayerProvider({
  sessionId,
  url,
  children,
}: {
  sessionId: string;
  url: string;
  children: ReactNode;
}) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null);
  const [state, setState] = useState<AudioPlayerState>("stopped");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1);

  const audioExists = useQuery({
    queryKey: ["audio", sessionId, "exist"],
    queryFn: () => fsSyncCommands.audioExist(sessionId),
    select: (result) => {
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  const registerContainer = useCallback((el: HTMLDivElement | null) => {
    setContainer((prev) => (prev === el ? prev : el));
  }, []);

  useEffect(() => {
    if (!container || !url) {
      return;
    }

    const audio = new Audio(url);

    const ws = WaveSurfer.create({
      container,
      height: 30,
      waveColor: "#e5e5e5",
      progressColor: "#a8a8a8",
      cursorColor: "#737373",
      cursorWidth: 2,
      barWidth: 3,
      barGap: 2,
      barRadius: 2,
      barHeight: 1,
      media: audio,
      dragToSeek: true,
      normalize: true,
      splitChannels: [
        { waveColor: "#e8d5d5", progressColor: "#c9a3a3", overlay: true },
        { waveColor: "#d5dde8", progressColor: "#a3b3c9", overlay: true },
      ],
    });

    let audioContext: AudioContext | null = null;

    const handleReady = async () => {
      const dur = ws.getDuration();
      if (dur && isFinite(dur)) {
        setDuration(dur);
      }

      const media = ws.getMediaElement();
      if (!media) {
        return;
      }

      audioContext = new AudioContext();
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const source = audioContext.createMediaElementSource(media);
      const merger = audioContext.createChannelMerger(2);
      const splitter = audioContext.createChannelSplitter(2);

      source.connect(splitter);
      splitter.connect(merger, 0, 0);
      splitter.connect(merger, 0, 1);
      splitter.connect(merger, 1, 0);
      splitter.connect(merger, 1, 1);
      merger.connect(audioContext.destination);
    };

    const handleAudioprocess = () => {
      setCurrentTime(ws.getCurrentTime());
    };

    const handleTimeupdate = () => {
      setCurrentTime(ws.getCurrentTime());
    };

    const handleDecode = (dur: number) => {
      if (dur && isFinite(dur)) {
        setDuration(dur);
      }
    };

    const handleDestroy = () => {
      setState("stopped");
    };

    ws.on("decode", handleDecode);
    ws.on("ready", handleReady);
    ws.on("audioprocess", handleAudioprocess);
    ws.on("timeupdate", handleTimeupdate);

    // Listening to the "pause" event is problematic. Not sure why, but it is even called when I stop the player.
    ws.on("destroy", handleDestroy);

    setWavesurfer(ws);

    return () => {
      ws.destroy();
      setWavesurfer(null);
      audio.pause();
      audio.src = "";
      audio.load();
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [container, url]);

  const start = useCallback(() => {
    if (wavesurfer) {
      void wavesurfer.play();
      setState("playing");
    }
  }, [wavesurfer]);

  const pause = useCallback(() => {
    if (wavesurfer) {
      wavesurfer.pause();
      setState("paused");
    }
  }, [wavesurfer]);

  const resume = useCallback(() => {
    if (wavesurfer) {
      void wavesurfer.play();
      setState("playing");
    }
  }, [wavesurfer]);

  const stop = useCallback(() => {
    if (wavesurfer) {
      wavesurfer.stop();
      setState("stopped");
    }
  }, [wavesurfer]);

  const seek = useCallback(
    (timeInSeconds: number) => {
      if (wavesurfer) {
        wavesurfer.setTime(timeInSeconds);
      }
    },
    [wavesurfer],
  );

  const setPlaybackRate = useCallback(
    (rate: number) => {
      if (wavesurfer) {
        wavesurfer.setPlaybackRate(rate);
      }
      setPlaybackRateState(rate);
    },
    [wavesurfer],
  );

  return (
    <AudioPlayerContext.Provider
      value={{
        registerContainer,
        wavesurfer,
        state,
        time: { current: currentTime, total: duration },
        start,
        pause,
        resume,
        stop,
        seek,
        audioExists: audioExists.data ?? false,
        playbackRate,
        setPlaybackRate,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}
