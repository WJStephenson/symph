import { useEffect, useRef } from "react";
import { getAudioElement } from "./PlaybackEngine";
import { attachAnalyserToMediaElement } from "./analyserBridge";

type Props = {
  accent: string | null;
  height?: number;
};

export function WaveformBar({ accent, height = 96 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const tryConnect = () => {
      const el = getAudioElement();
      if (!el || analyserRef.current) return;
      attachAnalyserToMediaElement(el, (analyser, actx) => {
        analyserRef.current = analyser;
        audioCtxRef.current = actx;
        dataRef.current = new Uint8Array(analyser.frequencyBinCount);
      });
    };

    const draw = () => {
      raf.current = requestAnimationFrame(draw);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      const c1 = accent ?? "rgb(129,140,248)";
      grad.addColorStop(0, "rgba(255,255,255,0.06)");
      grad.addColorStop(0.5, c1);
      grad.addColorStop(1, "rgba(255,255,255,0.06)");
      ctx.fillStyle = grad;

      tryConnect();
      const analyser = analyserRef.current;
      const data = dataRef.current;
      const audioCtx = audioCtxRef.current;

      if (!analyser || !data) {
        const bars = 48;
        const t = performance.now() / 1000;
        for (let i = 0; i < bars; i++) {
          const x = (i / bars) * w;
          const bw = w / bars - 2;
          const idle = (Math.sin(t * 1.6 + i * 0.35) * 0.5 + 0.5) * h * 0.22 + 6;
          ctx.fillRect(x + 1, h - idle, Math.max(2, bw), idle);
        }
        return;
      }

      if (audioCtx?.state === "suspended") {
        void audioCtx.resume();
      }

      analyser.getByteFrequencyData(data);
      const bars = 56;
      const step = Math.max(1, Math.floor(data.length / bars));
      for (let i = 0; i < bars; i++) {
        let v = 0;
        for (let j = 0; j < step; j++) {
          v += data[i * step + j] ?? 0;
        }
        v = v / step / 255;
        const x = (i / bars) * w;
        const bw = w / bars - 2;
        const amp = Math.pow(v, 0.65) * h * 0.92 + 4;
        ctx.fillRect(x + 1, h - amp, Math.max(2, bw), amp);
      }
    };

    raf.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf.current);
      ro.disconnect();
    };
  }, [accent]);

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-white/10 bg-black/30">
      <canvas ref={canvasRef} className="w-full block" style={{ height }} />
    </div>
  );
}
