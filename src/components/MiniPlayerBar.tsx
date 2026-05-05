import type { ReactNode } from "react";
import { usePlayerStore } from "@/state/playerStore";
import { useServerStore } from "@/state/serverStore";
import { ArtworkImage } from "./ArtworkImage";
import { getAudioElement } from "@/audio/PlaybackEngine";

type Props = {
  onExpand: () => void;
  className?: string;
};

export function MiniPlayerBar({ onExpand, className }: Props) {
  const session = useServerStore((s) => s.session);
  const queue = usePlayerStore((s) => s.queue);
  const index = usePlayerStore((s) => s.index);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const positionSec = usePlayerStore((s) => s.positionSec);
  const durationSec = usePlayerStore((s) => s.durationSec);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const track = queue[index];

  if (!session || !track) return null;

  const pct = durationSec > 0 ? Math.min(100, (positionSec / durationSec) * 100) : 0;

  return (
    <div className={className}>
      <div className="max-w-6xl mx-auto">
        <div className="glass rounded-2xl shadow-glow shadow-indigo-500/20 overflow-hidden">
          <div className="h-[3px] bg-white/10">
            <div className="h-full bg-indigo-400/90" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center gap-3 p-2.5">
            <button
              type="button"
              onClick={onExpand}
              className="flex items-center gap-3 min-w-0 flex-1 text-left"
            >
              <div className="size-12 shrink-0 rounded-xl overflow-hidden border border-white/10">
                <ArtworkImage
                  session={session}
                  itemId={track.albumId ?? track.id}
                  className="size-full object-cover"
                  alt=""
                  maxWidth={160}
                />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-white truncate">{track.title}</div>
                <div className="text-xs text-zinc-400 truncate">{track.artist}</div>
              </div>
            </button>
            <div className="flex items-center gap-1 shrink-0">
              <IconButton label="Previous" onClick={() => prev()}>
                <PrevIcon />
              </IconButton>
              <IconButton
                label={isPlaying ? "Pause" : "Play"}
                onClick={() => {
                  const el = getAudioElement();
                  if (!el) return;
                  if (el.paused) void el.play();
                  else el.pause();
                }}
                primary
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </IconButton>
              <IconButton label="Next" onClick={() => next()}>
                <NextIcon />
              </IconButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  label,
  primary
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`inline-flex items-center justify-center rounded-full transition ${
        primary
          ? "size-11 bg-white text-zinc-900 shadow-lg"
          : "size-9 text-zinc-200 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function PlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 5h4v14H6V5Zm8 0h4v14h-4V5Z" />
    </svg>
  );
}

function PrevIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6h2v12H6V6Zm3.5 6 8.5 6V6l-8.5 6Z" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 18h2V6h-2v12ZM6 18l8.5-6L6 6v12Z" />
    </svg>
  );
}
