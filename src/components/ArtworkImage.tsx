import { memo, useEffect, useState } from "react";
import { fetchFirstDescendantWithPrimaryImage, fetchItem } from "@/jellyfin/client";
import { getArtworkObjectUrl, peekArtworkObjectUrl } from "@/jellyfin/artworkCache";
import type { BaseItemDto, JellyfinSession } from "@/jellyfin/types";
import { primaryImageKnownAbsent } from "@/lib/format";

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
      if (!meta) {
        try {
          meta = await fetchItem(session, itemId);
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
      setSource({ fetchId, hint });
    })();
    return () => {
      cancelled = true;
    };
  }, [session, itemId, item]);

  useEffect(() => {
    if (!source) return;
    const { fetchId, hint } = source;
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
      const blobUrl = await getArtworkObjectUrl(session, itemId, opts);
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
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, itemId, source, type, maxWidth, onColour, skipColourAnalysis]);

  if (!url) {
    return (
      <div
        className={
          className ??
          "rounded-3xl bg-gradient-to-br from-indigo-900/60 to-zinc-900 border border-white/10"
        }
      />
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
