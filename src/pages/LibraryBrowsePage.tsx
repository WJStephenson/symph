import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchAllAudioUnderParent, fetchItem, fetchItems } from "@/jellyfin/client";
import type { BaseItemDto } from "@/jellyfin/types";
import { artistName, toQueueTrack } from "@/lib/format";
import { accentTheme } from "@/lib/accentTheme";
import { ArtworkImage } from "@/components/ArtworkImage";
import { AddToPlaylistButton } from "@/components/AddToPlaylistModal";
import { getAudioElement } from "@/audio/audioRef";
import { selectNowPlayingTrackId, usePlayerStore } from "@/state/playerStore";
import { useServerStore } from "@/state/serverStore";

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function LibraryBrowsePage() {
  const { parentId } = useParams();
  const session = useServerStore((s) => s.session);
  const libraryRootId = useServerStore((s) => s.preferredMusicLibraryId);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const accent = usePlayerStore((s) => s.accent);
  const nowPlayingId = usePlayerStore(selectNowPlayingTrackId);
  const browseTheme = useMemo(() => accentTheme(accent), [accent]);
  const [items, setItems] = useState<BaseItemDto[]>([]);
  const [container, setContainer] = useState<BaseItemDto | null>(null);
  const [title, setTitle] = useState("Library");
  const [error, setError] = useState<string | null>(null);
  const [randomBusy, setRandomBusy] = useState(false);

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
          Fields: "PrimaryImageAspectRatio,UserData,ImageTags"
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
            Fields: "PrimaryImageAspectRatio,UserData,ImageTags"
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
        const item = await fetchItem(session, parentId);
        if (cancelled) return;
        setContainer(item);
        setTitle(item.Name ?? "Library");
      } catch {
        if (!cancelled) setContainer(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, parentId]);

  const allArtistsBrowse = useMemo(() => {
    if (!container || container.Type !== "Folder") return false;
    if (items.length === 0) return false;
    return items.every((x) => x.Type === "MusicArtist");
  }, [container, items]);

  const singleArtistBrowse = container?.Type === "MusicArtist";

  const playQueueFromTracks = (tracks: BaseItemDto[]) => {
    if (!tracks.length) return;
    const q = tracks.map((t) => toQueueTrack(t));
    setQueue(q, 0);
    queueMicrotask(() => void getAudioElement()?.play());
  };

  const randomPlaySingleArtist = async () => {
    if (!session || !parentId) return;
    setRandomBusy(true);
    try {
      const tracks = await fetchAllAudioUnderParent(session, parentId, 400);
      if (!tracks.length) return;
      shuffleInPlace(tracks);
      playQueueFromTracks(tracks);
    } finally {
      setRandomBusy(false);
    }
  };

  const randomPlayAllArtists = async () => {
    if (!session) return;
    const artists = items.filter((x) => x.Type === "MusicArtist");
    if (!artists.length) return;
    setRandomBusy(true);
    try {
      const merged: BaseItemDto[] = [];
      const seen = new Set<string>();
      const chunkSize = 4;
      for (let i = 0; i < artists.length; i += chunkSize) {
        const chunk = artists.slice(i, i + chunkSize);
        const results = await Promise.all(
          chunk.map((a) =>
            fetchItems(session, {
              ParentId: a.Id,
              Recursive: true,
              IncludeItemTypes: "Audio",
              SortBy: "Random",
              Limit: 48,
              Fields: "PrimaryImageAspectRatio,UserData"
            })
          )
        );
        for (const data of results) {
          for (const t of data.Items ?? []) {
            if (!seen.has(t.Id)) {
              seen.add(t.Id);
              merged.push(t);
            }
          }
        }
      }
      if (!merged.length) return;
      shuffleInPlace(merged);
      playQueueFromTracks(merged.slice(0, 280));
    } finally {
      setRandomBusy(false);
    }
  };

  if (!session || !parentId) return null;

  const showLibrariesBack =
    libraryRootId == null ? !allArtistsBrowse : parentId !== libraryRootId;

  return (
    <div className="space-y-6 pt-2 md:pt-6">
      {showLibrariesBack && (
        <div className="flex items-center gap-3">
          <Link to="/libraries" className="text-zinc-500 hover:text-white text-sm">
            ← Libraries
          </Link>
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="font-display text-3xl text-white">{title}</h1>
        {(allArtistsBrowse || singleArtistBrowse) && (
          <button
            type="button"
            disabled={randomBusy}
            onClick={() => void (allArtistsBrowse ? randomPlayAllArtists() : randomPlaySingleArtist())}
            className="shrink-0 rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition disabled:opacity-50"
          >
            {randomBusy ? "Building queue…" : "Random play"}
          </button>
        )}
      </div>
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
                    item={item}
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
                    item={item}
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
            const isActive = item.Id === nowPlayingId;
            return (
              <div
                key={item.Id}
                className={`text-left rounded-2xl border bg-zinc-900/50 overflow-hidden transition-colors relative ${
                  isActive ? "bg-white/[0.07]" : "border-white/10 hover:border-indigo-400/40"
                }`}
                style={isActive ? { borderColor: browseTheme.fill } : undefined}
              >
                <button
                  type="button"
                  onClick={() => {
                    const q = [toQueueTrack(item)];
                    setQueue(q, 0);
                    queueMicrotask(() => {
                      void getAudioElement()?.play();
                    });
                  }}
                  className="w-full"
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
                <div className="absolute top-2 right-2 z-10">
                  <AddToPlaylistButton
                    session={session}
                    trackIds={[item.Id]}
                    variant="icon"
                    className="bg-black/50 border-white/20 backdrop-blur-sm"
                  />
                </div>
              </div>
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
