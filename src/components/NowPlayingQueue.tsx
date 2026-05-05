import { memo, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { getAudioElement } from "@/audio/audioRef";
import { ArtworkImage } from "@/components/ArtworkImage";
import { WaveLineSeekBar } from "@/components/WaveLineSeekBar";
import { formatDuration, queueCoverItem } from "@/lib/format";
import type { QueueTrack } from "@/state/playerStore";
import { usePlayerStore } from "@/state/playerStore";
import type { JellyfinSession } from "@/jellyfin/types";

type Props = {
  session: JellyfinSession;
  queue: QueueTrack[];
  activeIndex: number;
};

export const VirtualizedQueue = memo(function VirtualizedQueue({
  session,
  queue,
  activeIndex
}: Props) {
  const playIndex = usePlayerStore((s) => s.playIndex);
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: queue.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 8
  });

  useEffect(() => {
    const len = queue.length;
    if (!len) return;
    const i = Math.min(Math.max(0, activeIndex), len - 1);
    rowVirtualizer.scrollToIndex(i, { align: "auto" });
  }, [activeIndex, queue.length, rowVirtualizer]);

  return (
    <section className="flex-1 min-h-0 flex flex-col min-w-0 bg-black/20">
      <div className="shrink-0 px-4 py-3 border-b border-white/10">
        <h2 className="text-sm font-medium text-white">Queue</h2>
        <p className="text-xs text-zinc-500 mt-0.5">{queue.length} tracks</p>
      </div>
      <div ref={parentRef} className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin contain-strict">
        <div
          className="relative w-full"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {rowVirtualizer.getVirtualItems().map((vi) => {
            const q = queue[vi.index];
            if (!q) return null;
            const isActive = vi.index === activeIndex;
            return (
              <div
                key={q.id}
                className="absolute left-0 right-0 px-4"
                style={{ transform: `translateY(${vi.start}px)` }}
              >
                <button
                  type="button"
                  onClick={() => playIndex(vi.index)}
                  className={`w-full flex items-center gap-3 p-2 text-left rounded-xl transition-colors ${
                    isActive ? "bg-white/[0.07]" : "hover:bg-white/5"
                  }`}
                >
                  <div className="text-xs text-zinc-500 w-7 tabular-nums shrink-0">{vi.index + 1}</div>
                  <div className="size-10 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-zinc-800">
                    <ArtworkImage
                      session={session}
                      itemId={q.albumId ?? q.id}
                      item={queueCoverItem(q)}
                      className="size-full object-cover"
                      alt=""
                      maxWidth={96}
                      skipColourAnalysis
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white truncate">{q.title}</div>
                    <div className="text-xs text-zinc-500 truncate">{q.artist}</div>
                  </div>
                  {q.durationTicks !== undefined && (
                    <div className="text-xs text-zinc-500 tabular-nums shrink-0">
                      {formatDuration(q.durationTicks / 10_000_000)}
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});

type LeftProps = {
  session: JellyfinSession;
  track: QueueTrack;
};

export const PlayerLeftColumn = memo(function PlayerLeftColumn({ session, track }: LeftProps) {
  const accent = usePlayerStore((s) => s.accent);
  const positionSec = usePlayerStore((s) => s.positionSec);
  const durationSec = usePlayerStore((s) => s.durationSec);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleMute = usePlayerStore((s) => s.toggleMute);

  const onSeek = useCallback((sec: number) => {
    const el = getAudioElement();
    if (!el) return;
    el.currentTime = sec;
  }, []);

  return (
    <aside className="shrink-0 lg:w-[min(100%,420px)] xl:w-[440px] lg:max-w-[42vw] border-b lg:border-b-0 lg:border-r border-white/10 overflow-y-auto no-scrollbar">
      <div className="p-5 lg:p-8 space-y-5 max-w-md mx-auto lg:mx-0 lg:max-w-none">
        <div className="relative mx-auto w-full max-w-[280px] lg:max-w-none aspect-square rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-white/10">
          <div
            className="absolute inset-0 opacity-35 blur-3xl scale-110"
            style={{
              background: accent ?? "radial-gradient(circle at 30% 20%, #6366f1, transparent)"
            }}
          />
          <ArtworkImage
            session={session}
            itemId={track.albumId ?? track.id}
            item={queueCoverItem(track)}
            className="relative z-10 w-full h-full object-cover"
            alt=""
            maxWidth={900}
            priority
            skipColourAnalysis
          />
        </div>
        <div>
          <h1 className="font-display text-2xl lg:text-3xl text-white leading-tight">{track.title}</h1>
          <p className="text-zinc-400 mt-1">{track.artist}</p>
          {track.albumTitle && <p className="text-sm text-zinc-500 mt-1">{track.albumTitle}</p>}
        </div>
        <WaveLineSeekBar onSeek={onSeek} accent={accent} height={96} />
        <div className="flex justify-between text-xs text-zinc-500">
          <span>{formatDuration(positionSec)}</span>
          <span>{formatDuration(durationSec)}</span>
        </div>
        <div className="flex items-center justify-center gap-5 lg:gap-6 pt-1">
          <GhostIconButton active={shuffle} label="Shuffle" onClick={() => toggleShuffle()}>
            <ShuffleIcon />
          </GhostIconButton>
          <IconCircle label="Previous" onClick={() => prev()}>
            <PrevIcon />
          </IconCircle>
          <IconCircle
            large
            label={isPlaying ? "Pause" : "Play"}
            onClick={() => {
              const el = getAudioElement();
              if (!el) return;
              if (el.paused) void el.play();
              else el.pause();
            }}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </IconCircle>
          <IconCircle label="Next" onClick={() => next()}>
            <NextIcon />
          </IconCircle>
          <GhostIconButton active={repeat !== "off"} label="Repeat" onClick={() => cycleRepeat()}>
            <RepeatIcon mode={repeat} />
          </GhostIconButton>
        </div>
        <div className="flex items-center gap-3 pt-1 pb-2 lg:pb-0">
          <button
            type="button"
            className="text-zinc-400 hover:text-white shrink-0"
            onClick={() => toggleMute()}
            aria-label="Mute"
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
            className="flex-1 accent-indigo-400 min-w-0"
          />
        </div>
      </div>
    </aside>
  );
});

function IconCircle({
  children,
  onClick,
  label,
  large
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  large?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white ${
        large ? "size-16" : "size-12"
      }`}
    >
      {children}
    </button>
  );
}

function GhostIconButton({
  children,
  onClick,
  label,
  active
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`size-10 inline-flex items-center justify-center rounded-full ${
        active ? "text-indigo-300 bg-indigo-500/15" : "text-zinc-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function PlayIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 5h4v14H6V5Zm8 0h4v14h-4V5Z" />
    </svg>
  );
}

function PrevIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6h2v12H6V6Zm3.5 6 8.5 6V6l-8.5 6Z" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 18h2V6h-2v12ZM6 18l8.5-6L6 6v12Z" />
    </svg>
  );
}

function ShuffleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path
        d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RepeatIcon({ mode }: { mode: "off" | "all" | "one" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M17 1l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" strokeLinecap="round" strokeLinejoin="round" />
      {mode === "one" && (
        <text x="9" y="16" fontSize="8" fill="currentColor" stroke="none">
          1
        </text>
      )}
    </svg>
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
