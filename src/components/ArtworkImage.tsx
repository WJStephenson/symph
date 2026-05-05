import { useEffect, useState } from "react";
import { fetchImageBlob } from "@/jellyfin/client";
import type { JellyfinSession } from "@/jellyfin/types";

type Props = {
  session: JellyfinSession;
  itemId: string;
  className?: string;
  alt?: string;
  type?: "Primary" | "Backdrop";
  maxWidth?: number;
  onColour?: (hex: string) => void;
};

export function ArtworkImage({
  session,
  itemId,
  className,
  alt,
  type = "Primary",
  maxWidth = 640,
  onColour
}: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;
    (async () => {
      const blob = await fetchImageBlob(session, itemId, type, maxWidth);
      if (cancelled) return;
      if (!blob) {
        setUrl(null);
        return;
      }
      const u = URL.createObjectURL(blob);
      revoked = u;
      setUrl(u);
      if (onColour && type === "Primary") {
        try {
          const bmp = await createImageBitmap(blob);
          const c = document.createElement("canvas");
          const w = 32;
          const h = 32;
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
      }
    })();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [session, itemId, type, maxWidth, onColour]);

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

  return <img src={url} alt={alt ?? ""} className={className} loading="lazy" decoding="async" />;
}
