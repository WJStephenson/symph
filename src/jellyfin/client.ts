import type { AuthResponse, BaseItemDto, ItemsResponse, JellyfinSession } from "./types";
import { primaryImageKnownAbsent } from "@/lib/format";
import { hostFromLooseServerInput, isLikelyLocalOrLanHost, pageIsHttps } from "./urlPolicy";

const CLIENT = "SymphWeb";
const CLIENT_VERSION = "0.1.0";

function normaliseServerUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed.startsWith("http")) {
    const host = hostFromLooseServerInput(trimmed);
    const scheme = isLikelyLocalOrLanHost(host) ? "http" : "https";
    return `${scheme}://${trimmed}`;
  }
  return trimmed;
}

function jellyfinHostname(session: JellyfinSession): string {
  try {
    return new URL(session.serverUrl).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function pageHostname(): string {
  if (typeof window === "undefined") return "";
  return window.location.hostname.toLowerCase();
}

export function mediaApiUrl(session: JellyfinSession, built: URL): string {
  const jellyHost = jellyfinHostname(session);
  const sameHost = jellyHost !== "" && jellyHost === pageHostname();
  if (pageIsHttps() && session.serverUrl.startsWith("http://") && sameHost) {
    return `${built.pathname}${built.search}`;
  }
  return built.toString();
}

function authHeader(token: string, deviceId?: string): string {
  const did = deviceId ?? "symph";
  return `MediaBrowser Client="${CLIENT}", Device="Web", DeviceId="${did}", Version="${CLIENT_VERSION}", Token="${token}"`;
}

export async function authenticate(
  serverUrl: string,
  username: string,
  password: string
): Promise<JellyfinSession> {
  const base = normaliseServerUrl(serverUrl);
  const deviceId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `symph-${Math.random().toString(36).slice(2)}`;
  const res = await fetch(`${base}/Users/AuthenticateByName`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader("", deviceId)
    },
    body: JSON.stringify({ Username: username, Pw: password })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Sign-in failed (${res.status})`);
  }
  const data = (await res.json()) as AuthResponse;
  const token = data.AccessToken;
  const userId = data.User?.Id;
  const userName = data.User?.Name ?? username;
  if (!token || !userId) {
    throw new Error("Unexpected sign-in response");
  }
  return { serverUrl: base, accessToken: token, userId, userName, deviceId };
}

export function buildHeaders(session: JellyfinSession): HeadersInit {
  return {
    Authorization: authHeader(session.accessToken, session.deviceId),
    "X-Emby-Token": session.accessToken
  };
}

export async function fetchUserViews(session: JellyfinSession): Promise<BaseItemDto[]> {
  const primary = new URL(`${session.serverUrl}/UserViews`);
  primary.searchParams.set("userId", session.userId);
  let res = await fetch(mediaApiUrl(session, primary), { headers: buildHeaders(session) });
  if (!res.ok && res.status === 404) {
    const legacy = new URL(`${session.serverUrl}/Users/${session.userId}/Views`);
    res = await fetch(mediaApiUrl(session, legacy), { headers: buildHeaders(session) });
  }
  if (!res.ok) throw new Error("Could not load libraries");
  const data = (await res.json()) as ItemsResponse;
  return data.Items ?? [];
}

export async function fetchItems(
  session: JellyfinSession,
  params: Record<string, string | number | boolean | undefined>
): Promise<ItemsResponse> {
  const url = new URL(`${session.serverUrl}/Users/${session.userId}/Items`);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(mediaApiUrl(session, url), { headers: buildHeaders(session) });
  if (!res.ok) throw new Error("Could not load items");
  return (await res.json()) as ItemsResponse;
}

export async function fetchItem(
  session: JellyfinSession,
  itemId: string,
  fields?: string
): Promise<BaseItemDto> {
  const url = new URL(`${session.serverUrl}/Users/${session.userId}/Items/${itemId}`);
  if (fields) url.searchParams.set("Fields", fields);
  const res = await fetch(mediaApiUrl(session, url), { headers: buildHeaders(session) });
  if (!res.ok) throw new Error("Could not load item");
  return (await res.json()) as BaseItemDto;
}

export async function fetchFirstDescendantWithPrimaryImage(
  session: JellyfinSession,
  artistId: string,
  maxScanned = 400
): Promise<BaseItemDto | null> {
  let start = 0;
  const limit = 100;
  while (start < maxScanned) {
    const data = await fetchItems(session, {
      ParentId: artistId,
      Recursive: true,
      IncludeItemTypes: "MusicAlbum,Audio",
      SortBy: "SortName",
      StartIndex: start,
      Limit: limit,
      Fields: "PrimaryImageAspectRatio,ImageTags"
    });
    const items = data.Items ?? [];
    for (const x of items) {
      if (x.ImageTags?.Primary) return x;
    }
    if (items.length < limit) break;
    start += items.length;
  }
  return null;
}

export async function fetchFirstDescendantWithWorkingPrimaryImage(
  session: JellyfinSession,
  artistId: string,
  excludeIds: string[],
  maxScanned = 400,
  probeMaxWidth = 96
): Promise<BaseItemDto | null> {
  const exclude = new Set(excludeIds);
  let start = 0;
  const limit = 100;
  while (start < maxScanned) {
    const data = await fetchItems(session, {
      ParentId: artistId,
      Recursive: true,
      IncludeItemTypes: "MusicAlbum,Audio",
      SortBy: "SortName",
      StartIndex: start,
      Limit: limit,
      Fields: "PrimaryImageAspectRatio,ImageTags"
    });
    const items = data.Items ?? [];
    for (const x of items) {
      if (exclude.has(x.Id)) continue;
      if (!x.ImageTags?.Primary) continue;
      const blob = await fetchImageBlob(session, x.Id, "Primary", probeMaxWidth, { item: x });
      if (blob) return x;
    }
    if (items.length < limit) break;
    start += items.length;
  }
  return null;
}

export async function resolveArtistIdsForMusicItem(
  session: JellyfinSession,
  meta: BaseItemDto,
  depth = 0
): Promise<string[]> {
  if (depth > 4) return [];
  const ids: string[] = [];
  for (const a of meta.AlbumArtists ?? []) {
    if (a.Id) ids.push(a.Id);
  }
  for (const a of meta.Artists ?? []) {
    if (a.Id && !ids.includes(a.Id)) ids.push(a.Id);
  }
  if (ids.length) return ids;
  if (meta.Type === "Audio" && meta.ParentId) {
    try {
      const parent = await fetchItem(session, meta.ParentId, "AlbumArtists,Artists,ParentId,Type");
      return resolveArtistIdsForMusicItem(session, parent, depth + 1);
    } catch {
      return [];
    }
  }
  if (meta.Type === "MusicAlbum" && meta.ParentId) {
    try {
      const parent = await fetchItem(session, meta.ParentId, "AlbumArtists,Artists,ParentId,Type");
      if (parent.Type === "MusicArtist") return [parent.Id];
      return resolveArtistIdsForMusicItem(session, parent, depth + 1);
    } catch {
      return [];
    }
  }
  return [];
}

export async function resolveWorkingFallbackArtwork(
  session: JellyfinSession,
  meta: BaseItemDto | undefined,
  failedFetchId: string
): Promise<BaseItemDto | null> {
  if (!meta?.Id) return null;
  if (meta.Type === "MusicArtist") {
    return fetchFirstDescendantWithWorkingPrimaryImage(session, meta.Id, [failedFetchId]);
  }
  const artistIds = await resolveArtistIdsForMusicItem(session, meta);
  for (const aid of artistIds) {
    const hit = await fetchFirstDescendantWithWorkingPrimaryImage(session, aid, [failedFetchId]);
    if (hit) return hit;
  }
  return null;
}

export async function fetchAlbumTracks(
  session: JellyfinSession,
  albumId: string
): Promise<BaseItemDto[]> {
  const data = await fetchItems(session, {
    ParentId: albumId,
    SortBy: "IndexNumber,SortName",
    Recursive: false,
    IncludeItemTypes: "Audio"
  });
  return data.Items ?? [];
}

export async function fetchAllAudioUnderParent(
  session: JellyfinSession,
  parentId: string,
  maxTracks = 400
): Promise<BaseItemDto[]> {
  const out: BaseItemDto[] = [];
  let start = 0;
  const limit = 120;
  while (out.length < maxTracks) {
    const data = await fetchItems(session, {
      ParentId: parentId,
      Recursive: true,
      IncludeItemTypes: "Audio",
      SortBy: "SortName",
      StartIndex: start,
      Limit: limit,
      Fields: "PrimaryImageAspectRatio,UserData"
    });
    const batch = data.Items ?? [];
    if (!batch.length) break;
    out.push(...batch);
    const total = data.TotalRecordCount ?? 0;
    start += batch.length;
    if (start >= total) break;
  }
  return out.slice(0, maxTracks);
}

export function streamUrl(session: JellyfinSession, itemId: string): string {
  const u = new URL(`${session.serverUrl}/Audio/${itemId}/universal`);
  u.searchParams.set("UserId", session.userId);
  u.searchParams.set("DeviceId", session.deviceId);
  u.searchParams.set("ApiKey", session.accessToken);
  u.searchParams.set("Static", "true");
  u.searchParams.set(
    "Container",
    "opus,webm|opus,mp3,aac,m4a|aac,flac|flac,ogg|vorbis,wav|PCM_S16LE"
  );
  return mediaApiUrl(session, u);
}

export async function fetchImageBlob(
  session: JellyfinSession,
  itemId: string,
  type: "Primary" | "Backdrop" = "Primary",
  maxWidth = 720,
  meta?: { item?: BaseItemDto }
): Promise<Blob | null> {
  const dto = meta?.item;
  if (dto && dto.Id === itemId && primaryImageKnownAbsent(dto)) {
    return null;
  }
  const url = new URL(`${session.serverUrl}/Items/${itemId}/Images/${type}`);
  url.searchParams.set("maxWidth", String(maxWidth));
  url.searchParams.set("quality", "90");
  const res = await fetch(mediaApiUrl(session, url), { headers: buildHeaders(session) });
  if (!res.ok) return null;
  return res.blob();
}

export async function reportPlaybackProgress(
  session: JellyfinSession,
  payload: {
    itemId: string;
    positionTicks: number;
    isPaused: boolean;
    volume: number;
  }
): Promise<void> {
  const body = {
    ItemId: payload.itemId,
    PositionTicks: Math.floor(payload.positionTicks),
    IsPaused: payload.isPaused,
    VolumeLevel: Math.round(payload.volume * 100),
    EventName: "timeupdate"
  };
  await fetch(
    mediaApiUrl(session, new URL(`${session.serverUrl}/Sessions/Playing/Progress`)),
    {
      method: "POST",
      headers: {
        ...buildHeaders(session),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  ).catch(() => undefined);
}

export async function reportPlaybackStarted(
  session: JellyfinSession,
  itemId: string,
  queueIds: string[]
): Promise<void> {
  const body = {
    ItemId: itemId,
    CanSeek: true,
    IsPaused: false,
    PositionTicks: 0,
    PlaylistIndex: Math.max(0, queueIds.indexOf(itemId)),
    PlaylistLength: queueIds.length,
    NowPlayingQueue: queueIds.map((id) => ({ Id: id }))
  };
  await fetch(mediaApiUrl(session, new URL(`${session.serverUrl}/Sessions/Playing`)), {
    method: "POST",
    headers: {
      ...buildHeaders(session),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  }).catch(() => undefined);
}

export async function reportPlaybackStopped(
  session: JellyfinSession,
  itemId: string,
  positionTicks: number
): Promise<void> {
  const body = {
    ItemId: itemId,
    PositionTicks: Math.floor(positionTicks)
  };
  await fetch(mediaApiUrl(session, new URL(`${session.serverUrl}/Sessions/Playing/Stopped`)), {
    method: "POST",
    headers: {
      ...buildHeaders(session),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  }).catch(() => undefined);
}
