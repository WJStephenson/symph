import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchItems } from "@/jellyfin/client";
import type { BaseItemDto } from "@/jellyfin/types";
import { ArtworkImage } from "@/components/ArtworkImage";
import { artistName } from "@/lib/format";
import { useServerStore } from "@/state/serverStore";

export function SearchPage() {
  const session = useServerStore((s) => s.session);
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

  if (!session) return null;

  return (
    <div className="space-y-6 pt-2 md:pt-6">
      <h1 className="font-display text-3xl text-white">Search</h1>
      <input
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
            return (
              <Link
                key={item.Id}
                to={item.ParentId ? `/album/${item.ParentId}` : "/libraries"}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/40 p-3 hover:border-indigo-400/40 transition"
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
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
