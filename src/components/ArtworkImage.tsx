import { memo, useEffect, useState } from "react";
import { getArtworkObjectUrl, peekArtworkObjectUrl } from "@/jellyfin/artworkCache";
import type { JellyfinSession } from "@/jellyfin/types";

type Props = {
  session: JellyfinSession;
  itemId: string;
  className?: string;
  alt?: string;
  type?: "Primary" | "Backdrop";
  maxWidth?: number;
  onColour?: (hex: string) => void;
  priority?: boolean;
  skipColourAnalysis?: boolean;
};

export const ArtworkImage = memo(function ArtworkImage({
  session,
  itemId,
  className,
  alt,
  type = "Primary",
  maxWidth = 640,
  onColour,
  priority = false,
  skipColourAnalysis = false
}: Props) {
  const [url, setUrl] = useState<string | null>(() =>
    peekArtworkObjectUrl(session, itemId, { type, maxWidth })
  );

  useEffect(() => {
    const cached = peekArtworkObjectUrl(session, itemId, { type, maxWidth });
    if (cached) {
      setUrl(cached);
      return;
    }
    let cancelled = false;
    void (async () => {
      const blobUrl = await getArtworkObjectUrl(session, itemId, { type, maxWidth });
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
  }, [session, itemId, type, maxWidth, onColour, skipColourAnalysis]);

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
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "low"}
    />
  );
});
