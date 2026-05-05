import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchItem, fetchItems } from "@/jellyfin/client";
import type { BaseItemDto } from "@/jellyfin/types";
import { artistName, toQueueTrack } from "@/lib/format";
import { ArtworkImage } from "@/components/ArtworkImage";
import { getAudioElement } from "@/audio/PlaybackEngine";
import { usePlayerStore } from "@/state/playerStore";
import { useServerStore } from "@/state/serverStore";

export function LibraryBrowsePage() {
  const { parentId } = useParams();
  const session = useServerStore((s) => s.session);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const [items, setItems] = useState<BaseItemDto[]>([]);
  const [title, setTitle] = useState("Library");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !parentId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchItems(session, {
          ParentId: parentId,
          Recursive: false,
          IncludeItemTypes: "MusicAlbum,MusicArtist,Folder,Playlist,Audio",
          SortBy: "SortName",
          Fields: "PrimaryImageAspectRatio,UserData"
        });
        if (cancelled) return;
        let list = res.Items ?? [];
        if (list.length === 0) {
          const deep = await fetchItems(session, {
            ParentId: parentId,
            Recursive: true,
            IncludeItemTypes: "Audio",
            SortBy: "DateCreated",
            SortOrder: "Descending",
            Limit: 150,
            Fields: "PrimaryImageAspectRatio,UserData"
          });
          if (!cancelled) list = deep.Items ?? [];
        }
        setItems(list);
      } catch {
        if (!cancelled) setError("Could not load this library.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, parentId]);

  useEffect(() => {
    if (!session || !parentId) return;
    let cancelled = false;
    (async () => {
      try {
        const lib = await fetchItem(session, parentId);
        if (!cancelled) setTitle(lib.Name ?? "Library");
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, parentId]);

  if (!session || !parentId) return null;

  return (
    <div className="space-y-6 pt-2 md:pt-6">
      <div className="flex items-center gap-3">
        <Link to="/libraries" className="text-zinc-500 hover:text-white text-sm">
          ← Libraries
        </Link>
      </div>
      <h1 className="font-display text-3xl text-white">{title}</h1>
      {error && <div className="text-rose-300 text-sm">{error}</div>}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {items.map((item) => {
          if (item.Type === "MusicAlbum") {
            return (
              <Link key={item.Id} to={`/album/${item.Id}`} className="group">
                <div className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-900/40 aspect-square relative">
                  <ArtworkImage
                    session={session}
                    itemId={item.Id}
                    className="w-full h-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    alt=""
                    maxWidth={480}
                  />
                </div>
                <div className="mt-2 px-0.5">
                  <div className="text-sm text-white font-medium truncate">{item.Name}</div>
                  <div className="text-xs text-zinc-500 truncate">{artistName(item)}</div>
                </div>
              </Link>
            );
          }
          if (item.Type === "MusicArtist") {
            return (
              <Link
                key={item.Id}
                to={`/library/${item.Id}`}
                className="group rounded-2xl border border-white/10 bg-zinc-900/40 overflow-hidden"
              >
                <div className="aspect-square">
                  <ArtworkImage
                    session={session}
                    itemId={item.Id}
                    className="w-full h-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    alt=""
                    maxWidth={480}
                  />
                </div>
                <div className="p-3">
                  <div className="text-sm text-white font-medium truncate">{item.Name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">Artist</div>
                </div>
              </Link>
            );
          }
          if (item.Type === "Playlist") {
            return (
              <Link
                key={item.Id}
                to={`/library/${item.Id}`}
                className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4 flex flex-col justify-end min-h-[140px] hover:border-indigo-400/40 transition"
              >
                <div className="text-sm text-white font-medium">{item.Name}</div>
                <div className="text-xs text-zinc-500 mt-1">Playlist</div>
              </Link>
            );
          }
          if (item.Type === "Folder" || item.Type === "CollectionFolder") {
            return (
              <Link
                key={item.Id}
                to={`/library/${item.Id}`}
                className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4 flex flex-col justify-end min-h-[140px] hover:border-indigo-400/40 transition"
              >
                <div className="text-sm text-white font-medium">{item.Name}</div>
                <div className="text-xs text-zinc-500 mt-1">Folder</div>
              </Link>
            );
          }
          if (item.Type === "Audio") {
            return (
              <button
                key={item.Id}
                type="button"
                onClick={() => {
                  const q = [toQueueTrack(item)];
                  setQueue(q, 0);
                  queueMicrotask(() => {
                    void getAudioElement()?.play();
                  });
                }}
                className="text-left rounded-2xl border border-white/10 bg-zinc-900/50 overflow-hidden hover:border-indigo-400/40 transition"
              >
                <div className="aspect-square">
                  <ArtworkImage
                    session={session}
                    itemId={item.ParentId ?? item.Id}
                    className="w-full h-full object-cover"
                    alt=""
                    maxWidth={360}
                  />
                </div>
                <div className="p-3">
                  <div className="text-sm text-white font-medium truncate">{item.Name}</div>
                  <div className="text-xs text-zinc-500 truncate">{artistName(item)}</div>
                </div>
              </button>
            );
          }
          return (
            <div
              key={item.Id}
              className="rounded-2xl border border-white/10 bg-zinc-900/30 p-4 text-sm text-zinc-400"
            >
              {item.Name}
            </div>
          );
        })}
      </div>
    </div>
  );
}
