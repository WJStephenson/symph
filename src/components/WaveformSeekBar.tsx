import { memo, useCallback, useEffect, useRef, useState } from "react";
import { getAudioElement } from "@/audio/PlaybackEngine";
import { usePlayerStore } from "@/state/playerStore";

type Props = {
  peaks: number[] | null;
  onSeek: (sec: number) => void;
  accent?: string | null;
  height?: number;
};

export const WaveformSeekBar = memo(function WaveformSeekBar({
  peaks,
  onSeek,
  accent,
  height = 88
}: Props) {
  const positionSec = usePlayerStore((s) => s.positionSec);
  const durationSec = usePlayerStore((s) => s.durationSec);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState(false);
  const [local, setLocal] = useState(positionSec);
  const lastPaintPos = useRef(-999);
  const rafPaint = useRef(0);

  useEffect(() => {
    if (!dragging) setLocal(positionSec);
  }, [positionSec, dragging]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = wrap.clientWidth;
    const h = height;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const bars = peaks?.length ? peaks.length : Math.min(200, Math.max(48, Math.floor(w / 3)));
    const data =
      peaks ??
      Array.from({ length: bars }, (_, i) => {
        const t = i / bars;
        return 0.2 + 0.5 * (0.5 + 0.5 * Math.sin(t * Math.PI * 5));
      });
    const duration = durationSec;
    const played = duration > 0 ? Math.min(1, local / duration) : 0;
    const mid = h * 0.5;
    const maxAmp = h * 0.38;
    const playedIdx = played * data.length;
    const cPlayed = accent ?? "rgb(165,180,252)";
    const cRest = "rgba(255,255,255,0.14)";
    const gap = Math.max(1, w / data.length - 1.5);
    const bw = Math.max(1.5, w / data.length - gap);
    for (let i = 0; i < data.length; i++) {
      const x = (i / data.length) * w + gap * 0.5;
      const amp = data[i] * maxAmp;
      const isPlayed = i < playedIdx - 0.001;
      ctx.fillStyle = isPlayed ? cPlayed : cRest;
      ctx.fillRect(x, mid - amp, bw, amp * 2);
    }
    const px = played * w;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.arc(px, mid, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [peaks, durationSec, local, accent, height]);

  useEffect(() => {
    if (dragging) {
      draw();
      return;
    }
    if (Math.abs(local - lastPaintPos.current) < 0.12) return;
    lastPaintPos.current = local;
    cancelAnimationFrame(rafPaint.current);
    rafPaint.current = requestAnimationFrame(() => draw());
    return () => cancelAnimationFrame(rafPaint.current);
  }, [draw, dragging, local]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafPaint.current);
      rafPaint.current = requestAnimationFrame(() => draw());
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [draw]);

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
      className="relative w-full rounded-2xl border border-white/10 bg-black/40 touch-none select-none cursor-pointer overflow-hidden"
      onPointerDown={(e) => {
        setDragging(true);
        setFromClientX(e.clientX);
        void getAudioElement()?.play();
      }}
    >
      <canvas ref={canvasRef} className="w-full block" style={{ height }} />
    </div>
  );
});
