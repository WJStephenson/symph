import { useEffect, useRef } from "react";
import {
  fetchImageBlob,
  reportPlaybackProgress,
  reportPlaybackStarted,
  reportPlaybackStopped,
  streamUrl
} from "@/jellyfin/client";
import { ticksToSec } from "@/lib/format";
import { getArtworkObjectUrl } from "@/jellyfin/artworkCache";
import { getWaveformPeaks } from "@/audio/waveformPeaks";
import { usePlayerStore } from "@/state/playerStore";
import { useServerStore } from "@/state/serverStore";

let audioEl: HTMLAudioElement | null = null;

export function getAudioElement(): HTMLAudioElement | null {
  return audioEl;
}

export function PlaybackEngine() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const session = useServerStore((s) => s.session);
  const queue = usePlayerStore((s) => s.queue);
  const index = usePlayerStore((s) => s.index);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const artworkUrl = usePlayerStore((s) => s.artworkUrl);
  const setPlaybackMeta = usePlayerStore((s) => s.setPlaybackMeta);
  const setArtwork = usePlayerStore((s) => s.setArtwork);
  const setAccent = usePlayerStore((s) => s.setAccent);
  const setWaveformPeaks = usePlayerStore((s) => s.setWaveformPeaks);
  const next = usePlayerStore((s) => s.next);
  const artworkRevoke = useRef<string | null>(null);

  const track = queue[index];
  const trackId = track?.id;

  useEffect(() => {
    audioEl = audioRef.current;
    return () => {
      audioEl = null;
    };
  }, []);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = muted ? 0 : volume;
  }, [volume, muted]);

  useEffect(() => {
    if (!session || !queue.length) return;
    const n = queue.length;
    const prefetch = (i: number) => {
      if (i < 0 || i >= n) return;
      const id = queue[i].albumId ?? queue[i].id;
      void getArtworkObjectUrl(session, id, { maxWidth: 96 });
    };
    prefetch(index - 1);
    prefetch(index + 1);
    prefetch(index + 2);
    prefetch(index + 3);
  }, [session, queue, index]);

  useEffect(() => {
    if (!session || !track) {
      if (artworkRevoke.current) {
        URL.revokeObjectURL(artworkRevoke.current);
        artworkRevoke.current = null;
      }
      setArtwork(null);
      setAccent(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const id = track.albumId ?? track.id;
      const blob = await fetchImageBlob(session, id, "Primary", 900);
      if (cancelled) return;
      if (artworkRevoke.current) {
        URL.revokeObjectURL(artworkRevoke.current);
        artworkRevoke.current = null;
      }
      if (!blob) {
        setArtwork(null);
        setAccent(null);
        return;
      }
      const u = URL.createObjectURL(blob);
      artworkRevoke.current = u;
      setArtwork(u);
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
            r = Math.round((r / n) * 1.12);
            g = Math.round((g / n) * 1.12);
            b = Math.round((b / n) * 1.12);
            setAccent(`rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`);
          }
        }
        bmp.close();
      } catch {
        setAccent(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, track, setArtwork, setAccent]);

  useEffect(() => {
    if (!session || !trackId) {
      setWaveformPeaks(null);
      return;
    }
    let cancelled = false;
    setWaveformPeaks(null);
    void (async () => {
      const peaks = await getWaveformPeaks(session, trackId, 220);
      if (!cancelled) setWaveformPeaks(peaks);
    })();
    return () => {
      cancelled = true;
    };
  }, [session, trackId, setWaveformPeaks]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !session || !trackId) return;
    const url = streamUrl(session, trackId);
    const startTicks = track?.raw?.UserData?.PlaybackPositionTicks;
    el.src = url;
    el.load();
    if (startTicks) {
      const onMetaOnce = () => {
        el.currentTime = ticksToSec(startTicks);
      };
      el.addEventListener("loadedmetadata", onMetaOnce, { once: true });
    }
    const onMeta = () => {
      setPlaybackMeta({
        positionSec: el.currentTime,
        durationSec: el.duration || 0,
        isPlaying: !el.paused
      });
    };
    const onTime = () => {
      const pos = el.currentTime;
      const dur = el.duration || 0;
      const prev = usePlayerStore.getState();
      if (Math.abs(prev.positionSec - pos) < 0.25 && Math.abs(prev.durationSec - dur) < 0.01) return;
      setPlaybackMeta({
        positionSec: pos,
        durationSec: dur,
        isPlaying: !el.paused
      });
    };
    const onPlay = () => {
      setPlaybackMeta({
        positionSec: el.currentTime,
        durationSec: el.duration || 0,
        isPlaying: true
      });
    };
    const onPause = () => {
      setPlaybackMeta({
        positionSec: el.currentTime,
        durationSec: el.duration || 0,
        isPlaying: false
      });
    };
    const onEnded = () => next();
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("durationchange", onMeta);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("durationchange", onMeta);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
    };
  }, [session, trackId, track?.raw?.UserData?.PlaybackPositionTicks, next, setPlaybackMeta]);

  useEffect(() => {
    const s = session;
    const id = trackId;
    if (!s || !id || !queue.length) return;
    const ids = queue.map((q) => q.id);
    void reportPlaybackStarted(s, id, ids);
    return () => {
      const el = audioRef.current;
      const ticks = (el?.currentTime ?? 0) * 10_000_000;
      void reportPlaybackStopped(s, id, ticks);
    };
  }, [session, trackId, queue]);

  useEffect(() => {
    if (!session || !trackId) return;
    const el = audioRef.current;
    if (!el) return;
    const t = window.setInterval(() => {
      const vol = muted ? 0 : volume;
      void reportPlaybackProgress(session, {
        itemId: trackId,
        positionTicks: el.currentTime * 10_000_000,
        isPaused: el.paused,
        volume: vol
      });
    }, 12_000);
    return () => window.clearInterval(t);
  }, [session, trackId, volume, muted]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !track) return;
    if ("mediaSession" in navigator) {
      const md: MediaMetadataInit = {
        title: track.title,
        artist: track.artist,
        album: track.albumTitle ?? ""
      };
      if (artworkUrl) {
        md.artwork = [{ src: artworkUrl, sizes: "512x512", type: "image/jpeg" }];
      }
      navigator.mediaSession.metadata = new MediaMetadata(md);
      navigator.mediaSession.setActionHandler("play", () => void el.play());
      navigator.mediaSession.setActionHandler("pause", () => el.pause());
      navigator.mediaSession.setActionHandler("previoustrack", () =>
        usePlayerStore.getState().prev()
      );
      navigator.mediaSession.setActionHandler("nexttrack", () => usePlayerStore.getState().next());
    }
  }, [track, artworkUrl]);

  return <audio ref={audioRef} playsInline className="hidden" crossOrigin="anonymous" />;
}
