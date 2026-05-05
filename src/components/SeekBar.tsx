import { useCallback, useEffect, useRef, useState } from "react";
import { getAudioElement } from "@/audio/audioRef";

type Props = {
  duration: number;
  position: number;
  onSeek: (sec: number) => void;
};

export function SeekBar({ duration, position, onSeek }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [local, setLocal] = useState(position);

  useEffect(() => {
    if (!dragging) setLocal(position);
  }, [position, dragging]);

  const pct = duration > 0 ? Math.min(100, (local / duration) * 100) : 0;

  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = barRef.current;
      if (!el || duration <= 0) return;
      const rect = el.getBoundingClientRect();
      const x = Math.min(Math.max(0, clientX - rect.left), rect.width);
      const next = (x / rect.width) * duration;
      setLocal(next);
      onSeek(next);
    },
    [duration, onSeek]
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => setFromClientX(e.clientX);
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, setFromClientX]);

  return (
    <div
      ref={barRef}
      className="relative h-3 flex items-center cursor-pointer touch-none select-none"
      onPointerDown={(e) => {
        setDragging(true);
        setFromClientX(e.clientX);
        void getAudioElement()?.play();
      }}
    >
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-white/10" />
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-white/80"
        style={{ width: `${pct}%` }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 size-3 rounded-full bg-white shadow-lg border border-black/20"
        style={{ left: `calc(${pct}% - 6px)` }}
      />
    </div>
  );
}
