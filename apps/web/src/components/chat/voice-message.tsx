"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceMessageProps {
  src: string;
  duration?: number;
}

const SPEEDS = [1, 1.5, 2] as const;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VoiceMessage({ src }: VoiceMessageProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  // Generate waveform from audio data
  useEffect(() => {
    const ctx = new AudioContext();
    fetch(src)
      .then((res) => res.arrayBuffer())
      .then((buf) => ctx.decodeAudioData(buf))
      .then((audioBuffer) => {
        const rawData = audioBuffer.getChannelData(0);
        const samples = 48;
        const blockSize = Math.floor(rawData.length / samples);
        const bars: number[] = [];
        for (let i = 0; i < samples; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[i * blockSize + j]);
          }
          bars.push(sum / blockSize);
        }
        const max = Math.max(...bars, 0.01);
        setWaveformData(bars.map((b) => b / max));
        ctx.close();
      })
      .catch(() => {
        // Fallback: generate random waveform
        setWaveformData(Array.from({ length: 48 }, () => 0.2 + Math.random() * 0.8));
      });
  }, [src]);

  // Draw waveform
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const barCount = waveformData.length;
    const barWidth = 2.5;
    const gap = (w - barCount * barWidth) / (barCount - 1);
    const progress = totalDuration > 0 ? currentTime / totalDuration : 0;

    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < barCount; i++) {
      const x = i * (barWidth + gap);
      const barH = Math.max(3, waveformData[i] * (h - 4));
      const y = (h - barH) / 2;
      const barProgress = (i + 0.5) / barCount;

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, 1);

      if (barProgress <= progress) {
        ctx.fillStyle = "#a78bfa"; // teal-400
      } else {
        ctx.fillStyle = "rgba(161, 161, 170, 0.35)"; // zinc-400/35
      }
      ctx.fill();
    }
  }, [waveformData, currentTime, totalDuration]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => setTotalDuration(audio.duration);
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  // Animation loop for smoother waveform rendering
  useEffect(() => {
    if (!playing) return;
    const tick = () => {
      drawWaveform();
      animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationRef.current);
  }, [playing, drawWaveform]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  };

  const cycleSpeed = () => {
    const next = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = SPEEDS[next];
    }
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio || !totalDuration) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    audio.currentTime = progress * totalDuration;
    setCurrentTime(audio.currentTime);
  };

  return (
    <div className="mt-1.5 flex items-center gap-2.5 rounded-xl bg-accent/50 border border-border/50 px-3 py-2.5 max-w-[320px]">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all",
          playing
            ? "bg-teal-500 text-white shadow-md shadow-teal-500/25"
            : "bg-teal-500/15 text-teal-400 hover:bg-teal-500/25"
        )}
      >
        {playing ? (
          <Pause className="h-3.5 w-3.5" fill="currentColor" />
        ) : (
          <Play className="h-3.5 w-3.5 ml-0.5" fill="currentColor" />
        )}
      </button>

      {/* Waveform + Time */}
      <div className="flex-1 min-w-0">
        <canvas
          ref={canvasRef}
          onClick={handleWaveformClick}
          className="h-7 w-full cursor-pointer"
        />
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {playing || currentTime > 0
              ? formatTime(currentTime)
              : totalDuration > 0
                ? formatTime(totalDuration)
                : "0:00"}
          </span>
          {totalDuration > 0 && (playing || currentTime > 0) && (
            <span className="text-[10px] tabular-nums text-muted-foreground/60">
              -{formatTime(totalDuration - currentTime)}
            </span>
          )}
        </div>
      </div>

      {/* Speed */}
      <button
        onClick={cycleSpeed}
        className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {SPEEDS[speedIndex]}x
      </button>
    </div>
  );
}
