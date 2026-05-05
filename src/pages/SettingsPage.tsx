import { useNavigate } from "react-router-dom";
import { useServerStore } from "@/state/serverStore";
import { usePlayerStore } from "@/state/playerStore";

export function SettingsPage() {
  const session = useServerStore((s) => s.session);
  const setSession = useServerStore((s) => s.setSession);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const navigate = useNavigate();

  const signOut = () => {
    setSession(null);
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
