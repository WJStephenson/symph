import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  addTracksToPlaylist,
  createPlaylist,
  fetchUserPlaylists
} from "@/jellyfin/playlists";
import type { BaseItemDto, JellyfinSession } from "@/jellyfin/types";

type Props = {
  open: boolean;
  onClose: () => void;
  session: JellyfinSession;
  trackIds: string[];
  onAdded?: () => void;
};

export function AddToPlaylistModal({
  open,
  onClose,
  session,
  trackIds,
  onAdded
}: Props) {
  const [playlists, setPlaylists] = useState<BaseItemDto[]>([]);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setNewName("");
    let cancelled = false;
    void (async () => {
      try {
        const list = await fetchUserPlaylists(session);
        if (!cancelled) setPlaylists(list);
      } catch {
        if (!cancelled) setPlaylists([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, session]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const root =
    typeof document !== "undefined" ? document.body : null;
  if (!root) return null;

  const addTo = async (playlistId: string) => {
    setBusy(true);
    setError(null);
    try {
      await addTracksToPlaylist(session, playlistId, trackIds);
      onAdded?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add to playlist.");
    } finally {
      setBusy(false);
    }
  };

  const createAndAdd = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createPlaylist(session, newName.trim(), trackIds);
      onAdded?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create playlist.");
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl max-h-[min(85vh,520px)] flex flex-col"
        style={{ paddingBottom: "var(--safe-bottom)" }}
      >
        <div className="shrink-0 px-5 pt-5 pb-3 border-b border-white/10">
          <h2 className="font-display text-xl text-white">Add to playlist</h2>
          <p className="text-xs text-zinc-500 mt-1">
            {trackIds.length === 1 ? "One track" : `${trackIds.length} tracks`}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && <div className="text-sm text-rose-300">{error}</div>}
          <div>
            <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">New playlist</div>
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Playlist name"
                className="flex-1 rounded-xl bg-black/40 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-indigo-400/60"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void createAndAdd();
                }}
              />
              <button
                type="button"
                disabled={busy || !newName.trim()}
                onClick={() => void createAndAdd()}
                className="shrink-0 rounded-xl bg-white text-zinc-900 font-medium px-4 py-2.5 text-sm disabled:opacity-40"
              >
                Create
              </button>
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Your playlists</div>
            <div className="rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden max-h-56 overflow-y-auto">
              {playlists.map((pl) => (
                <button
                  key={pl.Id}
                  type="button"
                  disabled={busy}
                  onClick={() => void addTo(pl.Id)}
                  className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/5 disabled:opacity-40 truncate"
                >
                  {pl.Name}
                </button>
              ))}
            </div>
            {playlists.length === 0 && (
              <p className="text-xs text-zinc-500 mt-2">No playlists yet — create one above.</p>
            )}
          </div>
        </div>
        <div className="shrink-0 px-5 py-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-white/15 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    root
  );
}

type BtnProps = {
  session: JellyfinSession;
  trackIds: string[];
  variant?: "text" | "icon";
  className?: string;
  onAdded?: () => void;
};

export function AddToPlaylistButton({
  session,
  trackIds,
  variant = "text",
  className = "",
  onAdded
}: BtnProps) {
  const [open, setOpen] = useState(false);
  if (!trackIds.length) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        className={
          variant === "icon"
            ? `inline-flex items-center justify-center rounded-lg border border-white/15 text-zinc-400 hover:text-white hover:bg-white/10 size-9 shrink-0 ${className}`
            : `shrink-0 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-white/10 ${className}`
        }
        aria-label="Add to playlist"
      >
        {variant === "icon" ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        ) : (
          "Add to playlist"
        )}
      </button>
      <AddToPlaylistModal
        open={open}
        onClose={() => setOpen(false)}
        session={session}
        trackIds={trackIds}
        onAdded={onAdded}
      />
    </>
  );
}
