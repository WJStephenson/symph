import type { BaseItemDto } from "@/jellyfin/types";
import type { QueueTrack } from "@/state/playerStore";

export function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec % 60);
  const m = Math.floor(sec / 60) % 60;
  const h = Math.floor(sec / 3600);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

export function ticksToSec(ticks?: number): number {
  if (!ticks) return 0;
  return ticks / 10_000_000;
}

export function artistName(item: BaseItemDto): string {
  const fromAlbumArtists = item.AlbumArtists?.map((a) => a.Name).filter(Boolean).join(", ");
  if (fromAlbumArtists) return fromAlbumArtists;
  const fromArtists = item.Artists?.map((a) => a.Name).filter(Boolean).join(", ");
  if (fromArtists) return fromArtists;
  return item.AlbumArtist ?? "Unknown artist";
}

export function toQueueTrack(item: BaseItemDto, album?: BaseItemDto): QueueTrack {
  return {
    id: item.Id,
    title: item.Name ?? "Untitled",
    artist: artistName(item),
    albumId: album?.Id ?? item.ParentId,
    albumTitle: album?.Name,
    durationTicks: item.RunTimeTicks,
    raw: item
  };
}
