import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchUserViews } from "@/jellyfin/client";
import type { BaseItemDto } from "@/jellyfin/types";
import { useServerStore } from "@/state/serverStore";

export function LibrariesPage() {
  const session = useServerStore((s) => s.session);
  const [items, setItems] = useState<BaseItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      try {
        const views = await fetchUserViews(session);
        if (cancelled) return;
        const music = views.filter(
          (v) =>
            v.CollectionType === "music" ||
            v.CollectionType === "musicvideos" ||
            (v.Name?.toLowerCase().includes("music") ?? false)
        );
        setItems(music.length ? music : views);
      } catch {
        if (!cancelled) setError("Libraries could not be loaded.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  if (!session) return null;

  return (
    <div className="space-y-8 pt-2 md:pt-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">{greeting}</p>
          <h1 className="font-display text-3xl md:text-4xl text-white mt-1">{session.userName}</h1>
        </div>
        <Link
          to="/settings"
          className="text-xs uppercase tracking-widest text-zinc-500 hover:text-white transition"
        >
          Settings
        </Link>
      </header>
      {error && <div className="text-rose-300 text-sm">{error}</div>}
      <section>
        <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-4">Libraries</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
          {items.map((lib) => (
            <Link
              key={lib.Id}
              to={`/library/${lib.Id}`}
              className="group rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/80 to-zinc-950 p-4 hover:border-indigo-400/40 transition overflow-hidden relative"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-indigo-500/10" />
              <div className="relative">
                <div className="text-lg font-medium text-white leading-snug">{lib.Name}</div>
                <div className="text-xs text-zinc-500 mt-2 capitalize">{lib.CollectionType ?? "library"}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
