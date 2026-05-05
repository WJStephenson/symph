import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  addTracksToPlaylist,
  deletePlaylistItem,
  fetchPlaylistTracks,
  removeTracksFromPlaylist,
  updatePlaylistName
} from "@/jellyfin/playlists";
import { fetchItem, fetchItems } from "@/jellyfin/client";
import type { BaseItemDto } from "@/jellyfin/types";
import { ArtworkImage } from "@/components/ArtworkImage";
import { getAudioElement } from "@/audio/audioRef";
import { artistName, formatDuration, ticksToSec, toQueueTrack } from "@/lib/format";
import { usePlayerStore } from "@/state/playerStore";
import { useServerStore } from "@/state/serverStore";

export function PlaylistEditPage() {
  const { playlistId } = useParams();
  const session = useServerStore((s) => s.session);
  const navigate = useNavigate();
  const setQueue = usePlayerStore((s) => s.setQueue);
  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState("");
  const [tracks, setTracks] = useState<BaseItemDto[]>([]);
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<BaseItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadTracks = async () => {
    if (!session || !playlistId) return;
    const list = await fetchPlaylistTracks(session, playlistId);
    setTracks(list);
  };

  useEffect(() => {
    if (!session || !playlistId) return;
    let cancelled = false;
    (async () => {
      try {
        const pl = await fetchItem(session, playlistId);
        if (cancelled) return;
        setName(pl.Name ?? "");
        setSavedName(pl.Name ?? "");
        await loadTracks();
      } catch {
        if (!cancelled) setError("Could not load playlist.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, playlistId]);

  const trimmedAdd = useMemo(() => addQuery.trim(), [addQuery]);

  useEffect(() => {
    if (!session || trimmedAdd.length < 2) {
      setAddResults([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetchItems(session, {
            SearchTerm: trimmedAdd,
            Recursive: true,
            IncludeItemTypes: "Audio",
            Limit: 20,
            Fields: "PrimaryImageAspectRatio,ImageTags"
          });
          if (!cancelled) setAddResults(res.Items ?? []);
        } catch {
          if (!cancelled) setAddResults([]);
        }
      })();
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [session, trimmedAdd]);

  if (!session || !playlistId) return null;

  const saveName = async () => {
    const n = name.trim();
    if (!n || n === savedName) return;
    setBusy(true);
    setError(null);
    try {
      await updatePlaylistName(session, playlistId, n);
      setSavedName(n);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save name.");
    } finally {
      setBusy(false);
    }
  };

  const removeTrack = async (entryId: string) => {
    setBusy(true);
    setError(null);
    try {
      await removeTracksFromPlaylist(session, playlistId, [entryId]);
      await loadTracks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove track.");
    } finally {
      setBusy(false);
    }
  };

  const addTrack = async (track: BaseItemDto) => {
    setBusy(true);
    setError(null);
    try {
      await addTracksToPlaylist(session, playlistId, [track.Id]);
      setAddQuery("");
      setAddResults([]);
      await loadTracks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add track.");
    } finally {
      setBusy(false);
    }
  };

  const deletePlaylist = async () => {
    if (!session || !playlistId) return;
    if (!window.confirm("Delete this playlist? This cannot be undone.")) return;
    setBusy(true);
    setError(null);
    try {
      await deletePlaylistItem(session, playlistId);
      navigate("/playlists", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete playlist.");
    } finally {
      setBusy(false);
    }
  };

  const playAll = (start = 0) => {
    const q = tracks.map((tr) => toQueueTrack(tr));
    if (!q.length) return;
    setQueue(q, start);
    queueMicrotask(() => void getAudioElement()?.play());
  };

  return (
    <div className="space-y-8 pt-2 md:pt-6 max-w-2xl">
      <Link to="/playlists" className="text-sm text-zinc-500 hover:text-white">
        ← Playlists
      </Link>
      {error && <div className="text-sm text-rose-300">{error}</div>}
      <div className="rounded-3xl border border-white/10 bg-zinc-900/40 p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <label className="text-xs uppercase tracking-widest text-zinc-500">Name</label>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-400/60 min-w-0"
              />
              <button
                type="button"
                disabled={busy || name.trim() === savedName || !name.trim()}
                onClick={() => void saveName()}
                className="shrink-0 rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white hover:bg-white/5 disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void deletePlaylist()}
            className="shrink-0 rounded-xl border border-rose-400/40 text-rose-200 px-4 py-2.5 text-sm hover:bg-rose-500/10 disabled:opacity-40"
          >
            Delete playlist
          </button>
        </div>
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            disabled={busy || !tracks.length}
            onClick={() => playAll(0)}
            className="rounded-xl bg-white text-zinc-900 font-medium px-4 py-2.5 text-sm disabled:opacity-40"
          >
            Play
          </button>
        </div>
      </div>
      <div className="rounded-3xl border border-white/10 bg-zinc-900/40 p-6 space-y-3">
        <div className="text-xs uppercase tracking-widest text-zinc-500">Add tracks</div>
        <input
          value={addQuery}
          onChange={(e) => setAddQuery(e.target.value)}
          placeholder="Search tracks to add…"
          className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-indigo-400/60"
        />
        {addResults.length > 0 && (
          <div className="rounded-xl border border-white/10 divide-y divide-white/5 max-h-60 overflow-y-auto">
            {addResults.map((tr) => (
              <button
                key={tr.Id}
                type="button"
                disabled={busy}
                onClick={() => void addTrack(tr)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5 disabled:opacity-40"
              >
                <div className="size-9 rounded-lg overflow-hidden border border-white/10 shrink-0">
                  <ArtworkImage
                    session={session}
                    itemId={tr.ParentId ?? tr.Id}
                    item={tr}
                    className="size-full object-cover"
                    alt=""
                    maxWidth={96}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white truncate">{tr.Name}</div>
                  <div className="text-xs text-zinc-500 truncate">{artistName(tr)}</div>
                </div>
                <span className="text-xs text-indigo-300 shrink-0">Add</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-3">Tracks</h2>
        <div className="rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
          {tracks.map((tr, i) => {
            const entryId = tr.PlaylistItemId ?? tr.Id;
            const dur = tr.RunTimeTicks ? formatDuration(ticksToSec(tr.RunTimeTicks)) : "";
            return (
              <div
                key={`${tr.Id}-${entryId}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/5"
              >
                <button
                  type="button"
                  onClick={() => playAll(i)}
                  className="flex flex-1 min-w-0 items-center gap-3 text-left"
                >
                  <span className="text-xs text-zinc-500 w-6 tabular-nums shrink-0">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white truncate">{tr.Name}</div>
                    <div className="text-xs text-zinc-500 truncate">{artistName(tr)}</div>
                  </div>
                  <span className="text-xs text-zinc-500 tabular-nums shrink-0">{dur}</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void removeTrack(entryId)}
                  className="shrink-0 text-xs text-rose-300/90 hover:text-rose-200 px-2 py-1 disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
        {tracks.length === 0 && (
          <p className="text-sm text-zinc-500 mt-3">No tracks yet. Search above to add some.</p>
        )}
      </div>
    </div>
  );
}
