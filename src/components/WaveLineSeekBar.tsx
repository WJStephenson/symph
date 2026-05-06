import { useId, memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getAudioElement } from "@/audio/audioRef";
import { usePlayerStore } from "@/state/playerStore";

const DEFAULT_BAR_HEIGHT = 16;
const WAVE_VIEW_HEIGHT = 12;

type Props = {
  onSeek: (sec: number) => void;
  accent?: string | null;
  height?: number;
};

function buildWavePath(
  width: number,
  waveTop: number,
  waveH: number,
  phase: number,
  amplitude: number
): string {
  const mid = waveTop + waveH * 0.5;
  if (width <= 0) return `M 0 ${mid} L 0 ${mid}`;
  if (amplitude <= 0.001) {
    const y = mid;
    return `M 0 ${y.toFixed(2)} L ${width.toFixed(2)} ${y.toFixed(2)}`;
  }
  const freq = (Math.PI * 2 * 2.05) / width;
  const n = Math.max(24, Math.min(140, Math.ceil(width / 2.5)));
  const y0 = mid + amplitude * Math.sin(phase);
  let d = `M 0 ${y0.toFixed(3)}`;
  for (let i = 1; i <= n; i++) {
    const x = (i / n) * width;
    const y = mid + amplitude * Math.sin(phase + x * freq);
    d += ` L ${x.toFixed(2)} ${y.toFixed(3)}`;
  }
  return d;
}

export const WaveLineSeekBar = memo(function WaveLineSeekBar({
  onSeek,
  accent,
  height: barHeight = DEFAULT_BAR_HEIGHT
}: Props) {
  const positionSec = usePlayerStore((s) => s.positionSec);
  const durationSec = usePlayerStore((s) => s.durationSec);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const wrapRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<SVGPathElement>(null);
  const playedRef = useRef<SVGPathElement>(null);
  const clipRectRef = useRef<SVGRectElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const [svgWidth, setSvgWidth] = useState(320);
  const [dragging, setDragging] = useState(false);
  const [local, setLocal] = useState(positionSec);
  const localRef = useRef(local);
  const phaseRef = useRef(0);
  const ampRef = useRef(0);
  const rafRef = useRef(0);

  const waveTop = Math.max(0, (barHeight - WAVE_VIEW_HEIGHT) * 0.5);
  const ampMax = Math.min(WAVE_VIEW_HEIGHT * 0.38, 5.5);

  useEffect(() => {
    if (!dragging) setLocal(positionSec);
  }, [positionSec, dragging]);

  useEffect(() => {
    localRef.current = local;
  }, [local]);

  const paintPaths = useCallback(
    (phase: number, amp: number) => {
      const w = svgWidth;
      const d = buildWavePath(w, waveTop, WAVE_VIEW_HEIGHT, phase, amp);
      baseRef.current?.setAttribute("d", d);
      playedRef.current?.setAttribute("d", d);
    },
    [svgWidth, waveTop]
  );

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => setSvgWidth(wrap.clientWidth || 320);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    paintPaths(phaseRef.current, ampRef.current);
    const dur = durationSec;
    const pos = localRef.current;
    const frac = dur > 0 ? Math.min(1, Math.max(0, pos / dur)) : 0;
    const cw = svgWidth * frac;
    clipRectRef.current?.setAttribute("width", String(Math.max(0, cw)));
    if (handleRef.current) handleRef.current.style.left = `${frac * 100}%`;
  }, [svgWidth, durationSec, paintPaths]);

  useEffect(() => {
    let last = performance.now();
    let mounted = true;
    const tick = (tFrame: number) => {
      if (!mounted) return;
      const dt = Math.min(0.05, (tFrame - last) / 1000);
      last = tFrame;
      const target = isPlaying ? ampMax : 0;
      const k = 1 - Math.exp(-dt * 11);
      ampRef.current += (target - ampRef.current) * k;
      if (isPlaying) {
        phaseRef.current += dt * 2.15;
      }
      paintPaths(phaseRef.current, ampRef.current);

      const dur = durationSec;
      let pos = localRef.current;
      if (!dragging && dur > 0) {
        const el = getAudioElement();
        if (el && !el.paused) pos = el.currentTime;
        else pos = localRef.current;
      }
      const frac = dur > 0 ? Math.min(1, Math.max(0, pos / dur)) : 0;
      const cw = svgWidth * frac;
      clipRectRef.current?.setAttribute("width", String(Math.max(0, cw)));
      if (handleRef.current) handleRef.current.style.left = `${frac * 100}%`;

      const settling = Math.abs(ampRef.current - target) > 0.008;
      if (isPlaying || settling || dragging) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, svgWidth, dragging, durationSec, ampMax, paintPaths]);

  useEffect(() => {
    if (isPlaying || dragging) return;
    const id = requestAnimationFrame(() => {
      paintPaths(phaseRef.current, ampRef.current);
      const dur = durationSec;
      const frac = dur > 0 ? Math.min(1, Math.max(0, local / dur)) : 0;
      const cw = svgWidth * frac;
      clipRectRef.current?.setAttribute("width", String(Math.max(0, cw)));
      if (handleRef.current) handleRef.current.style.left = `${frac * 100}%`;
    });
    return () => cancelAnimationFrame(id);
  }, [svgWidth, isPlaying, dragging, local, durationSec, paintPaths]);

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

  const playedFrac = durationSec > 0 ? Math.min(1, Math.max(0, local / durationSec)) : 0;
  const clipW = svgWidth * playedFrac;
  const uid = useId();
  const clipId = `symph-wave-${uid.replace(/:/g, "")}`;
  const strokeMuted = "rgba(255,255,255,0.22)";
  const strokeAccent = accent ?? "rgb(165,180,252)";

  return (
    <div
      ref={wrapRef}
      className="relative w-full rounded-2xl bg-black/40 touch-none select-none cursor-pointer overflow-visible"
      style={{ height: barHeight }}
      onPointerDown={(e) => {
        setDragging(true);
        setFromClientX(e.clientX);
        void getAudioElement()?.play();
      }}
    >
      <svg
        className="absolute inset-0 w-full"
        width="100%"
        height={barHeight}
        viewBox={`0 0 ${svgWidth} ${barHeight}`}
        preserveAspectRatio="none"
      >
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            <rect ref={clipRectRef} x={0} y={0} width={clipW} height={barHeight} />
          </clipPath>
        </defs>
        <path
          ref={baseRef}
          fill="none"
          stroke={strokeMuted}
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          ref={playedRef}
          fill="none"
          stroke={strokeAccent}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          clipPath={`url(#${clipId})`}
        />
      </svg>
      <div
        ref={handleRef}
        className="pointer-events-none absolute top-0 bottom-0 z-10 -translate-x-1/2 bg-white/95"
        style={{ left: `${playedFrac * 100}%`, width: 4, height: barHeight }}
        aria-hidden
      />
    </div>
  );
});
