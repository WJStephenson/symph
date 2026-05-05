import type { JellyfinSession } from "./types";

export function pageIsHttps(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.protocol === "https:";
}

export function hostFromLooseServerInput(trimmed: string): string {
  const first = trimmed.split("/")[0] ?? trimmed;
  return first.split(":")[0]?.toLowerCase() ?? "";
}

export function isLikelyLocalOrLanHost(hostname: string): boolean {
  if (!hostname) return false;
  if (hostname === "localhost") return true;
  if (hostname === "127.0.0.1") return true;
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true;
  return false;
}

function jellyfinHostname(serverUrl: string): string | null {
  try {
    return new URL(serverUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function migrateSessionToHttpsIfNeeded(session: JellyfinSession): JellyfinSession {
  if (!pageIsHttps()) return session;
  if (!session.serverUrl.startsWith("http://")) return session;
  const host = jellyfinHostname(session.serverUrl);
  if (host && isLikelyLocalOrLanHost(host)) {
    return session;
  }
  return {
    ...session,
    serverUrl: `https://${session.serverUrl.slice("http://".length)}`
  };
}

export function reconcileSessionServerUrlForBrowser(session: JellyfinSession): JellyfinSession {
  try {
    const u = new URL(session.serverUrl);
    if (u.protocol === "https:" && isLikelyLocalOrLanHost(u.hostname)) {
      u.protocol = "http:";
      return migrateSessionToHttpsIfNeeded({ ...session, serverUrl: u.origin });
    }
  } catch {
    /* ignore */
  }
  return migrateSessionToHttpsIfNeeded(session);
}
