import type { JellyfinSession } from "./types";
import { fetchItems, fetchUserViews } from "./client";

export async function fetchMusicLibraryViews(session: JellyfinSession) {
  const views = await fetchUserViews(session);
  return views.filter(
    (v) =>
      v.CollectionType === "music" ||
      v.CollectionType === "musicvideos" ||
      (v.Name?.toLowerCase().includes("music") ?? false)
  );
}

export async function fetchRecentArtists(session: JellyfinSession, libraryId: string, limit = 16) {
  const r = await fetchItems(session, {
    ParentId: libraryId,
    Recursive: true,
    IncludeItemTypes: "MusicArtist",
    SortBy: "DatePlayed",
    SortOrder: "Descending",
    Limit: limit,
    Fields: "PrimaryImageAspectRatio,UserData"
  });
  const items = r.Items ?? [];
  if (items.length) return items;
  const alt = await fetchItems(session, {
    ParentId: libraryId,
    Recursive: true,
    IncludeItemTypes: "MusicAlbum",
    SortBy: "DatePlayed",
    SortOrder: "Descending",
    Limit: limit,
    Fields: "PrimaryImageAspectRatio,UserData"
  });
  return alt.Items ?? [];
}

export async function fetchTopArtists(session: JellyfinSession, libraryId: string, limit = 16) {
  const r = await fetchItems(session, {
    ParentId: libraryId,
    Recursive: true,
    IncludeItemTypes: "MusicArtist",
    SortBy: "PlayCount",
    SortOrder: "Descending",
    Limit: limit,
    Fields: "PrimaryImageAspectRatio,UserData"
  });
  return r.Items ?? [];
}

export async function fetchRecentAlbums(session: JellyfinSession, libraryId: string, limit = 14) {
  const r = await fetchItems(session, {
    ParentId: libraryId,
    Recursive: true,
    IncludeItemTypes: "MusicAlbum",
    SortBy: "DatePlayed",
    SortOrder: "Descending",
    Limit: limit,
    Fields: "PrimaryImageAspectRatio,UserData"
  });
  return r.Items ?? [];
}

export async function fetchRecentTracks(session: JellyfinSession, libraryId: string, limit = 20) {
  const r = await fetchItems(session, {
    ParentId: libraryId,
    Recursive: true,
    IncludeItemTypes: "Audio",
    SortBy: "DatePlayed",
    SortOrder: "Descending",
    Limit: limit,
    Fields: "PrimaryImageAspectRatio,UserData"
  });
  return r.Items ?? [];
}

export async function fetchRandomTracks(session: JellyfinSession, libraryId: string, limit = 28) {
  const r = await fetchItems(session, {
    ParentId: libraryId,
    Recursive: true,
    IncludeItemTypes: "Audio",
    SortBy: "Random",
    Limit: limit,
    Fields: "PrimaryImageAspectRatio,UserData"
  });
  const items = r.Items ?? [];
  if (items.length >= 8) return items;
  const pool = await fetchItems(session, {
    ParentId: libraryId,
    Recursive: true,
    IncludeItemTypes: "Audio",
    SortBy: "DateCreated",
    SortOrder: "Descending",
    Limit: 120,
    Fields: "PrimaryImageAspectRatio,UserData"
  });
  const all = pool.Items ?? [];
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, limit);
}

export async function fetchFavouriteAlbums(session: JellyfinSession, libraryId: string, limit = 12) {
  const r = await fetchItems(session, {
    ParentId: libraryId,
    Recursive: true,
    IncludeItemTypes: "MusicAlbum",
    Filters: "IsFavorite",
    SortBy: "SortName",
    Limit: limit,
    Fields: "PrimaryImageAspectRatio,UserData"
  });
  return r.Items ?? [];
}
