import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { getAudioElement } from "@/audio/audioRef";
import { AddToPlaylistButton } from "@/components/AddToPlaylistModal";
import { ArtworkImage } from "@/components/ArtworkImage";
import { VolumePopoverButton } from "@/components/VolumePopoverButton";
import { WaveLineSeekBar } from "@/components/WaveLineSeekBar";
import { accentTheme } from "@/lib/accentTheme";
import { formatDuration, queueCoverItem } from "@/lib/format";
import type { QueueTrack } from "@/state/playerStore";
import { usePlayerStore } from "@/state/playerStore";
import type { JellyfinSession } from "@/jellyfin/types";

type Props = {
  session: JellyfinSession;
  queue: QueueTrack[];
  activeIndex: number;
  dense?: boolean;
  hideHeader?: boolean;
};

export const PlayerHeroArtwork = memo(function PlayerHeroArtwork({
  session,
  track,
  morphTransition,
  layout
}: {
  session: JellyfinSession;
  track: QueueTrack;
  morphTransition?: boolean;
  layout: "dock" | "sidebar";
}) {
  const accent = usePlayerStore((s) => s.accent);
  const dock = layout === "dock";
  return (
    <div
      className={`relative mx-auto w-full overflow-hidden shadow-2xl ring-1 ring-white/10 ${
        dock
          ? "max-w-[min(100%,320px)] aspect-square rounded-3xl"
          : "max-w-[280px] lg:max-w-none aspect-square rounded-[2rem]"
      }`}
      style={morphTransition ? { viewTransitionName: "symph-artwork" } : undefined}
    >
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
        maxWidth={dock ? 640 : 900}
        skipColourAnalysis
      />
    </div>
  );
});

export const VirtualizedQueue = memo(function VirtualizedQueue({
  session,
  queue,
  activeIndex,
  dense,
  hideHeader
}: Props) {
  const playIndex = usePlayerStore((s) => s.playIndex);
  const accent = usePlayerStore((s) => s.accent);
  const theme = useMemo(() => accentTheme(accent), [accent]);
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: queue.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 8
  });

  useEffect(() => {
    const len = queue.length;
    if (!len) return;
    const i = Math.min(Math.max(0, activeIndex), len - 1);
    rowVirtualizer.scrollToIndex(i, { align: "auto" });
  }, [activeIndex, queue.length, rowVirtualizer]);

  return (
    <section
      className={`flex-1 min-h-0 flex flex-col min-w-0 ${dense ? "bg-transparent" : "bg-black/20"}`}
    >
      {!hideHeader ? (
        <div
          className={`shrink-0 border-b border-white/10 flex items-center justify-between gap-2 ${
            dense ? "px-3 py-2" : "px-4 py-3"
          }`}
        >
          <div>
            <h2 className="text-sm font-medium text-white">Queue</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{queue.length} tracks</p>
          </div>
          {queue.length > 0 && (
            <AddToPlaylistButton
              session={session}
              trackIds={queue.map((q) => q.id)}
              className="rounded-lg px-2.5 py-1.5"
            />
          )}
        </div>
      ) : null}
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
                <div
                  className={`flex items-stretch gap-1 rounded-xl border ${
                    isActive ? "bg-white/[0.07]" : "border-transparent hover:bg-white/5"
                  }`}
                  style={isActive ? { borderColor: theme.fill } : undefined}
                >
                  <button
                    type="button"
                    onClick={() => playIndex(vi.index)}
                    className={`flex flex-1 min-w-0 items-center text-left ${
                      dense ? "gap-2 p-1.5" : "gap-3 p-2"
                    }`}
                  >
                    <div className="text-xs text-zinc-500 w-7 tabular-nums shrink-0">{vi.index + 1}</div>
                    <div
                      className={`rounded-lg overflow-hidden border border-white/10 shrink-0 bg-zinc-800 ${
                        dense ? "size-9" : "size-10"
                      }`}
                    >
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
                  <div className="flex items-center pr-1 shrink-0">
                    <AddToPlaylistButton session={session} trackIds={[q.id]} variant="icon" />
                  </div>
                </div>
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
  morphTransition?: boolean;
  variant?: "default" | "dockExpanded";
  hideArtwork?: boolean;
};

export const PlayerLeftColumn = memo(function PlayerLeftColumn({
  session,
  track,
  morphTransition,
  variant = "default",
  hideArtwork
}: LeftProps) {
  const accent = usePlayerStore((s) => s.accent);
  const theme = useMemo(() => accentTheme(accent), [accent]);
  const positionSec = usePlayerStore((s) => s.positionSec);
  const durationSec = usePlayerStore((s) => s.durationSec);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);

  const onSeek = useCallback((sec: number) => {
    const el = getAudioElement();
    if (!el) return;
    el.currentTime = sec;
  }, []);

  const isDock = variant === "dockExpanded";
  const shell = (
    <div className={isDock ? "space-y-3 md:space-y-4 w-full" : "p-5 lg:p-8 space-y-5 max-w-md mx-auto lg:mx-0 lg:max-w-none"}>
      {!hideArtwork ? (
        <PlayerHeroArtwork
          session={session}
          track={track}
          morphTransition={morphTransition}
          layout={isDock ? "dock" : "sidebar"}
        />
      ) : null}
      <div>
        <h1
          className={`font-display text-white leading-tight ${
            isDock ? "text-xl md:text-2xl" : "text-2xl lg:text-3xl"
          }`}
        >
          {track.title}
        </h1>
        <p className="text-zinc-400 mt-1">{track.artist}</p>
        {track.albumTitle && (
          <p className={`text-zinc-500 mt-1 ${isDock ? "text-xs" : "text-sm"}`}>{track.albumTitle}</p>
        )}
      </div>
      {!isDock ? <WaveLineSeekBar onSeek={onSeek} accent={accent} /> : null}
      <div className="flex justify-between text-xs text-zinc-500">
        <span>{formatDuration(positionSec)}</span>
        <span>{formatDuration(durationSec)}</span>
      </div>
      {!isDock ? (
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 lg:gap-6 pt-1 pb-2 lg:pb-0">
          <GhostIconButton
            active={shuffle}
            label="Shuffle"
            theme={theme}
            morphTransition={morphTransition}
            transitionName="symph-control-shuffle"
            onClick={() => toggleShuffle()}
          >
            <ShuffleIcon />
          </GhostIconButton>
          <IconCircle
            label="Previous"
            morphTransition={morphTransition}
            transitionName="symph-control-prev"
            onClick={() => prev()}
          >
            <PrevIcon />
          </IconCircle>
          <IconCircle
            large
            label={isPlaying ? "Pause" : "Play"}
            morphTransition={morphTransition}
            transitionName="symph-control-play"
            onClick={() => {
              const el = getAudioElement();
              if (!el) return;
              if (el.paused) void el.play();
              else el.pause();
            }}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </IconCircle>
          <IconCircle
            label="Next"
            morphTransition={morphTransition}
            transitionName="symph-control-next"
            onClick={() => next()}
          >
            <NextIcon />
          </IconCircle>
          <GhostIconButton
            active={repeat !== "off"}
            label="Repeat"
            theme={theme}
            morphTransition={morphTransition}
            transitionName="symph-control-repeat"
            onClick={() => cycleRepeat()}
          >
            <RepeatIcon mode={repeat} />
          </GhostIconButton>
          <VolumePopoverButton theme={theme} morphTransition={morphTransition} variant="transport" />
        </div>
      ) : null}
    </div>
  );

  if (isDock) {
    return <div className="w-full shrink-0">{shell}</div>;
  }

  return (
    <aside className="shrink-0 lg:w-[min(100%,420px)] xl:w-[440px] lg:max-w-[42vw] border-b lg:border-b-0 lg:border-r border-white/10 overflow-y-auto no-scrollbar">
      {shell}
    </aside>
  );
});

function IconCircle({
  children,
  onClick,
  label,
  large,
  morphTransition,
  transitionName
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  large?: boolean;
  morphTransition?: boolean;
  transitionName?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white ${
        large ? "size-16" : "size-12"
      }`}
      style={morphTransition && transitionName ? { viewTransitionName: transitionName } : undefined}
    >
      {children}
    </button>
  );
}

function GhostIconButton({
  children,
  onClick,
  label,
  active,
  theme,
  morphTransition,
  transitionName
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
  theme: ReturnType<typeof accentTheme>;
  morphTransition?: boolean;
  transitionName?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`size-10 inline-flex items-center justify-center rounded-full symph-tone-transition ${
        active ? "" : "text-zinc-400 hover:text-white"
      }`}
      style={{
        ...(active
          ? { backgroundColor: theme.ghostActiveBg, color: theme.ghostActiveText }
          : undefined),
        ...(morphTransition && transitionName ? { viewTransitionName: transitionName } : undefined)
      }}
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
