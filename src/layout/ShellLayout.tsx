import type { CSSProperties, ReactElement } from "react";
import { useMemo, useState } from "react";
import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { PlaybackEngine } from "@/audio/PlaybackEngine";
import { MiniPlayerBar } from "@/components/MiniPlayerBar";
import { NowPlayingSheet } from "@/components/NowPlayingSheet";
import { accentTheme } from "@/lib/accentTheme";
import { usePlayerStore } from "@/state/playerStore";
import { useServerStore } from "@/state/serverStore";

const tabs = [
  { to: "/", label: "Home", icon: HomeIcon },
  { to: "/search", label: "Search", icon: SearchIcon },
  { to: "/settings", label: "More", icon: MoreIcon }
];

export function ShellLayout() {
  const session = useServerStore((s) => s.session);
  const navigate = useNavigate();
  const queueLen = usePlayerStore((s) => s.queue.length);
  const accent = usePlayerStore((s) => s.accent);
  const theme = useMemo(() => accentTheme(accent), [accent]);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!session) {
    return <Navigate to="/welcome" replace />;
  }

  const showPlayer = queueLen > 0;

  return (
    <div
      className="relative min-h-full md:pl-64"
      style={
        {
          ["--symph-accent"]: theme.fill,
          ["--symph-accent-border"]: theme.softBorder,
          ["--symph-accent-border-hover"]: theme.softBorderHover
        } as CSSProperties
      }
    >
      <div
        className="pointer-events-none fixed inset-0 z-0 md:left-64"
        style={{ background: theme.bottomGradient }}
        aria-hidden
      />
      <div
        className="relative z-[1] min-h-full flex flex-col pb-[calc(5.5rem+var(--safe-bottom))] md:pb-[calc(4.5rem+var(--safe-bottom))]"
        style={{ paddingTop: "var(--safe-top)" }}
      >
        <main className="flex-1 px-4 md:px-8 max-w-6xl mx-auto w-full pb-6">
          <Outlet />
        </main>
      </div>
      {showPlayer && (
        <MiniPlayerBar
          onExpand={() => setSheetOpen(true)}
          className="fixed left-0 right-0 z-40 bottom-[calc(4.25rem+var(--safe-bottom))] md:bottom-[calc(1rem+var(--safe-bottom))] md:left-[calc(16rem+1rem)] px-3 md:px-8"
        />
      )}
      <nav className="fixed bottom-0 inset-x-0 z-50 glass border-t border-white/10 pb-[calc(0.5rem+var(--safe-bottom))] pt-2 md:hidden">
        <div className="max-w-lg mx-auto flex justify-around items-end">
          {tabs.map((t) => (
            <Tab key={t.to} {...t} />
          ))}
        </div>
      </nav>
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 border-r border-white/10 bg-zinc-950/90 backdrop-blur-xl pt-[var(--safe-top)] z-30">
        <button type="button" onClick={() => navigate("/")} className="mx-4 mt-4 mb-6 text-left">
          <div className="font-display text-xl tracking-tight text-white">Symph</div>
          <div className="text-xs text-zinc-500">Jellyfin music</div>
        </button>
        <div className="flex flex-col gap-1 px-3">
          <SideLink to="/" label="Home" />
          <SideLink to="/libraries" label="Browse library" />
          <SideLink to="/search" label="Search" />
          <SideLink to="/playlists" label="Playlists" />
          <SideLink to="/settings" label="Settings" />
        </div>
        <div className="flex-1" />
      </aside>
      <PlaybackEngine />
      <NowPlayingSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  );
}

function Tab({
  to,
  label,
  icon: Icon
}: {
  to: string;
  label: string;
  icon: () => ReactElement;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 px-4 py-1 rounded-xl text-[11px] ${
          isActive ? "text-white" : "text-zinc-500"
        }`
      }
      style={({ isActive }) =>
        isActive ? ({ color: "var(--symph-accent, rgb(165, 180, 252))" } as CSSProperties) : undefined
      }
    >
      <Icon />
      {label}
    </NavLink>
  );
}

function SideLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-3 py-2 rounded-xl text-sm ${
          isActive
            ? "bg-white/10 text-white border border-[color:var(--symph-accent-border,rgba(129,140,248,0.28))]"
            : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
        }`
      }
      style={({ isActive }) =>
        isActive ? ({ color: "var(--symph-accent, rgb(165, 180, 252))" } as CSSProperties) : undefined
      }
    >
      {label}
    </NavLink>
  );
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="opacity-90">
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="opacity-90">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="opacity-90">
      <circle cx="6" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="18" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}
