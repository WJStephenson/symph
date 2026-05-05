import { create } from "zustand";
import type { BaseItemDto } from "@/jellyfin/types";

export type QueueTrack = {
  id: string;
  title: string;
  artist: string;
  albumId?: string;
  albumTitle?: string;
  durationTicks?: number;
  raw?: BaseItemDto;
};

type PlayerState = {
  queue: QueueTrack[];
  index: number;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  volume: number;
  muted: boolean;
  isPlaying: boolean;
  positionSec: number;
  durationSec: number;
  artworkUrl: string | null;
  accent: string | null;
  setQueue: (tracks: QueueTrack[], startIndex?: number) => void;
  playIndex: (i: number) => void;
  next: () => void;
  prev: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setPlaybackMeta: (p: { positionSec: number; durationSec: number; isPlaying: boolean }) => void;
  setArtwork: (url: string | null) => void;
  setAccent: (hex: string | null) => void;
};

function randomIndex(length: number, avoid: number): number {
  if (length <= 1) return 0;
  let n = Math.floor(Math.random() * length);
  if (n === avoid) n = (n + 1) % length;
  return n;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  index: 0,
  shuffle: false,
  repeat: "off",
  volume: 0.9,
  muted: false,
  isPlaying: false,
  positionSec: 0,
  durationSec: 0,
  artworkUrl: null,
  accent: null,
  setQueue: (tracks, startIndex = 0) =>
    set({
      queue: tracks,
      index: Math.min(Math.max(0, startIndex), Math.max(0, tracks.length - 1)),
      positionSec: 0,
      durationSec: 0
    }),
  playIndex: (i) => {
    const { queue } = get();
    if (!queue.length) return;
    const next = ((i % queue.length) + queue.length) % queue.length;
    set({ index: next, positionSec: 0 });
  },
  next: () => {
    const { queue, index, repeat, shuffle } = get();
    if (!queue.length) return;
    if (repeat === "one") {
      set({ positionSec: 0 });
      return;
    }
    if (shuffle) {
      set({ index: randomIndex(queue.length, index), positionSec: 0 });
      return;
    }
    if (index < queue.length - 1) {
      set({ index: index + 1, positionSec: 0 });
      return;
    }
    if (repeat === "all") {
      set({ index: 0, positionSec: 0 });
      return;
    }
    set({ isPlaying: false, positionSec: 0 });
  },
  prev: () => {
    const { queue, index, positionSec } = get();
    if (!queue.length) return;
    if (positionSec > 3) {
      set({ positionSec: 0 });
      return;
    }
    if (index > 0) set({ index: index - 1, positionSec: 0 });
    else set({ index: queue.length - 1, positionSec: 0 });
  },
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  cycleRepeat: () =>
    set((s) => ({
      repeat: s.repeat === "off" ? "all" : s.repeat === "all" ? "one" : "off"
    })),
  setVolume: (v) => set({ volume: Math.min(1, Math.max(0, v)), muted: false }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  setPlaybackMeta: (p) => set(p),
  setArtwork: (url) => set({ artworkUrl: url }),
  setAccent: (hex) => set({ accent: hex })
}));
