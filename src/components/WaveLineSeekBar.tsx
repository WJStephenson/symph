import { useId, memo, useCallback, useEffect, useRef, useState } from "react";
import { getAudioElement } from "@/audio/audioRef";
import { usePlayerStore } from "@/state/playerStore";

type Props = {
  onSeek: (sec: number) => void;
  accent?: string | null;
  height?: number;
};

function buildWavePath(width: number, height: number, phase: number, amplitude: number): string {
  const mid = height * 0.5;
  const segments = Math.max(28, Math.min(96, Math.floor(width / 12)));
  const dx = width / segments;
  let d = `M 0 ${mid.toFixed(2)}`;
  const freq = (Math.PI * 2 * 2.1) / Math.max(width, 1);
  for (let i = 1; i <= segments; i++) {
    const x = i * dx;
    const y = mid + amplitude * Math.sin(phase + x * freq);
    d += ` L ${x.toFixed(1)} ${y.toFixed(2)}`;
  }
  return d;
}

export const WaveLineSeekBar = memo(function WaveLineSeekBar({
  onSeek,
  accent,
  height = 88
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
  const rafRef = useRef(0);

  useEffect(() => {
    if (!dragging) setLocal(positionSec);
  }, [positionSec, dragging]);

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
    if (!isPlaying) {
      cancelAnimationFrame(rafRef.current);
      paintBoth(phaseRef.current, 0);
      return;
    }
    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      phaseRef.current += dt * 2.35;
      const amp = Math.min(height * 0.22, 22);
      paintBoth(phaseRef.current, amp);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, svgWidth, height, paintBoth]);

  useEffect(() => {
    if (isPlaying) return;
    paintBoth(phaseRef.current, 0);
  }, [svgWidth, isPlaying, paintBoth]);

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

  return (
    <div
      ref={wrapRef}
      className="relative w-full rounded-2xl bg-black/40 touch-none select-none cursor-pointer overflow-hidden"
      style={{ height }}
      onPointerDown={(e) => {
        setDragging(true);
        setFromClientX(e.clientX);
        void getAudioElement()?.play();
      }}
    >
      <svg
        className="block w-full"
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
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          ref={playedRef}
          d={pathD}
          fill="none"
          stroke={strokeAccent}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          clipPath={`url(#${clipId})`}
        />
      </svg>
    </div>
  );
});
