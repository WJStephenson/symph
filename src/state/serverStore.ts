import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { JellyfinSession } from "@/jellyfin/types";

type ServerState = {
  session: JellyfinSession | null;
  preferredMusicLibraryId: string | null;
  setSession: (s: JellyfinSession | null) => void;
  setPreferredMusicLibraryId: (id: string | null) => void;
};

export const useServerStore = create<ServerState>()(
  persist(
    (set) => ({
      session: null,
      preferredMusicLibraryId: null,
      setSession: (s) => set({ session: s }),
      setPreferredMusicLibraryId: (id) => set({ preferredMusicLibraryId: id })
    }),
    { name: "symph-server" }
  )
);
