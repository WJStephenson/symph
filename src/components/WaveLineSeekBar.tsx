import { useId, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAudioElement } from "@/audio/audioRef";
import { usePlayerStore } from "@/state/playerStore";

const DEFAULT_HEIGHT = 16;
const PATTERN_W = 72;

function buildTiledSinePath(totalW: number, height: number): string {
  const mid = height * 0.5;
  if (totalW <= 0) return `M 0 ${mid} L 0 ${mid}`;
  const k = (Math.PI * 2) / PATTERN_W;
  const amp = Math.min(height * 0.42, 6.5);
  const step = 2;
  const y0 = mid + amp * Math.sin(0);
  let d = `M 0 ${y0.toFixed(3)}`;
  for (let x = step; x <= totalW; x += step) {
    const y = mid + amp * Math.sin(k * x);
    d += ` L ${x.toFixed(1)} ${y.toFixed(3)}`;
  }
  return d;
}

type Props = {
  onSeek: (sec: number) => void;
  accent?: string | null;
  height?: number;
};

export const WaveLineSeekBar = memo(function WaveLineSeekBar({
  onSeek,
  accent,
  height = DEFAULT_HEIGHT
}: Props) {
  const positionSec = usePlayerStore((s) => s.positionSec);
  const durationSec = usePlayerStore((s) => s.durationSec);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const wrapRef = useRef<HTMLDivElement>(null);
  const baseWaveRef = useRef<SVGGElement>(null);
  const playedWaveRef = useRef<SVGGElement>(null);
  const clipRectRef = useRef<SVGRectElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const [svgWidth, setSvgWidth] = useState(320);
  const [dragging, setDragging] = useState(false);
  const [local, setLocal] = useState(positionSec);
  const scrollRef = useRef(0);
  const ampRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!dragging) setLocal(positionSec);
  }, [positionSec, dragging]);

  const ampMax = 1;

  const pathD = useMemo(() => {
    const w = svgWidth;
    const extra = PATTERN_W * 4;
    const totalW = Math.max(w + extra, PATTERN_W * 6);
    return buildTiledSinePath(totalW, height);
  }, [svgWidth, height]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => setSvgWidth(wrap.clientWidth || 320);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

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

  const paintClipAndHandle = useCallback(
    (frac: number) => {
      const cw = svgWidth * frac;
      clipRectRef.current?.setAttribute("width", String(Math.max(0, cw)));
      if (handleRef.current) handleRef.current.style.left = `${frac * 100}%`;
    },
    [svgWidth]
  );

  useEffect(() => {
    const mid = height * 0.5;
    let last = performance.now();
    let mounted = true;
    const waveTransform = (tx: number, sy: number) => {
      const t = `translate(0 ${mid}) scale(1 ${sy}) translate(0 ${-mid}) translate(${tx.toFixed(2)} 0)`;
      baseWaveRef.current?.setAttribute("transform", t);
      playedWaveRef.current?.setAttribute("transform", t);
    };
    const tick = (tFrame: number) => {
      if (!mounted) return;
      const dt = Math.min(0.05, (tFrame - last) / 1000);
      last = tFrame;
      const targetAmp = isPlaying ? ampMax : 0;
      const k = 1 - Math.exp(-dt * 11);
      ampRef.current += (targetAmp - ampRef.current) * k;
      if (isPlaying) {
        scrollRef.current += dt * 28;
        if (scrollRef.current > 1e6) scrollRef.current %= PATTERN_W;
      }
      const sy = Math.max(0.04, ampRef.current);
      const tx = -(scrollRef.current % PATTERN_W);
      waveTransform(tx, sy);

      const dur = durationSec;
      let pos = local;
      if (!dragging && dur > 0) {
        const el = getAudioElement();
        if (el && !el.paused) pos = el.currentTime;
        else pos = local;
      }
      const frac = dur > 0 ? Math.min(1, Math.max(0, pos / dur)) : 0;
      paintClipAndHandle(frac);

      const settling = Math.abs(ampRef.current - targetAmp) > 0.006;
      if (isPlaying || settling || dragging) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, height, dragging, local, durationSec, paintClipAndHandle]);

  useEffect(() => {
    if (isPlaying || dragging) return;
    const dur = durationSec;
    const frac = dur > 0 ? Math.min(1, Math.max(0, local / dur)) : 0;
    paintClipAndHandle(frac);
    const mid = height * 0.5;
    const sy = Math.max(0.04, ampRef.current);
    const tx = -(scrollRef.current % PATTERN_W);
    const t = `translate(0 ${mid}) scale(1 ${sy}) translate(0 ${-mid}) translate(${tx.toFixed(2)} 0)`;
    baseWaveRef.current?.setAttribute("transform", t);
    playedWaveRef.current?.setAttribute("transform", t);
  }, [svgWidth, isPlaying, dragging, local, durationSec, height, paintClipAndHandle]);

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
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            <rect ref={clipRectRef} x={0} y={0} width={clipW} height={height} />
          </clipPath>
        </defs>
        <g ref={baseWaveRef}>
          <path
            d={pathD}
            fill="none"
            stroke={strokeMuted}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <g clipPath={`url(#${clipId})`}>
          <g ref={playedWaveRef}>
            <path
              d={pathD}
              fill="none"
              stroke={strokeAccent}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </g>
      </svg>
      <div
        ref={handleRef}
        className="pointer-events-none absolute top-0 bottom-0 z-10 -translate-x-1/2 bg-white/95"
        style={{ left: `${playedFrac * 100}%`, width: 4 }}
        aria-hidden
      />
    </div>
  );
});
