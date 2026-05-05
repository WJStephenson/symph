import type { JellyfinSession } from "@/jellyfin/types";
import { streamUrl } from "@/jellyfin/client";

const peakCache = new Map<string, number[]>();

function normalisePeaks(raw: number[], target: number): number[] {
  if (raw.length === target) return raw;
  if (raw.length === 0) return Array.from({ length: target }, () => 0.08);
  const out: number[] = [];
  for (let i = 0; i < target; i++) {
    const t = (i / target) * raw.length;
    const j = Math.floor(t);
    const f = t - j;
    const a = raw[j] ?? 0;
    const b = raw[Math.min(j + 1, raw.length - 1)] ?? 0;
    out.push(a + (b - a) * f);
  }
  const m = Math.max(...out, 1e-4);
  return out.map((p) => Math.max(0.04, p / m));
}

export async function getWaveformPeaks(
  session: JellyfinSession,
  itemId: string,
  barCount = 200
): Promise<number[]> {
  const key = `${session.serverUrl}|${itemId}|${barCount}`;
  const hit = peakCache.get(key);
  if (hit) return hit;
  const url = streamUrl(session, itemId);
  let ctx: AudioContext | null = null;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("stream");
    const arr = await res.arrayBuffer();
    ctx = new AudioContext();
    const audioBuf = await ctx.decodeAudioData(arr.slice(0));
    const channels = audioBuf.numberOfChannels;
    const len = audioBuf.length;
    const rawSamples = 800;
    const block = Math.max(1, Math.floor(len / rawSamples));
    const raw: number[] = [];
    for (let i = 0; i < rawSamples; i++) {
      const start = i * block;
      const end = Math.min(len, start + block);
      let max = 0;
      for (let j = start; j < end; j++) {
        let s = 0;
        for (let c = 0; c < channels; c++) {
          s += Math.abs(audioBuf.getChannelData(c)[j] ?? 0);
        }
        max = Math.max(max, s / Math.max(1, channels));
      }
      raw.push(max);
    }
    const peaks = normalisePeaks(raw, barCount);
    peakCache.set(key, peaks);
    return peaks;
  } catch {
    const fallback = Array.from({ length: barCount }, (_, i) => {
      const t = i / barCount;
      return 0.15 + 0.55 * (0.5 + 0.5 * Math.sin(t * Math.PI * 6));
    });
    peakCache.set(key, fallback);
    return fallback;
  } finally {
    void ctx?.close();
  }
}

export function clearPeaksCacheForItem(itemId: string): void {
  const suffix = `|${itemId}|`;
  for (const k of peakCache.keys()) {
    if (k.includes(suffix)) peakCache.delete(k);
  }
}
