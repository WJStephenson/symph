import type { JellyfinSession } from "@/jellyfin/types";
import { fetchImageBlob } from "@/jellyfin/client";

const MAX_CACHED = 180;
const inFlight = new Map<string, Promise<string | null>>();
const resolved = new Map<string, string>();
const order: string[] = [];

function cacheKey(session: JellyfinSession, itemId: string, type: string, maxWidth: number): string {
  return `${session.serverUrl}|${itemId}|${type}|${maxWidth}`;
}

function touch(key: string): void {
  const i = order.indexOf(key);
  if (i >= 0) order.splice(i, 1);
  order.push(key);
  while (order.length > MAX_CACHED) {
    const evict = order.shift();
    if (!evict) break;
    const u = resolved.get(evict);
    if (u) {
      URL.revokeObjectURL(u);
      resolved.delete(evict);
    }
  }
}

export function getArtworkObjectUrl(
  session: JellyfinSession,
  itemId: string,
  options?: { type?: "Primary" | "Backdrop"; maxWidth?: number }
): Promise<string | null> {
  const type = options?.type ?? "Primary";
  const maxWidth = options?.maxWidth ?? 640;
  const key = cacheKey(session, itemId, type, maxWidth);
  const hit = resolved.get(key);
  if (hit) {
    touch(key);
    return Promise.resolve(hit);
  }
  let p = inFlight.get(key);
  if (!p) {
    p = (async () => {
      const blob = await fetchImageBlob(session, itemId, type, maxWidth);
      if (!blob) return null;
      const url = URL.createObjectURL(blob);
      resolved.set(key, url);
      touch(key);
      return url;
    })().finally(() => {
      inFlight.delete(key);
    });
    inFlight.set(key, p);
  }
  return p;
}

export function peekArtworkObjectUrl(
  session: JellyfinSession,
  itemId: string,
  options?: { type?: "Primary" | "Backdrop"; maxWidth?: number }
): string | null {
  const type = options?.type ?? "Primary";
  const maxWidth = options?.maxWidth ?? 640;
  const key = cacheKey(session, itemId, type, maxWidth);
  const u = resolved.get(key);
  if (u) touch(key);
  return u ?? null;
}
