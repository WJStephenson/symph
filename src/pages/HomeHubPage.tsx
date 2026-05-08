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
import { AddToPlaylistButton } from "@/components/AddToPlaylistModal";
import { artistName, formatDuration, ticksToSec, toQueueTrack } from "@/lib/format";
import { accentTheme } from "@/lib/accentTheme";
import { getAudioElement } from "@/audio/audioRef";
import { selectNowPlayingTrackId, usePlayerStore } from "@/state/playerStore";
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
  const accent = usePlayerStore((s) => s.accent);
  const nowPlayingId = usePlayerStore(selectNowPlayingTrackId);
  const mixTheme = useMemo(() => accentTheme(accent), [accent]);
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

  if (!session) return null;

  if (!libraryId) {
    return (
      <div className="space-y-8 pt-2 md:pt-6 max-w-lg">
        <header>
          <h1 className="font-display text-3xl md:text-4xl text-white">{session.userName}</h1>
        </header>
        <div className="rounded-3xl border border-white/10 bg-zinc-900/50 p-8 text-center">
          <p className="text-zinc-300 text-sm leading-relaxed">
            Choose your music library in Settings so Symph can show your home feed and mixes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pt-2 md:pt-6 pb-4">
      <header>
        <h1 className="font-display text-3xl md:text-4xl text-white">Home</h1>
      </header>

      <div className="flex md:hidden gap-2">
        <button
          type="button"
          onClick={() => void playRandomMix()}
          disabled={mixBusy || loading}
          aria-label="Random mix"
          className="flex-1 flex items-center justify-center rounded-2xl border border-[color:var(--symph-accent-border,rgba(129,140,248,0.28))] bg-zinc-900/60 py-3.5 disabled:opacity-40 active:scale-[0.98] transition"
          style={{ boxShadow: `0 0 24px -8px ${mixTheme.fill}` }}
        >
          <DiceIcon className="text-white" />
        </button>
        <Link
          to="/search"
          aria-label="Search"
          className="flex-1 flex items-center justify-center rounded-2xl border border-white/15 bg-zinc-900/50 py-3.5 active:scale-[0.98] transition"
        >
          <SearchGlyph className="text-zinc-200" />
        </Link>
      </div>

      <section className="hidden md:grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => void playRandomMix()}
          disabled={mixBusy || loading}
          className="rounded-3xl border border-[color:var(--symph-accent-border,rgba(129,140,248,0.28))] hover:border-[color:var(--symph-accent-border-hover,rgba(129,140,248,0.42))] p-6 text-left transition disabled:opacity-50"
          style={{
            background: mixTheme.mixCardBg
          }}
        >
          <div className="text-xs uppercase tracking-widest" style={{ color: mixTheme.mixCardLabel }}>
            Mix
          </div>
          <div className="font-display text-2xl text-white mt-2">Random mix</div>
          <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
            Shuffle a fresh set of tracks from your library.
          </p>
          <div className="mt-4 text-sm" style={{ color: mixTheme.mixCardCta }}>
            {mixBusy ? "Building…" : "Play now →"}
          </div>
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
                <div className="size-24 rounded-full overflow-hidden border border-white/10 ring-2 ring-transparent group-hover:ring-[color:var(--symph-accent-border,rgba(129,140,248,0.42))] transition">
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
              {hub.recentTracks.map((tr, i) => {
                const isActive = tr.Id === nowPlayingId;
                return (
                  <div
                    key={tr.Id}
                    className={`shrink-0 w-44 rounded-2xl border bg-zinc-900/50 overflow-hidden transition-colors relative ${
                      isActive ? "bg-white/[0.07]" : "border-white/10 hover:border-indigo-400/35"
                    }`}
                    style={isActive ? { borderColor: mixTheme.fill } : undefined}
                  >
                  <button
                    type="button"
                    onClick={() => playRecentFrom(i)}
                    className="w-full text-left"
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
                  <div className="absolute top-2 right-2 z-10">
                    <AddToPlaylistButton
                      session={session}
                      trackIds={[tr.Id]}
                      variant="icon"
                      className="bg-black/50 border-white/20 backdrop-blur-sm"
                    />
                  </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function DiceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65">
      <rect x="4" y="4" width="16" height="16" rx="3" strokeLinejoin="round" />
      <circle cx="9" cy="9" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="15" cy="9" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="9" cy="15" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="15" cy="15" r="1.35" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SearchGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16.5 16.5 4 4" strokeLinecap="round" />
    </svg>
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
