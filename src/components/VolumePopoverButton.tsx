import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { AccentTheme } from "@/lib/accentTheme";
import { usePlayerStore } from "@/state/playerStore";

type Props = {
  theme: AccentTheme;
  variant?: "transport" | "mini";
};

export function VolumePopoverButton({ theme, variant = "transport" }: Props) {
  const isMini = variant === "mini";
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});

  const updatePosition = useCallback(() => {
    const btn = btnRef.current;
    const pop = popRef.current;
    if (!btn) return;
    const br = btn.getBoundingClientRect();
    const ph = pop?.offsetHeight ?? 112;
    const pw = 200;
    const margin = 8;
    let top = br.top - margin;
    let transform = "translate(-50%, -100%)";
    if (top - ph < margin) {
      top = br.bottom + margin;
      transform = "translate(-50%, 0)";
    }
    const cx = br.left + br.width / 2;
    const left = Math.min(window.innerWidth - margin - pw / 2, Math.max(pw / 2 + margin, cx));
    setPanelStyle({
      position: "fixed",
      left,
      top,
      transform,
      zIndex: 140,
      width: pw
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const id = requestAnimationFrame(() => updatePosition());
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition, volume, muted]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open]);

  const root = typeof document !== "undefined" ? document.body : null;
  const pct = Math.round((muted ? 0 : volume) * 100);

  const triggerClass = isMini
    ? `shrink-0 inline-flex items-center justify-center rounded-full transition size-9 ${
        open ? "" : "text-zinc-200 hover:bg-white/10"
      }`
    : `size-10 inline-flex items-center justify-center rounded-full ${
        open ? "" : "text-zinc-400 hover:text-white"
      }`;

  const triggerStyle =
    open
      ? {
          backgroundColor: theme.ghostActiveBg,
          color: theme.ghostActiveText
        }
      : undefined;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label="Volume"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={triggerClass}
        style={triggerStyle}
      >
        {muted || volume === 0 ? <MuteIcon /> : <VolIcon />}
      </button>
      {open &&
        root &&
        createPortal(
          <div
            ref={popRef}
            className="rounded-2xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl p-4 shadow-2xl"
            style={panelStyle}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="text-zinc-400 hover:text-white shrink-0"
                onClick={() => toggleMute()}
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted || volume === 0 ? <MuteIcon /> : <VolIcon />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="flex-1 min-w-0 h-2 accent-transparent"
                style={{ accentColor: theme.fill }}
              />
              <span className="text-xs text-zinc-500 tabular-nums w-9 text-right">{pct}%</span>
            </div>
          </div>,
          root
        )}
    </>
  );
}

function VolIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" strokeLinejoin="round" />
      <path d="M16 9a5 5 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" strokeLinecap="round" />
    </svg>
  );
}

function MuteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" strokeLinejoin="round" />
      <path d="m22 9-6 6M16 9l6 6" strokeLinecap="round" />
    </svg>
  );
}
