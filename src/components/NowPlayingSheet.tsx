import { useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { PlayerLeftColumn, VirtualizedQueue } from "@/components/NowPlayingQueue";
import { accentTheme } from "@/lib/accentTheme";
import { usePlayerStore } from "@/state/playerStore";
import { useServerStore } from "@/state/serverStore";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function NowPlayingSheet({ open, onClose }: Props) {
  const session = useServerStore((s) => s.session);
  const accent = usePlayerStore((s) => s.accent);
  const theme = useMemo(() => accentTheme(accent), [accent]);
  const { queue, index } = usePlayerStore(
    useShallow((s) => ({
      queue: s.queue,
      index: s.index
    }))
  );

  const track = queue[index];
  const queueKey = useMemo(() => queue.map((q) => q.id).join("\0"), [queue]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open || !session || !track) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-zinc-950">
      <button
        type="button"
        aria-label="Close player"
        className="absolute inset-0 backdrop-blur-[2px]"
        style={{ backgroundColor: theme.sheetBackdrop }}
        onClick={onClose}
      />
      <div
        className="relative z-10 flex flex-col flex-1 min-h-0 m-0 lg:m-3 lg:rounded-2xl lg:border lg:border-white/10 lg:overflow-hidden lg:shadow-2xl"
        style={{ paddingBottom: "var(--safe-bottom)", paddingTop: "var(--safe-top)" }}
      >
        <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-zinc-950/95">
          <button type="button" className="text-sm text-zinc-400 hover:text-white" onClick={onClose}>
            Close
          </button>
          <div className="text-xs uppercase tracking-widest text-zinc-500">Now playing</div>
          <div className="w-14" />
        </header>
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden bg-zinc-950/98">
          <PlayerLeftColumn session={session} track={track} morphTransition />
          <VirtualizedQueue key={queueKey} session={session} queue={queue} activeIndex={index} />
        </div>
      </div>
    </div>
  );
}
