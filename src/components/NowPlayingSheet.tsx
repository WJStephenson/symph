import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AddToPlaylistButton } from "@/components/AddToPlaylistModal";
import { PlayerHeroArtwork, PlayerLeftColumn, VirtualizedQueue } from "@/components/NowPlayingQueue";
import { accentTheme } from "@/lib/accentTheme";
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
  const positionSec = usePlayerStore((s) => s.positionSec);
  const durationSec = usePlayerStore((s) => s.durationSec);

  const [queueAccordionOpen, setQueueAccordionOpen] = useState(false);

  const track = queue[index];
  const queueKey = useMemo(() => queue.map((q) => q.id).join("\0"), [queue]);
  const timelineProgress =
    durationSec > 0 ? Math.min(1, Math.max(0, positionSec / durationSec)) : 0;

  const toggleExpanded = useCallback(() => {
    if (open) onClose();
    else onOpen();
  }, [open, onOpen, onClose]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (open) setQueueAccordionOpen(true);
    else setQueueAccordionOpen(false);
  }, [open]);

  if (!session || !track) return null;

  return (
    <div
      className={`max-w-6xl mx-auto w-full flex flex-col min-h-0 shrink-0 ${
        open ? "h-full max-h-full min-h-0 overflow-hidden flex flex-col" : ""
      }`}
    >
      <div
        className={`rounded-2xl border border-white/10 symph-tone-transition transition-shadow duration-500 ease-out flex flex-col min-h-0 overflow-hidden pointer-events-auto ${
          open ? "bg-zinc-950/[0.96] shadow-2xl flex-1 min-h-0 h-full max-h-full" : "glass"
        }`}
        style={{ boxShadow: theme.miniShadow }}
      >
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
            open ? "grid-rows-[minmax(0,1fr)] flex-1 min-h-0 overflow-hidden" : "grid-rows-[0fr]"
          }`}
        >
          <div
            className="min-h-0 max-h-full overflow-hidden flex flex-col h-full"
            inert={!open ? true : undefined}
          >
            <div className="flex flex-1 min-h-0 flex-col overflow-hidden border-b border-white/10 bg-black/25">
              <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
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
          </div>
        </div>
        <div
          className={`relative shrink-0 flex flex-col overflow-hidden ${
            open ? "rounded-t-2xl" : "rounded-b-2xl"
          }`}
        >
          {durationSec > 0 ? (
            <>
              <div className="pointer-events-none absolute inset-0 bg-zinc-950/90" aria-hidden />
              <div
                className="pointer-events-none absolute inset-y-0 left-0 transition-[width] duration-150 ease-linear"
                style={{
                  width: `${timelineProgress * 100}%`,
                  background: `linear-gradient(90deg, ${theme.progress} 0%, ${theme.fill} 100%)`
                }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/45 via-black/25 to-black/50"
                aria-hidden
              />
            </>
          ) : null}
          {open ? (
            <div className="relative z-10 shrink-0 px-4 pt-4 pb-3 md:px-6 md:pt-5 md:pb-4 space-y-4">
              <PlayerLeftColumn
                session={session}
                track={track}
                morphTransition
                variant="dockExpanded"
                hideArtwork
              />
            </div>
          ) : null}
          <div className="relative z-10 flex items-center gap-3 p-2.5 shrink-0 overflow-hidden">
          <button
            type="button"
            onClick={toggleExpanded}
            className="relative z-10 flex items-center gap-3 min-w-0 flex-1 text-left"
          >
            <div
              className="size-12 shrink-0 rounded-xl overflow-hidden border border-white/20 shadow-sm ring-1 ring-black/40"
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
            {!open ? (
              <div className="min-w-0">
                <div
                  className="text-sm font-medium text-white truncate"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.85), 0 0 12px rgba(0,0,0,0.5)" }}
                >
                  {track.title}
                </div>
                <div
                  className="text-xs text-zinc-200 truncate"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.85), 0 0 10px rgba(0,0,0,0.45)" }}
                >
                  {track.artist}
                </div>
              </div>
            ) : null}
          </button>
          <div className="relative z-10 flex items-center gap-1 shrink-0">
            <MiniGhostButton
              active={shuffle}
              label="Shuffle"
              theme={theme}
              transitionName="symph-control-shuffle"
              controlPlate={!open}
              onClick={() => toggleShuffle()}
            >
              <ShuffleGlyph />
            </MiniGhostButton>
            <IconButton
              label="Previous"
              transitionName="symph-control-prev"
              controlPlate={!open}
              onClick={() => prev()}
            >
              <PrevIcon />
            </IconButton>
            <IconButton
              label={isPlaying ? "Pause" : "Play"}
              transitionName="symph-control-play"
              primary
              controlPlate={!open}
              onClick={() => {
                const el = getAudioElement();
                if (!el) return;
                if (el.paused) void el.play();
                else el.pause();
              }}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </IconButton>
            <IconButton
              label="Next"
              transitionName="symph-control-next"
              controlPlate={!open}
              onClick={() => next()}
            >
              <NextIcon />
            </IconButton>
            <MiniGhostButton
              active={repeat !== "off"}
              label="Repeat"
              theme={theme}
              transitionName="symph-control-repeat"
              controlPlate={!open}
              onClick={() => cycleRepeat()}
            >
              <RepeatGlyph mode={repeat} />
            </MiniGhostButton>
            <VolumePopoverButton
              theme={theme}
              variant="mini"
              morphTransition
              triggerClassName={!open ? "bg-black/70 border border-white/15 shadow-sm" : undefined}
            />
          </div>
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
  transitionName,
  controlPlate
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
  theme: ReturnType<typeof accentTheme>;
  transitionName: string;
  controlPlate?: boolean;
}) {
  const cls = [
    "size-9 inline-flex items-center justify-center rounded-full symph-tone-transition shrink-0",
    active
      ? controlPlate
        ? "border border-white/20 ring-1 ring-black/30"
        : ""
      : controlPlate
        ? "text-zinc-100 border border-white/15 bg-black/70 shadow-sm hover:bg-white/12"
        : "text-zinc-200 hover:bg-white/10"
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cls}
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
  transitionName,
  controlPlate
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  primary?: boolean;
  transitionName: string;
  controlPlate?: boolean;
}) {
  const cls = [
    "inline-flex items-center justify-center rounded-full transition shrink-0",
    primary
      ? `size-11 bg-white text-zinc-900 shadow-lg${controlPlate ? " ring-2 ring-black/45 shadow-xl" : ""}`
      : controlPlate
        ? "size-9 text-zinc-100 border border-white/15 bg-black/70 shadow-sm hover:bg-white/12"
        : "size-9 text-zinc-200 hover:bg-white/10"
  ].join(" ");
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cls}
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
