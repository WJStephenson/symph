import { memo, useCallback, useEffect, useRef, useState } from "react";
import { getAudioElement } from "@/audio/audioRef";
import { usePlayerStore } from "@/state/playerStore";

const DEFAULT_BAR_HEIGHT = 16;

type Props = {
  onSeek: (sec: number) => void;
  accent?: string | null;
  height?: number;
  minimal?: boolean;
};

export const WaveLineSeekBar = memo(function WaveLineSeekBar({
  onSeek,
  accent,
  height: barHeight = DEFAULT_BAR_HEIGHT,
  minimal = false
}: Props) {
  const positionSec = usePlayerStore((s) => s.positionSec);
  const durationSec = usePlayerStore((s) => s.durationSec);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [local, setLocal] = useState(positionSec);

  useEffect(() => {
    if (!dragging) setLocal(positionSec);
  }, [positionSec, dragging]);

  const dur = durationSec;
  const pos = dragging ? local : positionSec;
  const frac = dur > 0 ? Math.min(1, Math.max(0, pos / dur)) : 0;
  const strokeAccent = accent ?? "rgb(165,180,252)";

  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = wrapRef.current;
      const duration = durationSec;
      if (!el || duration <= 0) return;
      const rect = el.getBoundingClientRect();
      const x = Math.min(Math.max(0, clientX - rect.left), rect.width);
      const next = (x / rect.width) * duration;
      setLocal(next);
      onSeek(next);
    },
    [durationSec, onSeek]
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
      ref={wrapRef}
      className={
        minimal
          ? "relative w-full touch-none select-none cursor-pointer overflow-visible py-1.5"
          : "relative w-full rounded-2xl bg-black/40 touch-none select-none cursor-pointer overflow-visible"
      }
      style={minimal ? undefined : { height: barHeight }}
      onPointerDown={(e) => {
        setDragging(true);
        setFromClientX(e.clientX);
        void getAudioElement()?.play();
      }}
    >
      <div
        className={
          minimal
            ? "relative w-full flex items-center"
            : "absolute inset-x-2 inset-y-0 flex items-center"
        }
        style={minimal ? { height: barHeight } : undefined}
      >
        <div className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full overflow-hidden flex">
          <div className="h-full shrink-0 rounded-l-full" style={{ width: `${frac * 100}%`, backgroundColor: strokeAccent }} />
          <div className="h-full flex-1 bg-white rounded-r-full min-w-0" />
        </div>
        <div
          className="pointer-events-none absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-white shadow-sm"
          style={{ left: `${frac * 100}%`, width: 4, height: Math.min(14, barHeight + 4) }}
          aria-hidden
        />
      </div>
    </div>
  );
});
