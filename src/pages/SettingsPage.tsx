import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useServerStore } from "@/state/serverStore";
import { usePlayerStore } from "@/state/playerStore";
import { fetchMusicLibraryViews } from "@/jellyfin/musicHome";
import { fetchUserViews } from "@/jellyfin/client";
import type { BaseItemDto } from "@/jellyfin/types";

export function SettingsPage() {
  const session = useServerStore((s) => s.session);
  const preferredMusicLibraryId = useServerStore((s) => s.preferredMusicLibraryId);
  const setPreferredMusicLibraryId = useServerStore((s) => s.setPreferredMusicLibraryId);
  const setSession = useServerStore((s) => s.setSession);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const navigate = useNavigate();
  const [libraries, setLibraries] = useState<BaseItemDto[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    try {
      const legacy = localStorage.getItem("symph-preferred-library");
      if (legacy && !useServerStore.getState().preferredMusicLibraryId) {
        setPreferredMusicLibraryId(legacy);
        localStorage.removeItem("symph-preferred-library");
      }
    } catch {
      /* ignore */
    }
  }, [setPreferredMusicLibraryId]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      try {
        const libs = await fetchMusicLibraryViews(session);
        if (cancelled) return;
        if (libs.length) setLibraries(libs);
        else {
          const all = await fetchUserViews(session);
          if (!cancelled) setLibraries(all);
        }
      } catch {
        if (!cancelled) setLoadErr("Could not load libraries.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const signOut = () => {
    setSession(null);
    setPreferredMusicLibraryId(null);
    setQueue([], 0);
    navigate("/welcome", { replace: true });
  };

  if (!session) return null;

  return (
    <div className="space-y-8 pt-2 md:pt-6 max-w-xl">
      <h1 className="font-display text-3xl text-white">Settings</h1>
      <div className="rounded-3xl border border-white/10 bg-zinc-900/40 p-6 space-y-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-500">Signed in as</div>
          <div className="text-lg text-white mt-1">{session.userName}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-500">Server</div>
          <div className="text-sm text-zinc-300 mt-1 break-all">{session.serverUrl}</div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-zinc-900/40 p-6 space-y-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-500">Music library</div>
          <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
            Symph uses this library for Home, mixes, and discovery. You can still open any folder from Browse library on Home.
          </p>
        </div>
        {loadErr && <div className="text-sm text-rose-300">{loadErr}</div>}
        <div className="space-y-2">
          {libraries.map((lib) => (
            <label
              key={lib.Id}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 cursor-pointer transition ${
                preferredMusicLibraryId === lib.Id
                  ? "border-indigo-400/50 bg-indigo-500/10"
                  : "border-white/10 hover:border-white/20 bg-black/20"
              }`}
            >
              <input
                type="radio"
                name="music-lib"
                className="accent-indigo-400"
                checked={preferredMusicLibraryId === lib.Id}
                onChange={() => setPreferredMusicLibraryId(lib.Id)}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white font-medium">{lib.Name}</div>
                <div className="text-xs text-zinc-500 capitalize">{lib.CollectionType ?? "library"}</div>
              </div>
            </label>
          ))}
        </div>
        {libraries.length === 0 && !loadErr && (
          <p className="text-sm text-zinc-500">No music libraries found on this server.</p>
        )}
      </div>

      <div className="rounded-3xl border border-white/10 bg-zinc-900/40 p-6">
        <button
          type="button"
          onClick={signOut}
          className="w-full rounded-2xl border border-rose-400/40 text-rose-200 py-3 text-sm hover:bg-rose-500/10 transition"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
