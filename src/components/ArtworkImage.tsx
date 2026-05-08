import { memo, useEffect, useState } from "react";
import {
  fetchFirstDescendantWithPrimaryImage,
  fetchItem,
  resolveWorkingFallbackArtwork
} from "@/jellyfin/client";
import { getArtworkObjectUrl, peekArtworkObjectUrl } from "@/jellyfin/artworkCache";
import type { BaseItemDto, JellyfinSession } from "@/jellyfin/types";
import { artistName, primaryImageKnownAbsent } from "@/lib/format";

type Props = {
  session: JellyfinSession;
  itemId: string;
  item?: BaseItemDto;
  className?: string;
  alt?: string;
  type?: "Primary" | "Backdrop";
  maxWidth?: number;
  onColour?: (hex: string) => void;
  skipColourAnalysis?: boolean;
};

type ImageSource = {
  fetchId: string;
  hint?: BaseItemDto;
  meta?: BaseItemDto;
};

export const ArtworkImage = memo(function ArtworkImage({
  session,
  itemId,
  item,
  className,
  alt,
  type = "Primary",
  maxWidth = 640,
  onColour,
  skipColourAnalysis = false
}: Props) {
  const [source, setSource] = useState<ImageSource | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSource(null);
    setUrl(null);
    void (async () => {
      let meta = item?.Id === itemId ? item : undefined;
      if (meta) {
        const hasArtistId =
          (meta.AlbumArtists ?? []).some((a) => a.Id) ||
          (meta.Artists ?? []).some((a) => a.Id);
        if (
          !hasArtistId &&
          (meta.Type === "Audio" || meta.Type === "MusicAlbum")
        ) {
          try {
            meta = await fetchItem(
              session,
              itemId,
              "AlbumArtists,Artists,ParentId,Type,ImageTags"
            );
          } catch {}
        }
      } else {
        try {
          meta = await fetchItem(
            session,
            itemId,
            "AlbumArtists,Artists,ParentId,Type,ImageTags"
          );
        } catch {
          meta = undefined;
        }
      }
      if (cancelled) return;
      let fetchId = itemId;
      let hint: BaseItemDto | undefined = meta && meta.Id === itemId ? meta : undefined;
      if (meta?.Type === "MusicArtist" && primaryImageKnownAbsent(meta)) {
        const first = await fetchFirstDescendantWithPrimaryImage(session, itemId);
        if (cancelled) return;
        if (first) {
          fetchId = first.Id;
          hint = first;
        }
      }
      if (cancelled) return;
      setSource({ fetchId, hint, meta });
    })();
    return () => {
      cancelled = true;
    };
  }, [session, itemId, item]);

  useEffect(() => {
    if (!source) return;
    const { fetchId, hint, meta } = source;
    const opts = { type, maxWidth, item: hint, imageItemId: fetchId };
    const skipFetch = hint && hint.Id === fetchId ? primaryImageKnownAbsent(hint) : false;
    if (skipFetch) {
      setUrl(null);
      return;
    }
    const cached = peekArtworkObjectUrl(session, itemId, opts);
    if (cached) {
      setUrl(cached);
      return;
    }
    let cancelled = false;
    void (async () => {
      let blobUrl = await getArtworkObjectUrl(session, itemId, opts);
      if (!blobUrl && meta) {
        const fallback = await resolveWorkingFallbackArtwork(session, meta, fetchId);
        if (!cancelled && fallback) {
          blobUrl = await getArtworkObjectUrl(session, itemId, {
            type,
            maxWidth,
            item: fallback,
            imageItemId: fallback.Id
          });
        }
      }
      if (cancelled) return;
      setUrl(blobUrl);
      if (!blobUrl || skipColourAnalysis || !onColour || type !== "Primary") return;
      try {
        const res = await fetch(blobUrl);
        const blob = await res.blob();
        const bmp = await createImageBitmap(blob);
        const c = document.createElement("canvas");
        const w = 24;
        const h = 24;
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.drawImage(bmp, 0, 0, w, h);
          const { data } = ctx.getImageData(0, 0, w, h);
          let r = 0;
          let g = 0;
          let b = 0;
          let n = 0;
          for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            n++;
          }
          if (n) {
            r = Math.round((r / n) * 1.1);
            g = Math.round((g / n) * 1.1);
            b = Math.round((b / n) * 1.1);
            onColour(`rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`);
          }
        }
        bmp.close();
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [session, itemId, source, type, maxWidth, onColour, skipColourAnalysis]);

  const placeholderMeta = source?.meta ?? (item?.Id === itemId ? item : undefined);
  const placeholderLabel = placeholderMeta
    ? artistName(placeholderMeta)
    : (alt ?? "").trim();

  if (!url) {
    const shell =
      className ??
      "rounded-3xl bg-gradient-to-br from-indigo-900/60 to-zinc-900 border border-white/10";
    return (
      <div
        className={`${shell} flex min-h-0 min-w-0 items-center justify-center ${
          placeholderLabel ? "p-1.5" : ""
        }`}
      >
        {placeholderLabel ? (
          <span className="line-clamp-4 text-center text-[10px] font-medium leading-tight text-zinc-200">
            {placeholderLabel}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt ?? ""}
      className={className}
      loading="lazy"
      decoding="async"
      fetchPriority="low"
    />
  );
});
