import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PlayerLeftColumn, VirtualizedQueue } from "@/components/NowPlayingQueue";
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

  const [scrubDragging, setScrubDragging] = useState(false);
  const [scrubLocalSec, setScrubLocalSec] = useState(0);
  const scrubTargetRef = useRef<HTMLDivElement>(null);

  const track = queue[index];
  const queueKey = useMemo(() => queue.map((q) => q.id).join("\0"), [queue]);

  useEffect(() => {
    if (!scrubDragging) setScrubLocalSec(positionSec);
  }, [positionSec, scrubDragging]);

  const displayProgress =
    durationSec > 0 ? Math.min(1, Math.max(0, (scrubDragging ? scrubLocalSec : positionSec) / durationSec)) : 0;

  const setDockTimelineFromClientX = useCallback(
    (clientX: number) => {
      const wrap = scrubTargetRef.current;
      if (!wrap || durationSec <= 0) return;
      const rect = wrap.getBoundingClientRect();
      const x = Math.min(Math.max(0, clientX - rect.left), rect.width);
      const next = (x / rect.width) * durationSec;
      setScrubLocalSec(next);
      const el = getAudioElement();
      if (el) el.currentTime = next;
    },
    [durationSec]
  );

  useEffect(() => {
    if (!scrubDragging) return;
    const onMove = (e: PointerEvent) => setDockTimelineFromClientX(e.clientX);
    const onUp = () => setScrubDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [scrubDragging, setDockTimelineFromClientX]);

  useEffect(() => {
    if (open) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
        setScrubDragging(false);
      };
    }
    setScrubDragging(false);
    return undefined;
  }, [open]);

  if (!session || !track) return null;

  const transportControls = (
    <div
      className={`relative z-20 flex items-center gap-1 shrink-0 ${open ? "pointer-events-auto" : "h-full pointer-events-auto"}`}
    >
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
        triggerClassName={
          !open ? "bg-black/70 border border-white/15 shadow-sm" : "pointer-events-auto"
        }
      />
    </div>
  );

  const dockArtwork = (layout: "compact" | "sheet") =>
    layout === "compact" ? (
      <button
        type="button"
        aria-label="Expand now playing"
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        className="relative size-[60px] shrink-0 overflow-hidden rounded-l-2xl border-y border-r border-white/20 text-left shadow-sm ring-1 ring-black/40 outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        style={{ viewTransitionName: "symph-artwork" }}
      >
        <ArtworkImage
          session={session}
          itemId={track.albumId ?? track.id}
          item={queueCoverItem(track)}
          className="size-full object-cover"
          alt=""
          maxWidth={120}
        />
      </button>
    ) : (
      <div
        className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-white/20 shadow-sm ring-1 ring-black/40"
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
    );

  const dockBar = open ? (
    <div
      className={`relative z-10 flex items-center gap-3 p-2.5 shrink-0 overflow-hidden pointer-events-none`}
    >
      {dockArtwork("sheet")}
      <div className="min-w-0 flex-1" aria-hidden />
      {transportControls}
    </div>
  ) : (
    <div className="relative z-10 flex h-[60px] shrink-0 items-center overflow-hidden pl-0 pr-2.5">
      {dockArtwork("compact")}
      <div
        ref={durationSec > 0 ? scrubTargetRef : undefined}
        className="relative h-full min-h-0 min-w-0 flex-1 self-stretch bg-zinc-950/90"
      >
        {durationSec > 0 ? (
          <>
            <div
              className="pointer-events-none absolute inset-0 bg-zinc-950/90 transition-opacity duration-300 ease-out motion-reduce:transition-none"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-y-0 left-0 transition-[width] duration-150 ease-linear"
              style={{
                width: `${displayProgress * 100}%`,
                background: `linear-gradient(90deg, ${theme.progress} 0%, ${theme.fill} 100%)`
              }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/45 via-black/25 to-black/50 transition-opacity duration-300 ease-out motion-reduce:transition-none"
              aria-hidden
            />
            <div
              className="absolute inset-0 z-[5] cursor-pointer touch-none select-none"
              aria-hidden
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                setScrubDragging(true);
                setDockTimelineFromClientX(e.clientX);
                void getAudioElement()?.play();
              }}
            />
          </>
        ) : null}
        <div className="relative z-10 flex h-full min-w-0 flex-col justify-center px-3 py-0 pointer-events-none">
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
      </div>
      {transportControls}
    </div>
  );

  return (
    <div
      className={`max-w-6xl mx-auto w-full flex flex-col min-h-0 ${
        open ? "h-full max-h-full min-h-0 flex-1 overflow-hidden" : "shrink-0"
      }`}
    >
      <div
        className={`rounded-2xl border border-white/10 symph-tone-transition flex flex-col min-h-0 overflow-hidden pointer-events-auto transition-[background-color,box-shadow,backdrop-filter] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          open ? "bg-zinc-950/[0.96] shadow-2xl flex-1 min-h-0 h-full max-h-full backdrop-blur-none" : "glass"
        }`}
        style={{ boxShadow: theme.miniShadow }}
      >
        <div className={`grid min-h-0 ${open ? "grid-rows-[minmax(0,1fr)] flex-1 overflow-hidden" : "grid-rows-[0fr]"}`}>
          <div
            className="min-h-0 max-h-full overflow-hidden flex flex-col h-full"
            inert={!open ? true : undefined}
          >
            <div className="flex flex-1 min-h-0 flex-col overflow-hidden border-b border-white/10 bg-black/25">
              <VirtualizedQueue
                key={queueKey}
                session={session}
                queue={queue}
                activeIndex={index}
                dense
              />
            </div>
          </div>
        </div>
        <div
          className={`relative shrink-0 flex flex-col overflow-hidden transition-[border-radius] duration-300 ease-out motion-reduce:transition-none ${
            open ? "" : "rounded-b-2xl"
          }`}
        >
          {open ? (
            <div
              ref={durationSec > 0 ? scrubTargetRef : undefined}
              className="relative shrink-0 flex flex-col overflow-hidden"
            >
              {durationSec > 0 ? (
                <>
                  <div className="pointer-events-none absolute inset-0 z-0 bg-zinc-950/90" aria-hidden />
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 z-0 transition-[width] duration-150 ease-linear"
                    style={{
                      width: `${displayProgress * 100}%`,
                      background: `linear-gradient(90deg, ${theme.progress} 0%, ${theme.fill} 100%)`
                    }}
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-r from-black/45 via-black/25 to-black/50"
                    aria-hidden
                  />
                  <div
                    className="absolute inset-0 z-[1] cursor-pointer touch-none select-none"
                    aria-hidden
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      e.preventDefault();
                      setScrubDragging(true);
                      setDockTimelineFromClientX(e.clientX);
                      void getAudioElement()?.play();
                    }}
                  />
                </>
              ) : null}
              <div className="relative z-10 shrink-0 px-4 pt-4 pb-3 md:px-6 md:pt-5 md:pb-4 space-y-4 pointer-events-none">
                <PlayerLeftColumn
                  session={session}
                  track={track}
                  morphTransition
                  variant="dockExpanded"
                  hideArtwork
                />
              </div>
              {dockBar}
            </div>
          ) : (
            dockBar
          )}
          {open ? (
            <div className="relative z-20 shrink-0 border-t border-white/10 bg-black/20">
              <button
                type="button"
                aria-label="Minimise player"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="flex w-full items-center justify-center px-4 py-3 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200 active:bg-white/[0.08]"
              >
                <ChevronDownGlyph />
              </button>
            </div>
          ) : null}
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
