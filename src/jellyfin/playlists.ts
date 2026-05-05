import type { BaseItemDto, ItemsResponse, JellyfinSession } from "./types";
import { buildHeaders, fetchItems, fetchUserViews, mediaApiUrl } from "./client";

export type PlaylistDto = {
  ItemIds?: string[];
};

export type CreatePlaylistResult = {
  Id?: string;
};

export async function fetchUserPlaylists(session: JellyfinSession): Promise<BaseItemDto[]> {
  const views = await fetchUserViews(session);
  const plRoot = views.find(
    (v) =>
      v.CollectionType?.toLowerCase() === "playlists" ||
      (v.Name?.toLowerCase().includes("playlist") ?? false)
  );
  if (plRoot) {
    const data = await fetchItems(session, {
      ParentId: plRoot.Id,
      Recursive: true,
      IncludeItemTypes: "Playlist",
      SortBy: "SortName",
      Limit: 500,
      Fields: "PrimaryImageAspectRatio,ImageTags"
    });
    return data.Items ?? [];
  }
  const data = await fetchItems(session, {
    Recursive: true,
    IncludeItemTypes: "Playlist",
    SortBy: "SortName",
    Limit: 500,
    Fields: "PrimaryImageAspectRatio,ImageTags"
  });
  return data.Items ?? [];
}

export async function createPlaylist(
  session: JellyfinSession,
  name: string,
  initialTrackIds: string[] = []
): Promise<string> {
  const url = new URL(`${session.serverUrl}/Playlists`);
  const body = {
    Name: name.trim(),
    UserId: session.userId,
    MediaType: "Audio",
    Ids: initialTrackIds
  };
  const res = await fetch(mediaApiUrl(session, url), {
    method: "POST",
    headers: {
      ...buildHeaders(session),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `Could not create playlist (${res.status})`);
  }
  const data = (await res.json()) as CreatePlaylistResult & { id?: string };
  const id = data.Id ?? data.id;
  if (!id) throw new Error("Playlist created but no id returned");
  return id;
}

export async function fetchPlaylistDto(session: JellyfinSession, playlistId: string): Promise<PlaylistDto> {
  const url = new URL(`${session.serverUrl}/Playlists/${playlistId}`);
  const res = await fetch(mediaApiUrl(session, url), { headers: buildHeaders(session) });
  if (!res.ok) throw new Error("Could not load playlist");
  return (await res.json()) as PlaylistDto;
}

export async function updatePlaylistName(
  session: JellyfinSession,
  playlistId: string,
  name: string
): Promise<void> {
  const dto = await fetchPlaylistDto(session, playlistId);
  const url = new URL(`${session.serverUrl}/Playlists/${playlistId}`);
  const body = {
    Name: name.trim(),
    Ids: dto.ItemIds ?? []
  };
  const res = await fetch(mediaApiUrl(session, url), {
    method: "POST",
    headers: {
      ...buildHeaders(session),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `Could not update playlist (${res.status})`);
  }
}

export async function deletePlaylistItem(session: JellyfinSession, playlistId: string): Promise<void> {
  const url = new URL(`${session.serverUrl}/Items/${playlistId}`);
  const res = await fetch(mediaApiUrl(session, url), {
    method: "DELETE",
    headers: buildHeaders(session)
  });
  if (!res.ok && res.status !== 204) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `Could not delete playlist (${res.status})`);
  }
}

export async function fetchPlaylistTracks(
  session: JellyfinSession,
  playlistId: string
): Promise<BaseItemDto[]> {
  const url = new URL(`${session.serverUrl}/Playlists/${playlistId}/Items`);
  url.searchParams.set("userId", session.userId);
  url.searchParams.set("Fields", "PrimaryImageAspectRatio,UserData,ImageTags");
  const res = await fetch(mediaApiUrl(session, url), { headers: buildHeaders(session) });
  if (!res.ok) throw new Error("Could not load playlist tracks");
  const data = (await res.json()) as ItemsResponse;
  return (data.Items ?? []) as BaseItemDto[];
}

export async function addTracksToPlaylist(
  session: JellyfinSession,
  playlistId: string,
  trackIds: string[]
): Promise<void> {
  if (!trackIds.length) return;
  const url = new URL(`${session.serverUrl}/Playlists/${playlistId}/Items`);
  for (const id of trackIds) {
    url.searchParams.append("ids", id);
  }
  const res = await fetch(mediaApiUrl(session, url), {
    method: "POST",
    headers: buildHeaders(session)
  });
  if (!res.ok && res.status !== 204) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `Could not add to playlist (${res.status})`);
  }
}

export async function removeTracksFromPlaylist(
  session: JellyfinSession,
  playlistId: string,
  playlistEntryIds: string[]
): Promise<void> {
  if (!playlistEntryIds.length) return;
  const url = new URL(`${session.serverUrl}/Playlists/${playlistId}/Items`);
  for (const id of playlistEntryIds) {
    url.searchParams.append("entryIds", id);
  }
  const res = await fetch(mediaApiUrl(session, url), {
    method: "DELETE",
    headers: buildHeaders(session)
  });
  if (!res.ok && res.status !== 204) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `Could not remove from playlist (${res.status})`);
  }
}
