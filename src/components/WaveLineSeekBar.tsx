import { useId, memo, useCallback, useEffect, useRef, useState } from "react";
import { getAudioElement } from "@/audio/audioRef";
import { usePlayerStore } from "@/state/playerStore";

const DEFAULT_HEIGHT = 32;

type Props = {
  onSeek: (sec: number) => void;
  accent?: string | null;
  height?: number;
};

function yOnWave(
  x: number,
  width: number,
  height: number,
  phase: number,
  amplitude: number
): number {
  const mid = height * 0.5;
  if (width <= 0 || amplitude <= 0) return mid;
  const freq = (Math.PI * 2 * 2.05) / width;
  return mid + amplitude * Math.sin(phase + x * freq);
}

function buildWavePath(width: number, height: number, phase: number, amplitude: number): string {
  const mid = height * 0.5;
  if (width <= 0) return `M 0 ${mid} L 0 ${mid}`;
  if (amplitude <= 0.001) {
    const y = mid;
    return `M 0 ${y.toFixed(2)} L ${width.toFixed(2)} ${y.toFixed(2)}`;
  }
  const n = Math.max(24, Math.min(140, Math.ceil(width / 2.5)));
  const y0 = yOnWave(0, width, height, phase, amplitude);
  let d = `M 0 ${y0.toFixed(3)}`;
  for (let i = 1; i <= n; i++) {
    const x = (i / n) * width;
    const y = yOnWave(x, width, height, phase, amplitude);
    d += ` L ${x.toFixed(2)} ${y.toFixed(3)}`;
  }
  return d;
}

export const WaveLineSeekBar = memo(function WaveLineSeekBar({
  onSeek,
  accent,
  height = DEFAULT_HEIGHT
}: Props) {
  const positionSec = usePlayerStore((s) => s.positionSec);
  const durationSec = usePlayerStore((s) => s.durationSec);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const wrapRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<SVGPathElement>(null);
  const playedRef = useRef<SVGPathElement>(null);
  const [svgWidth, setSvgWidth] = useState(320);
  const [pathD, setPathD] = useState("");
  const [dragging, setDragging] = useState(false);
  const [local, setLocal] = useState(positionSec);
  const phaseRef = useRef(0);
  const ampRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!dragging) setLocal(positionSec);
  }, [positionSec, dragging]);

  const ampMax = Math.min(height * 0.38, 11);

  const paintBoth = useCallback(
    (phase: number, amp: number) => {
      const w = svgWidth;
      const h = height;
      const d = buildWavePath(w, h, phase, amp);
      setPathD(d);
      baseRef.current?.setAttribute("d", d);
      playedRef.current?.setAttribute("d", d);
    },
    [svgWidth, height]
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

  useEffect(() => {
    let last = performance.now();
    let mounted = true;
    const tick = (t: number) => {
      if (!mounted) return;
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const target = isPlaying ? ampMax : 0;
      const k = 1 - Math.exp(-dt * 11);
      ampRef.current += (target - ampRef.current) * k;
      if (isPlaying) {
        phaseRef.current += dt * 2.15;
      }
      paintBoth(phaseRef.current, ampRef.current);
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
  }, [isPlaying, svgWidth, height, ampMax, paintBoth, dragging]);

  useEffect(() => {
    if (isPlaying || dragging) return;
    const id = requestAnimationFrame(() => paintBoth(phaseRef.current, ampRef.current));
    return () => cancelAnimationFrame(id);
  }, [svgWidth, isPlaying, dragging, paintBoth]);

  const playedFrac = durationSec > 0 ? Math.min(1, Math.max(0, local / durationSec)) : 0;
  const clipW = svgWidth * playedFrac;
  const uid = useId();
  const clipId = `symph-wave-${uid.replace(/:/g, "")}`;

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

  const strokeMuted = "rgba(255,255,255,0.22)";
  const strokeAccent = accent ?? "rgb(165,180,252)";
  const handleLeftPct = playedFrac * 100;

  return (
    <div
      ref={wrapRef}
      className="relative w-full rounded-2xl bg-black/40 touch-none select-none cursor-pointer overflow-visible"
      style={{ height }}
      onPointerDown={(e) => {
        setDragging(true);
        setFromClientX(e.clientX);
        void getAudioElement()?.play();
      }}
    >
      <svg
        className="absolute inset-0 w-full"
        width="100%"
        height={height}
        viewBox={`0 0 ${svgWidth} ${height}`}
        preserveAspectRatio="none"
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={clipW} height={height} />
          </clipPath>
        </defs>
        <path
          ref={baseRef}
          d={pathD}
          fill="none"
          stroke={strokeMuted}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          ref={playedRef}
          d={pathD}
          fill="none"
          stroke={strokeAccent}
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          clipPath={`url(#${clipId})`}
        />
      </svg>
      <div
        className="pointer-events-none absolute top-1/2 z-10 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-white/95 shadow-md"
        style={{ left: `${handleLeftPct}%` }}
        aria-hidden
      />
    </div>
  );
});
