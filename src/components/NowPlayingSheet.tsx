import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AddToPlaylistButton } from "@/components/AddToPlaylistModal";
import { PlayerHeroArtwork, PlayerLeftColumn, VirtualizedQueue } from "@/components/NowPlayingQueue";
import { WaveLineSeekBar } from "@/components/WaveLineSeekBar";
import { accentTheme } from "@/lib/accentTheme";
import { startViewTransitionIfSupported } from "@/lib/viewTransition";
import { queueCoverItem } from "@/lib/format";
import { getAudioElement } from "@/audio/audioRef";
import { usePlayerStore } from "@/state/playerStore";
import { useServerStore } from "@/state/serverStore";
import { ArtworkImage } from "@/components/ArtworkImage";
import { VolumePopoverButton } from "@/components/VolumePopoverButton";

type Props = {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export function NowPlayingSheet({ open, onOpen, onClose }: Props) {
  const session = useServerStore((s) => s.session);
  const accent = usePlayerStore((s) => s.accent);
  const theme = useMemo(() => accentTheme(accent), [accent]);
  const queue = usePlayerStore((s) => s.queue);
  const index = usePlayerStore((s) => s.index);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);

  const [queueAccordionOpen, setQueueAccordionOpen] = useState(false);

  const track = queue[index];
  const queueKey = useMemo(() => queue.map((q) => q.id).join("\0"), [queue]);

  const toggleExpanded = useCallback(() => {
    startViewTransitionIfSupported(() => {
      if (open) onClose();
      else onOpen();
    });
  }, [open, onOpen, onClose]);

  const onSeek = useCallback((sec: number) => {
    const el = getAudioElement();
    if (!el) return;
    el.currentTime = sec;
  }, []);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) setQueueAccordionOpen(false);
  }, [open]);

  if (!session || !track) return null;

  return (
    <div
      className={`max-w-6xl mx-auto w-full flex flex-col min-h-0 ${open ? "flex-1" : "shrink-0"}`}
      style={{
        maxHeight: open
          ? "calc(100svh - var(--symph-player-expand-top) - var(--symph-player-expand-bottom))"
          : undefined
      }}
    >
      <div
        className={`glass rounded-2xl border border-white/10 symph-tone-transition transition-shadow duration-500 ease-out flex flex-col min-h-0 overflow-hidden ${
          open ? "shadow-2xl flex-1 min-h-0" : ""
        }`}
        style={{ boxShadow: theme.miniShadow }}
      >
        {open && (
          <div className="flex max-h-[min(42svh,360px)] md:max-h-none flex-1 min-h-0 flex-col border-b border-white/10 bg-black/25">
            <div className="flex-1 min-h-0 flex flex-col min-h-[100px]">
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {queueAccordionOpen ? (
                  <VirtualizedQueue
                    key={queueKey}
                    session={session}
                    queue={queue}
                    activeIndex={index}
                    dense
                    hideHeader
                  />
                ) : (
                  <div className="flex-1 min-h-0 flex items-center justify-center p-3 md:p-5">
                    <PlayerHeroArtwork
                      session={session}
                      track={track}
                      morphTransition
                      layout="dock"
                    />
                  </div>
                )}
              </div>
              <button
                type="button"
                aria-expanded={queueAccordionOpen}
                onClick={(e) => {
                  e.stopPropagation();
                  setQueueAccordionOpen((v) => !v);
                }}
                className="shrink-0 flex w-full items-center gap-2 border-t border-white/10 bg-black/30 px-3 py-2.5 md:px-4 text-left hover:bg-white/[0.04] transition-colors"
              >
                <span
                  className={`text-zinc-400 shrink-0 transition-transform duration-200 ${
                    queueAccordionOpen ? "rotate-180" : ""
                  }`}
                >
                  <ChevronDownGlyph />
                </span>
                <span className="text-sm font-medium text-white">Queue</span>
                <span className="text-xs text-zinc-500 tabular-nums">{queue.length} tracks</span>
                <span className="flex-1 min-w-2" />
                {queue.length > 0 ? (
                  <AddToPlaylistButton
                    session={session}
                    trackIds={queue.map((q) => q.id)}
                    className="rounded-lg px-2.5 py-1.5"
                  />
                ) : null}
              </button>
            </div>
          </div>
        )}
        {!open ? (
          <WaveLineSeekBar onSeek={onSeek} accent={accent} minimal height={14} />
        ) : null}
        {open ? (
          <div className="shrink-0 px-4 pt-4 pb-3 md:px-6 md:pt-5 md:pb-4 space-y-4 border-b border-white/5">
            <PlayerLeftColumn
              session={session}
              track={track}
              morphTransition
              variant="dockExpanded"
              hideArtwork
            />
          </div>
        ) : null}
        <div className="flex items-center gap-3 p-2.5 shrink-0 backdrop-blur-[10px]">
          <button
            type="button"
            onClick={toggleExpanded}
            className="flex items-center gap-3 min-w-0 flex-1 text-left"
          >
            <div
              className="size-12 shrink-0 rounded-xl overflow-hidden border border-white/10"
              style={{ viewTransitionName: "symph-artwork" }}
            >
              <ArtworkImage
                session={session}
                itemId={track.albumId ?? track.id}
                item={queueCoverItem(track)}
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
            <MiniGhostButton
              active={shuffle}
              label="Shuffle"
              theme={theme}
              transitionName="symph-control-shuffle"
              onClick={() => toggleShuffle()}
            >
              <ShuffleGlyph />
            </MiniGhostButton>
            <IconButton label="Previous" transitionName="symph-control-prev" onClick={() => prev()}>
              <PrevIcon />
            </IconButton>
            <IconButton
              label={isPlaying ? "Pause" : "Play"}
              transitionName="symph-control-play"
              primary
              onClick={() => {
                const el = getAudioElement();
                if (!el) return;
                if (el.paused) void el.play();
                else el.pause();
              }}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </IconButton>
            <IconButton label="Next" transitionName="symph-control-next" onClick={() => next()}>
              <NextIcon />
            </IconButton>
            <MiniGhostButton
              active={repeat !== "off"}
              label="Repeat"
              theme={theme}
              transitionName="symph-control-repeat"
              onClick={() => cycleRepeat()}
            >
              <RepeatGlyph mode={repeat} />
            </MiniGhostButton>
            <VolumePopoverButton theme={theme} variant="mini" morphTransition />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChevronDownGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MiniGhostButton({
  children,
  onClick,
  label,
  active,
  theme,
  transitionName
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
  theme: ReturnType<typeof accentTheme>;
  transitionName: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`size-9 inline-flex items-center justify-center rounded-full symph-tone-transition shrink-0 ${
        active ? "" : "text-zinc-200 hover:bg-white/10"
      }`}
      style={{
        ...(active
          ? { backgroundColor: theme.ghostActiveBg, color: theme.ghostActiveText }
          : undefined),
        viewTransitionName: transitionName
      }}
    >
      {children}
    </button>
  );
}

function IconButton({
  children,
  onClick,
  label,
  primary,
  transitionName
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  primary?: boolean;
  transitionName: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`inline-flex items-center justify-center rounded-full transition shrink-0 ${
        primary
          ? "size-11 bg-white text-zinc-900 shadow-lg"
          : "size-9 text-zinc-200 hover:bg-white/10"
      }`}
      style={{ viewTransitionName: transitionName }}
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

function ShuffleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path
        d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RepeatGlyph({ mode }: { mode: "off" | "all" | "one" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
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
