import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { fetchItems } from "@/jellyfin/client";
import type { BaseItemDto } from "@/jellyfin/types";
import { AddToPlaylistButton } from "@/components/AddToPlaylistModal";
import { ArtworkImage } from "@/components/ArtworkImage";
import { artistName } from "@/lib/format";
import { accentTheme } from "@/lib/accentTheme";
import { selectNowPlayingTrackId, usePlayerStore } from "@/state/playerStore";
import { useServerStore } from "@/state/serverStore";

export function SearchPage() {
  const session = useServerStore((s) => s.session);
  const location = useLocation();
  const accent = usePlayerStore((s) => s.accent);
  const nowPlayingId = usePlayerStore(selectNowPlayingTrackId);
  const theme = useMemo(() => accentTheme(accent), [accent]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<BaseItemDto[]>([]);
  const [busy, setBusy] = useState(false);

  const trimmed = useMemo(() => q.trim(), [q]);

  useEffect(() => {
    if (!session || trimmed.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      (async () => {
        setBusy(true);
        try {
          const res = await fetchItems(session, {
            SearchTerm: trimmed,
            Recursive: true,
            IncludeItemTypes: "MusicAlbum,Audio,MusicArtist",
            Limit: 40,
            Fields: "PrimaryImageAspectRatio,UserData,ImageTags"
          });
          if (!cancelled) setResults(res.Items ?? []);
        } catch {
          if (!cancelled) setResults([]);
        } finally {
          if (!cancelled) setBusy(false);
        }
      })();
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [session, trimmed]);

  useLayoutEffect(() => {
    if (location.pathname !== "/search") return;
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [location.pathname, location.key]);

  if (!session) return null;

  return (
    <div className="space-y-6 pt-2 md:pt-6">
      <h1 className="font-display text-3xl text-white">Search</h1>
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Albums, tracks, artists"
        className="w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3 text-sm outline-none focus:border-indigo-400/60"
      />
      {busy && <div className="text-xs text-zinc-500">Searching…</div>}
      <div className="space-y-2">
        {results.map((item) => {
          if (item.Type === "MusicAlbum") {
            return (
              <Link
                key={item.Id}
                to={`/album/${item.Id}`}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/40 p-3 hover:border-indigo-400/40 transition"
              >
                <div className="size-12 rounded-xl overflow-hidden border border-white/10 shrink-0">
                  <ArtworkImage
                    session={session}
                    itemId={item.Id}
                    item={item}
                    className="size-full object-cover"
                    alt=""
                    maxWidth={160}
                  />
                </div>
                <div className="min-w-0 flex-1">
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
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/40 p-3 hover:border-indigo-400/40 transition"
              >
                <div className="size-12 rounded-xl overflow-hidden border border-white/10 shrink-0">
                  <ArtworkImage
                    session={session}
                    itemId={item.Id}
                    item={item}
                    className="size-full object-cover"
                    alt=""
                    maxWidth={160}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white font-medium truncate">{item.Name}</div>
                  <div className="text-xs text-zinc-500 truncate">Artist</div>
                </div>
              </Link>
            );
          }
          if (item.Type === "Audio") {
            const isActive = item.Id === nowPlayingId;
            return (
              <div
                key={item.Id}
                className={`flex items-center gap-2 rounded-2xl border bg-zinc-900/40 p-2 pl-3 transition-colors ${
                  isActive ? "bg-white/[0.07]" : "border-white/10 hover:border-indigo-400/40"
                }`}
                style={isActive ? { borderColor: theme.fill } : undefined}
              >
                <Link
                  to={item.ParentId ? `/album/${item.ParentId}` : "/libraries"}
                  className="flex flex-1 min-w-0 items-center gap-3 py-1"
                >
                  <div className="size-12 rounded-xl overflow-hidden border border-white/10 shrink-0">
                    <ArtworkImage
                      session={session}
                      itemId={item.ParentId ?? item.Id}
                      item={item}
                      className="size-full object-cover"
                      alt=""
                      maxWidth={160}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white font-medium truncate">{item.Name}</div>
                    <div className="text-xs text-zinc-500 truncate">{artistName(item)}</div>
                  </div>
                </Link>
                <AddToPlaylistButton session={session} trackIds={[item.Id]} variant="icon" />
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
