import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { authenticate } from "@/jellyfin/client";
import { useServerStore } from "@/state/serverStore";

export function WelcomePage() {
  const navigate = useNavigate();
  const setSession = useServerStore((s) => s.setSession);
  const [server, setServer] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await authenticate(server, username, password);
      setSession(session);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-16 bg-gradient-to-b from-indigo-950/40 via-zinc-950 to-zinc-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="font-display text-4xl text-white tracking-tight">Symph</div>
          <p className="text-zinc-400 mt-2 text-sm leading-relaxed">
            A calm, modern Jellyfin music experience for desktop and mobile. Sign in to your server to
            begin.
          </p>
        </div>
        <form onSubmit={onSubmit} className="rounded-3xl border border-white/10 bg-zinc-900/40 p-6 space-y-4 backdrop-blur-xl">
          <label className="block text-xs text-zinc-500 uppercase tracking-wider">Server URL</label>
          <input
            value={server}
            onChange={(e) => setServer(e.target.value)}
            placeholder="https://jellyfin.example.com"
            required
            className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-sm outline-none focus:border-indigo-400/60"
          />
          <label className="block text-xs text-zinc-500 uppercase tracking-wider">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-sm outline-none focus:border-indigo-400/60"
          />
          <label className="block text-xs text-zinc-500 uppercase tracking-wider">Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-sm outline-none focus:border-indigo-400/60"
          />
          {error && <div className="text-sm text-rose-300">{error}</div>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-white text-zinc-900 font-medium py-3 text-sm disabled:opacity-50"
          >
            {busy ? "Connecting…" : "Continue"}
          </button>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Your credentials stay on this device. Streaming uses your Jellyfin session. If your server uses a
            self-signed certificate, ensure you trust it in the browser first.
          </p>
        </form>
      </div>
    </div>
  );
}
