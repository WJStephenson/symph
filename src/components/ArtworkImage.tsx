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

function ArtworkSwirl() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      <div
        className="absolute left-1/2 top-1/2 h-[220%] w-[220%] -translate-x-1/2 -translate-y-1/2 animate-[spin_12s_linear_infinite] opacity-95"
        style={{
          background:
            "conic-gradient(from 200deg at 50% 50%, #6366f1 0deg, #a855f7 55deg, #ec4899 110deg, #06b6d4 165deg, #22d3ee 220deg, #818cf8 275deg, #6366f1 360deg)"
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/40" />
    </div>
  );
}

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
  const [pipelineDone, setPipelineDone] = useState(false);
  const [decoded, setDecoded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSource(null);
    setUrl(null);
    setPipelineDone(false);
    setDecoded(false);
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
    if (!url) {
      setDecoded(false);
      return;
    }
    let cancelled = false;
    setDecoded(false);
    void (async () => {
      try {
        const img = new Image();
        img.src = url;
        if (img.decode) {
          await img.decode();
        } else {
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject();
          });
        }
      } catch {}
      if (!cancelled) setDecoded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    if (!source) return;
    const { fetchId, hint, meta } = source;
    const opts = { type, maxWidth, item: hint, imageItemId: fetchId };
    const skipFetch = hint && hint.Id === fetchId ? primaryImageKnownAbsent(hint) : false;
    if (skipFetch) {
      setUrl(null);
      setPipelineDone(true);
      return;
    }
    const cached = peekArtworkObjectUrl(session, itemId, opts);
    if (cached) {
      setUrl(cached);
      setPipelineDone(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      let blobUrl = await getArtworkObjectUrl(session, itemId, opts);
      if (!blobUrl) {
        const basis = meta ?? (item?.Id === itemId ? item : undefined);
        if (basis) {
          const fallback = await resolveWorkingFallbackArtwork(session, basis, fetchId);
          if (!cancelled && fallback) {
            blobUrl = await getArtworkObjectUrl(session, fallback.Id, {
              type,
              maxWidth,
              item: fallback,
              imageItemId: fallback.Id
            });
          }
        }
      }
      if (cancelled) return;
      setUrl(blobUrl);
      setPipelineDone(true);
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
  }, [session, itemId, source, type, maxWidth, onColour, skipColourAnalysis, item]);

  const placeholderMeta = source?.meta ?? (item?.Id === itemId ? item : undefined);
  const placeholderLabel = placeholderMeta
    ? artistName(placeholderMeta)
    : (alt ?? "").trim();

  const missing = pipelineDone && !url;
  const showSwirl = !pipelineDone || (url !== null && !decoded);

  if (url && decoded) {
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
  }

  const shell =
    className ??
    "rounded-3xl bg-gradient-to-br from-indigo-900/60 to-zinc-900 border border-white/10";
  return (
    <div
      className={`${shell} relative flex min-h-0 min-w-0 items-center justify-center overflow-hidden ${
        missing && placeholderLabel ? "p-1.5" : ""
      }`}
    >
      {showSwirl ? <ArtworkSwirl /> : null}
      {missing && placeholderLabel ? (
        <span className="relative z-10 line-clamp-4 text-center text-[10px] font-medium leading-tight text-zinc-200">
          {placeholderLabel}
        </span>
      ) : null}
    </div>
  );
});
