import type { JellyfinSession } from "./types";

export function pageIsHttps(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.protocol === "https:";
}

export function migrateSessionToHttpsIfNeeded(session: JellyfinSession): JellyfinSession {
  if (!pageIsHttps()) return session;
  if (!session.serverUrl.startsWith("http://")) return session;
  return {
    ...session,
    serverUrl: `https://${session.serverUrl.slice("http://".length)}`
  };
}
