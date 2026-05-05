import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { BaseItemDto } from "@/jellyfin/types";
import {
  fetchFavouriteAlbums,
  fetchRandomTracks,
  fetchRecentAlbums,
  fetchRecentArtists,
  fetchRecentTracks,
  fetchTopArtists
} from "@/jellyfin/musicHome";
import { ArtworkImage } from "@/components/ArtworkImage";
import { artistName, formatDuration, ticksToSec, toQueueTrack } from "@/lib/format";
import { getAudioElement } from "@/audio/PlaybackEngine";
import { usePlayerStore } from "@/state/playerStore";
import { useServerStore } from "@/state/serverStore";

type HubState = {
  recentSpotlight: BaseItemDto[];
  topArtists: BaseItemDto[];
  recentAlbums: BaseItemDto[];
  recentTracks: BaseItemDto[];
  favourites: BaseItemDto[];
};

const emptyHub: HubState = {
  recentSpotlight: [],
  topArtists: [],
  recentAlbums: [],
  recentTracks: [],
  favourites: []
};

export function HomeHubPage() {
  const session = useServerStore((s) => s.session);
  const libraryId = useServerStore((s) => s.preferredMusicLibraryId);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const [hub, setHub] = useState<HubState>(emptyHub);
  const [loading, setLoading] = useState(true);
  const [mixBusy, setMixBusy] = useState(false);

  const load = useCallback(async () => {
    if (!session || !libraryId) {
      setHub(emptyHub);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [
        recentSpotlight,
        topArtists,
        recentAlbums,
        recentTracks,
        favourites
      ] = await Promise.all([
        fetchRecentArtists(session, libraryId, 14),
        fetchTopArtists(session, libraryId, 14),
        fetchRecentAlbums(session, libraryId, 12),
        fetchRecentTracks(session, libraryId, 16),
        fetchFavouriteAlbums(session, libraryId, 10)
      ]);
      setHub({
        recentSpotlight,
        topArtists,
        recentAlbums,
        recentTracks,
        favourites
      });
    } catch {
      setHub(emptyHub);
    } finally {
      setLoading(false);
    }
  }, [session, libraryId]);

  useEffect(() => {
    void load();
  }, [load]);

  const playRandomMix = async () => {
    if (!session || !libraryId) return;
    setMixBusy(true);
    try {
      const tracks = await fetchRandomTracks(session, libraryId, 28);
      if (!tracks.length) return;
      const q = tracks.map((t) => toQueueTrack(t));
      setQueue(q, 0);
      queueMicrotask(() => void getAudioElement()?.play());
    } finally {
      setMixBusy(false);
    }
  };

  const playRecentFrom = (startIndex: number) => {
    const tracks = hub.recentTracks;
    if (!tracks.length) return;
    const q = tracks.map((t) => toQueueTrack(t));
    setQueue(q, startIndex);
    queueMicrotask(() => void getAudioElement()?.play());
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  if (!session) return null;

  if (!libraryId) {
    return (
      <div className="space-y-8 pt-2 md:pt-6 max-w-lg">
        <header>
          <p className="text-sm text-zinc-500">{greeting}</p>
          <h1 className="font-display text-3xl md:text-4xl text-white mt-1">{session.userName}</h1>
        </header>
        <div className="rounded-3xl border border-white/10 bg-zinc-900/50 p-8 text-center space-y-4">
          <p className="text-zinc-300 text-sm leading-relaxed">
            Choose your music library in Settings so Symph can show your home feed and mixes.
          </p>
          <Link
            to="/settings"
            className="inline-flex rounded-2xl bg-white text-zinc-900 font-medium px-6 py-3 text-sm"
          >
            Open settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pt-2 md:pt-6 pb-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">{greeting}</p>
          <h1 className="font-display text-3xl md:text-4xl text-white mt-1">Home</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/library/${libraryId}`}
            className="text-xs uppercase tracking-widest text-zinc-500 hover:text-white transition"
          >
            Browse library
          </Link>
          <Link
            to="/settings"
            className="text-xs uppercase tracking-widest text-zinc-500 hover:text-white transition"
          >
            Settings
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => void playRandomMix()}
          disabled={mixBusy || loading}
          className="rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-indigo-950/80 to-zinc-950 p-6 text-left hover:border-indigo-400/50 transition disabled:opacity-50"
        >
          <div className="text-xs uppercase tracking-widest text-indigo-300/90">Mix</div>
          <div className="font-display text-2xl text-white mt-2">Random mix</div>
          <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
            Shuffle a fresh set of tracks from your library.
          </p>
          <div className="mt-4 text-sm text-indigo-200">{mixBusy ? "Building…" : "Play now →"}</div>
        </button>
        <Link
          to="/search"
          className="rounded-3xl border border-white/10 bg-zinc-900/40 p-6 hover:border-white/20 transition flex flex-col justify-between"
        >
          <div>
            <div className="text-xs uppercase tracking-widest text-zinc-500">Discover</div>
            <div className="font-display text-2xl text-white mt-2">Search</div>
            <p className="text-sm text-zinc-400 mt-2 leading-relaxed">Find albums, artists, and tracks.</p>
          </div>
          <div className="mt-4 text-sm text-zinc-300">Open search →</div>
        </Link>
      </section>

      {loading && <div className="text-sm text-zinc-500">Loading your library…</div>}

      {!loading && (
        <>
          <ItemRail
            title="Recently played"
            subtitle="Artists and albums you have returned to"
            items={hub.recentSpotlight}
            renderItem={(item) => <SpotlightCard key={item.Id} session={session} item={item} />}
          />
          <ItemRail
            title="Top artists"
            subtitle="Most played in this library"
            items={hub.topArtists}
            renderItem={(item) => (
              <Link
                key={item.Id}
                to={`/library/${item.Id}`}
                className="shrink-0 w-28 flex flex-col items-center gap-2 group"
              >
                <div className="size-24 rounded-full overflow-hidden border border-white/10 ring-2 ring-transparent group-hover:ring-indigo-400/40 transition">
                  <ArtworkImage
                    session={session}
                    itemId={item.Id}
                    item={item}
                    className="size-full object-cover"
                    alt=""
                    maxWidth={200}
                  />
                </div>
                <span className="text-xs text-zinc-300 text-center line-clamp-2 w-full">{item.Name}</span>
              </Link>
            )}
          />
          <ItemRail
            title="Recent albums"
            items={hub.recentAlbums}
            renderItem={(item) => (
              <Link key={item.Id} to={`/album/${item.Id}`} className="shrink-0 w-36 group">
                <div className="aspect-square rounded-2xl overflow-hidden border border-white/10">
                  <ArtworkImage
                    session={session}
                    itemId={item.Id}
                    item={item}
                    className="w-full h-full object-cover transition group-hover:scale-[1.03]"
                    alt=""
                    maxWidth={280}
                  />
                </div>
                <div className="mt-2 text-xs text-white font-medium line-clamp-2">{item.Name}</div>
                <div className="text-[11px] text-zinc-500 line-clamp-1">{artistName(item)}</div>
              </Link>
            )}
          />
          {hub.favourites.length > 0 && (
            <ItemRail
              title="Favourite albums"
              items={hub.favourites}
              renderItem={(item) => (
                <Link key={item.Id} to={`/album/${item.Id}`} className="shrink-0 w-36 group">
                  <div className="aspect-square rounded-2xl overflow-hidden border border-amber-400/20">
                    <ArtworkImage
                      session={session}
                      itemId={item.Id}
                      item={item}
                      className="w-full h-full object-cover transition group-hover:scale-[1.03]"
                      alt=""
                      maxWidth={280}
                    />
                  </div>
                  <div className="mt-2 text-xs text-white font-medium line-clamp-2">{item.Name}</div>
                </Link>
              )}
            />
          )}
          <section>
            <div className="flex items-baseline justify-between gap-4 mb-4">
              <div>
                <h2 className="text-sm uppercase tracking-widest text-zinc-500">Jump back in</h2>
                <p className="text-xs text-zinc-600 mt-1">Recent tracks — tap to play from here</p>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
              {hub.recentTracks.map((tr, i) => (
                <button
                  key={tr.Id}
                  type="button"
                  onClick={() => playRecentFrom(i)}
                  className="shrink-0 w-44 rounded-2xl border border-white/10 bg-zinc-900/50 overflow-hidden text-left hover:border-indigo-400/35 transition"
                >
                  <div className="aspect-square relative">
                    <ArtworkImage
                      session={session}
                      itemId={tr.ParentId ?? tr.Id}
                      item={tr}
                      className="w-full h-full object-cover"
                      alt=""
                      maxWidth={220}
                    />
                  </div>
                  <div className="p-2.5">
                    <div className="text-xs text-white font-medium line-clamp-2">{tr.Name}</div>
                    <div className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">{artistName(tr)}</div>
                    {tr.RunTimeTicks != null && (
                      <div className="text-[10px] text-zinc-600 mt-1 tabular-nums">
                        {formatDuration(ticksToSec(tr.RunTimeTicks))}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function ItemRail({
  title,
  subtitle,
  items,
  renderItem
}: {
  title: string;
  subtitle?: string;
  items: BaseItemDto[];
  renderItem: (item: BaseItemDto) => ReactNode;
}) {
  if (!items.length) return null;
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm uppercase tracking-widest text-zinc-500">{title}</h2>
        {subtitle && <p className="text-xs text-zinc-600 mt-1">{subtitle}</p>}
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">{items.map(renderItem)}</div>
    </section>
  );
}

function SpotlightCard({ session, item }: { session: import("@/jellyfin/types").JellyfinSession; item: BaseItemDto }) {
  if (item.Type === "MusicAlbum") {
    return (
      <Link to={`/album/${item.Id}`} className="shrink-0 w-36 group">
        <div className="aspect-square rounded-2xl overflow-hidden border border-white/10">
          <ArtworkImage
            session={session}
            itemId={item.Id}
            item={item}
            className="w-full h-full object-cover transition group-hover:scale-[1.03]"
            alt=""
            maxWidth={280}
          />
        </div>
        <div className="mt-2 text-xs text-white font-medium line-clamp-2">{item.Name}</div>
        <div className="text-[11px] text-zinc-500">Album</div>
      </Link>
    );
  }
  return (
    <Link to={`/library/${item.Id}`} className="shrink-0 w-28 flex flex-col items-center gap-2 group">
      <div className="size-24 rounded-full overflow-hidden border border-white/10">
        <ArtworkImage
          session={session}
          itemId={item.Id}
          item={item}
          className="size-full object-cover"
          alt=""
          maxWidth={200}
        />
      </div>
      <span className="text-xs text-zinc-300 text-center line-clamp-2 w-full">{item.Name}</span>
    </Link>
  );
}
