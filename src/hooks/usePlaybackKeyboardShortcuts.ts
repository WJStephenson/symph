import { useEffect } from "react";
import { getAudioElement } from "@/audio/audioRef";
import { usePlayerStore } from "@/state/playerStore";

function shortcutTargetBlocksPlaybackKeys(): boolean {
  const el = document.activeElement;
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return false;
}

export function usePlaybackKeyboardShortcuts(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    const seekBy = (deltaSec: number) => {
      const el = getAudioElement();
      if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return;
      el.currentTime = Math.min(el.duration, Math.max(0, el.currentTime + deltaSec));
    };

    const togglePlayPause = () => {
      const el = getAudioElement();
      if (!el) return;
      if (el.paused) void el.play();
      else el.pause();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (shortcutTargetBlocksPlaybackKeys()) return;

      const key = e.key;

      if (key === " " || key === "k" || key === "K") {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        e.preventDefault();
        togglePlayPause();
        return;
      }

      if (key === "m" || key === "M") {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        e.preventDefault();
        usePlayerStore.getState().toggleMute();
        return;
      }

      if (key === "j" || key === "J") {
        if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
        e.preventDefault();
        seekBy(-10);
        return;
      }

      if (key === "l" || key === "L") {
        if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
        e.preventDefault();
        seekBy(10);
        return;
      }

      if (key === "ArrowLeft") {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        e.preventDefault();
        if (e.shiftKey) usePlayerStore.getState().prev();
        else seekBy(-5);
        return;
      }

      if (key === "ArrowRight") {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        e.preventDefault();
        if (e.shiftKey) usePlayerStore.getState().next();
        else seekBy(5);
        return;
      }

      if (key === "ArrowUp") {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        e.preventDefault();
        const { volume, setVolume } = usePlayerStore.getState();
        setVolume(volume + 0.05);
        return;
      }

      if (key === "ArrowDown") {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        e.preventDefault();
        const { volume, setVolume } = usePlayerStore.getState();
        setVolume(volume - 0.05);
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
