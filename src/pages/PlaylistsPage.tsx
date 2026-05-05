import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPlaylist, fetchUserPlaylists } from "@/jellyfin/playlists";
import type { BaseItemDto } from "@/jellyfin/types";
import { ArtworkImage } from "@/components/ArtworkImage";
import { useServerStore } from "@/state/serverStore";

export function PlaylistsPage() {
  const session = useServerStore((s) => s.session);
  const navigate = useNavigate();
  const [items, setItems] = useState<BaseItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState("");

  const load = async () => {
    if (!session) return;
    setError(null);
    try {
      const list = await fetchUserPlaylists(session);
      setItems(list);
    } catch {
      setError("Could not load playlists.");
    }
  };

  useEffect(() => {
    void load();
  }, [session]);

  const create = async () => {
    if (!session || !newName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const id = await createPlaylist(session, newName.trim());
      setNewName("");
      await load();
      navigate(`/playlists/${id}/edit`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create playlist.");
    } finally {
      setBusy(false);
    }
  };

  if (!session) return null;

  return (
    <div className="space-y-8 pt-2 md:pt-6 max-w-xl">
      <h1 className="font-display text-3xl text-white">Playlists</h1>
      {error && <div className="text-sm text-rose-300">{error}</div>}
      <div className="rounded-3xl border border-white/10 bg-zinc-900/40 p-5 space-y-3">
        <div className="text-xs uppercase tracking-widest text-zinc-500">New playlist</div>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name"
            className="flex-1 rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-indigo-400/60"
            onKeyDown={(e) => {
              if (e.key === "Enter") void create();
            }}
          />
          <button
            type="button"
            disabled={busy || !newName.trim()}
            onClick={() => void create()}
            className="shrink-0 rounded-xl bg-white text-zinc-900 font-medium px-4 py-2.5 text-sm disabled:opacity-40"
          >
            Create
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {items.map((pl) => (
          <Link
            key={pl.Id}
            to={`/playlists/${pl.Id}/edit`}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/40 p-3 hover:border-indigo-400/40 transition"
          >
            <div className="size-12 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-zinc-800">
              <ArtworkImage
                session={session}
                itemId={pl.Id}
                item={pl}
                className="size-full object-cover"
                alt=""
                maxWidth={120}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-white truncate">{pl.Name}</div>
              <div className="text-xs text-zinc-500">Playlist</div>
            </div>
          </Link>
        ))}
      </div>
      {items.length === 0 && !error && (
        <p className="text-sm text-zinc-500">No playlists yet. Create one above.</p>
      )}
    </div>
  );
}
