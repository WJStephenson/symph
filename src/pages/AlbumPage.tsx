import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchAlbumTracks, fetchItem } from "@/jellyfin/client";
import type { BaseItemDto } from "@/jellyfin/types";
import { AddToPlaylistButton } from "@/components/AddToPlaylistModal";
import { ArtworkImage } from "@/components/ArtworkImage";
import { getAudioElement } from "@/audio/audioRef";
import { artistName, formatDuration, ticksToSec, toQueueTrack } from "@/lib/format";
import { usePlayerStore } from "@/state/playerStore";
import { useServerStore } from "@/state/serverStore";

export function AlbumPage() {
  const { albumId } = useParams();
  const session = useServerStore((s) => s.session);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const [album, setAlbum] = useState<BaseItemDto | null>(null);
  const [tracks, setTracks] = useState<BaseItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !albumId) return;
    let cancelled = false;
    (async () => {
      try {
        const [a, t] = await Promise.all([fetchItem(session, albumId), fetchAlbumTracks(session, albumId)]);
        if (cancelled) return;
        setAlbum(a);
        setTracks(t);
      } catch {
        if (!cancelled) setError("Could not load this album.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, albumId]);

  if (!session || !albumId) return null;

  const playAll = (start = 0) => {
    if (!album) return;
    const q = tracks.map((tr) => toQueueTrack(tr, album));
    setQueue(q, start);
    queueMicrotask(() => {
      void getAudioElement()?.play();
    });
  };

  return (
    <div className="space-y-8 pt-2 md:pt-6">
      <Link to="/libraries" className="text-sm text-zinc-500 hover:text-white">
        ← Libraries
      </Link>
      {error && <div className="text-rose-300 text-sm">{error}</div>}
      {album && (
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,320px)_1fr] gap-8 items-start">
          <div className="mx-auto w-full max-w-xs md:max-w-none">
            <div className="rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl ring-1 ring-white/10 aspect-square">
              <ArtworkImage
                session={session}
                itemId={album.Id}
                item={album}
                className="w-full h-full object-cover"
                alt=""
                maxWidth={720}
              />
            </div>
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => playAll(0)}
                className="flex-1 rounded-2xl bg-white text-zinc-900 font-medium py-3 text-sm"
              >
                Play
              </button>
              <button
                type="button"
                onClick={() => playAll(Math.floor(Math.random() * Math.max(1, tracks.length)))}
                className="flex-1 rounded-2xl border border-white/15 text-white py-3 text-sm hover:bg-white/5"
              >
                Shuffle
              </button>
              <AddToPlaylistButton
                session={session}
                trackIds={tracks.map((t) => t.Id)}
                className="flex-1 rounded-2xl border border-white/15 py-3 text-sm"
              />
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-3xl md:text-4xl text-white leading-tight">{album.Name}</h1>
            <p className="text-zinc-400 mt-2">{artistName(album)}</p>
            {album.ProductionYear && (
              <p className="text-sm text-zinc-500 mt-1">{album.ProductionYear}</p>
            )}
            <div className="mt-8 rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
              {tracks.map((tr, i) => {
                const dur = tr.RunTimeTicks ? formatDuration(ticksToSec(tr.RunTimeTicks)) : "";
                const resume = tr.UserData?.PlaybackPositionTicks
                  ? formatDuration(ticksToSec(tr.UserData.PlaybackPositionTicks))
                  : null;
                return (
                  <div
                    key={tr.Id}
                    className="flex items-stretch gap-1 hover:bg-white/5 transition group"
                  >
                    <button
                      type="button"
                      onClick={() => playAll(i)}
                      className="flex flex-1 min-w-0 items-center gap-4 px-4 py-3 text-left"
                    >
                      <div className="text-xs text-zinc-500 w-6 tabular-nums shrink-0">
                        {tr.IndexNumber ?? i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">{tr.Name}</div>
                        <div className="text-xs text-zinc-500 truncate">{artistName(tr)}</div>
                      </div>
                      <div className="text-xs text-zinc-500 tabular-nums shrink-0 flex flex-col items-end">
                        <span>{dur}</span>
                        {resume && <span className="text-indigo-300/90">{resume}</span>}
                      </div>
                    </button>
                    <div className="flex items-center pr-2 shrink-0">
                      <AddToPlaylistButton session={session} trackIds={[tr.Id]} variant="icon" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
