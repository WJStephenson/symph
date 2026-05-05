import type { BaseItemDto, JellyfinSession } from "@/jellyfin/types";
import { fetchImageBlob } from "@/jellyfin/client";

const MAX_CACHED = 180;
const inFlight = new Map<string, Promise<string | null>>();
const resolved = new Map<string, string>();
const order: string[] = [];

function cacheKey(
  session: JellyfinSession,
  imageItemId: string,
  type: string,
  maxWidth: number
): string {
  return `${session.serverUrl}|${imageItemId}|${type}|${maxWidth}`;
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

export type ArtworkFetchOptions = {
  type?: "Primary" | "Backdrop";
  maxWidth?: number;
  item?: BaseItemDto;
  imageItemId?: string;
};

export function getArtworkObjectUrl(
  session: JellyfinSession,
  itemId: string,
  options?: ArtworkFetchOptions
): Promise<string | null> {
  const type = options?.type ?? "Primary";
  const maxWidth = options?.maxWidth ?? 640;
  const fetchId = options?.imageItemId ?? itemId;
  const key = cacheKey(session, fetchId, type, maxWidth);
  const hit = resolved.get(key);
  if (hit) {
    touch(key);
    return Promise.resolve(hit);
  }
  let p = inFlight.get(key);
  if (!p) {
    p = (async () => {
      const metaItem =
        options?.item && options.item.Id === fetchId ? options.item : undefined;
      const blob = await fetchImageBlob(session, fetchId, type, maxWidth, { item: metaItem });
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
  options?: ArtworkFetchOptions
): string | null {
  const type = options?.type ?? "Primary";
  const maxWidth = options?.maxWidth ?? 640;
  const fetchId = options?.imageItemId ?? itemId;
  const key = cacheKey(session, fetchId, type, maxWidth);
  const u = resolved.get(key);
  if (u) touch(key);
  return u ?? null;
}
