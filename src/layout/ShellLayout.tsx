import type { CSSProperties, ReactElement } from "react";
import { useMemo, useState } from "react";
import { Navigate, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { PlaybackEngine } from "@/audio/PlaybackEngine";
import { NowPlayingSheet } from "@/components/NowPlayingSheet";
import { SymphMark } from "@/components/SymphMark";
import { accentTheme } from "@/lib/accentTheme";
import { startViewTransitionIfSupported } from "@/lib/viewTransition";
import { usePlayerStore } from "@/state/playerStore";
import { useServerStore } from "@/state/serverStore";

const tabs = [
  { to: "/", label: "Home", icon: HomeIcon },
  {
    to: "/libraries",
    label: "Library",
    icon: LibraryIcon,
    isActiveOverride: (p: string) => p === "/libraries" || p.startsWith("/library/")
  },
  { to: "/search", label: "Search", icon: SearchIcon },
  {
    to: "/playlists",
    label: "Lists",
    icon: PlaylistIcon,
    isActiveOverride: (p: string) => p.startsWith("/playlists")
  },
  { to: "/settings", label: "Settings", icon: SettingsIcon }
] as const;

const SIDEBAR_COLLAPSED = "4rem";

export function ShellLayout() {
  const session = useServerStore((s) => s.session);
  const navigate = useNavigate();
  const libraryId = useServerStore((s) => s.preferredMusicLibraryId);
  const queueLen = usePlayerStore((s) => s.queue.length);
  const accent = usePlayerStore((s) => s.accent);
  const theme = useMemo(() => accentTheme(accent), [accent]);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!session) {
    return <Navigate to="/welcome" replace />;
  }

  const showPlayer = queueLen > 0;

  const openSheet = () => {
    startViewTransitionIfSupported(() => setSheetOpen(true));
  };

  const closeSheet = () => {
    startViewTransitionIfSupported(() => setSheetOpen(false));
  };

  const expandGutter = "max(calc(1rem + var(--safe-top)), calc(1rem + var(--safe-bottom)), calc(4.25rem + var(--safe-bottom)))";

  const shellVars = {
    ["--symph-tone"]: theme.fill,
    ["--symph-accent"]: theme.fill,
    ["--symph-accent-border"]: `color-mix(in srgb, var(--symph-tone) 28%, transparent)`,
    ["--symph-accent-border-hover"]: `color-mix(in srgb, var(--symph-tone) 42%, transparent)`,
    ["--symph-sidebar-w"]: SIDEBAR_COLLAPSED,
    ["--symph-bottom-wash"]: [
      `radial-gradient(95% 55% at 50% 100%, color-mix(in srgb, var(--symph-tone) 18%, transparent) 0%, transparent 72%)`,
      `linear-gradient(180deg, transparent 0%, transparent 42%, color-mix(in srgb, var(--symph-tone) 10%, transparent) 100%)`
    ].join(", "),
    ["--symph-player-expand-top"]: expandGutter,
    ["--symph-player-expand-bottom"]: expandGutter
  } as CSSProperties;

  return (
    <div
      className="relative min-h-full md:pl-[var(--symph-sidebar-w)] symph-tone-transition"
      style={shellVars}
    >
      <div
        className="pointer-events-none fixed inset-0 z-0 symph-tone-transition md:left-[var(--symph-sidebar-w)]"
        style={{ background: "var(--symph-bottom-wash)" }}
        aria-hidden
      />
      <div
        className="relative z-[1] min-h-full flex flex-col pb-[calc(6rem+var(--safe-bottom))] md:pb-[calc(4.5rem+var(--safe-bottom))]"
        style={{ paddingTop: "var(--safe-top)" }}
      >
        <main className="flex-1 px-4 md:px-8 max-w-6xl mx-auto w-full pb-6">
          <Outlet />
        </main>
      </div>
      {showPlayer && (
        <div
          className={`fixed left-0 right-0 z-40 bottom-[calc(4.25rem+var(--safe-bottom))] md:bottom-[calc(1rem+var(--safe-bottom))] md:left-[calc(var(--symph-sidebar-w)+1rem)] px-3 md:px-8 flex flex-col justify-end min-h-0 pointer-events-none ${
            sheetOpen ? "top-[var(--symph-player-expand-top)]" : ""
          }`}
        >
          <div className={`pointer-events-auto min-h-0 ${sheetOpen ? "flex-1 flex flex-col justify-end" : ""}`}>
            <NowPlayingSheet open={sheetOpen} onOpen={openSheet} onClose={closeSheet} />
          </div>
        </div>
      )}
      {sheetOpen && (
        <button
          type="button"
          aria-label="Dismiss now playing"
          className="fixed inset-0 z-[35] bg-black/50 backdrop-blur-[1px] md:left-[var(--symph-sidebar-w)]"
          onClick={closeSheet}
        />
      )}
      <nav className="fixed bottom-0 inset-x-0 z-50 glass border-t border-white/10 pb-[calc(0.5rem+var(--safe-bottom))] pt-2 md:hidden">
        <div className="max-w-lg mx-auto flex justify-between items-end gap-0.5 px-1">
          {tabs.map((t) => (
            <Tab key={t.to} {...t} libraryId={libraryId} />
          ))}
        </div>
      </nav>
      <aside className="group/sidebar hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-30 w-16 hover:w-64 border-r border-white/10 bg-zinc-950/90 backdrop-blur-xl pt-[var(--safe-top)] transition-[width] duration-300 ease-out overflow-hidden">
        <button type="button" onClick={() => navigate("/")} className="mx-3 mt-4 mb-6 text-left shrink-0 w-full">
          <div className="flex justify-center group-hover/sidebar:justify-start">
            <SymphMark className="size-10 shrink-0" />
          </div>
          <div className="hidden group-hover/sidebar:block mt-2 pl-0.5">
            <div className="font-display text-xl tracking-tight text-white">Symph</div>
          </div>
        </button>
        <div className="flex flex-col gap-1 px-2 min-w-[16rem]">
          <SideLink to="/" label="Home" icon={HomeIcon} />
          <SideLink
            to="/libraries"
            label="Browse library"
            icon={LibraryIcon}
            isActiveOverride={(p) => p === "/libraries" || p.startsWith("/library/")}
          />
          <SideLink to="/search" label="Search" icon={SearchIcon} />
          <SideLink to="/playlists" label="Playlists" icon={PlaylistIcon} isActiveOverride={(p) => p.startsWith("/playlists")} />
          <SideLink to="/settings" label="Settings" icon={SettingsIcon} />
        </div>
        <div className="flex-1" />
      </aside>
      <PlaybackEngine />
    </div>
  );
}

function Tab({
  to,
  label,
  icon: Icon,
  isActiveOverride,
  libraryId
}: {
  to: string;
  label: string;
  icon: () => ReactElement;
  isActiveOverride?: (pathname: string) => boolean;
  libraryId: string | null;
}) {
  const { pathname } = useLocation();
  const resolvedTo = to === "/libraries" && libraryId ? `/library/${libraryId}` : to;
  return (
    <NavLink to={resolvedTo} end={to === "/"}>
      {({ isActive: navMatch }) => {
        const active = isActiveOverride ? isActiveOverride(pathname) : navMatch;
        return (
          <span
            className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xl text-[10px] leading-tight symph-tone-transition max-w-[4.25rem] ${
              active ? "text-white" : "text-zinc-500"
            }`}
            style={active ? ({ color: "var(--symph-accent, rgb(165, 180, 252))" } as CSSProperties) : undefined}
          >
            <Icon />
            <span className="truncate w-full text-center">{label}</span>
          </span>
        );
      }}
    </NavLink>
  );
}

function SideLink({
  to,
  label,
  icon: Icon,
  isActiveOverride
}: {
  to: string;
  label: string;
  icon: () => ReactElement;
  isActiveOverride?: (pathname: string) => boolean;
}) {
  const { pathname } = useLocation();
  return (
    <NavLink
      to={to}
      end={to === "/"}
      title={label}
      className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white/20"
    >
      {({ isActive: navActive }) => {
        const isActive = isActiveOverride ? isActiveOverride(pathname) : navActive;
        return (
          <span
            className={`flex items-center gap-3 rounded-xl text-sm symph-tone-transition overflow-hidden py-2 pl-2 pr-3 border ${
              isActive
                ? "bg-white/10 text-white border-[color:var(--symph-accent-border,rgba(129,140,248,0.28))]"
                : "text-zinc-400 hover:text-white hover:bg-white/5 border-transparent"
            }`}
            style={
              isActive ? ({ color: "var(--symph-accent, rgb(165, 180, 252))" } as CSSProperties) : undefined
            }
          >
            <span className="shrink-0 w-9 h-9 inline-flex items-center justify-center rounded-lg bg-white/5 text-current">
              <Icon />
            </span>
            <span className="whitespace-nowrap truncate min-w-0 md:max-w-0 md:opacity-0 md:group-hover/sidebar:max-w-[11rem] md:group-hover/sidebar:opacity-100 transition-[max-width,opacity] duration-300 ease-out">
              {label}
            </span>
          </span>
        );
      }}
    </NavLink>
  );
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="opacity-90">
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="opacity-90">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function LibraryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 6h16v14H4z" strokeLinejoin="round" />
      <path d="M8 10h8M8 14h5" strokeLinecap="round" />
    </svg>
  );
}

function PlaylistIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M8 6h13M8 12h13M8 18h13" strokeLinecap="round" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="3" />
      <path
        d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        strokeLinecap="round"
      />
    </svg>
  );
}
