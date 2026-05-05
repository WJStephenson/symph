import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { JellyfinSession } from "@/jellyfin/types";

type ServerState = {
  session: JellyfinSession | null;
  setSession: (s: JellyfinSession | null) => void;
};

export const useServerStore = create<ServerState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (s) => set({ session: s })
    }),
    { name: "symph-server" }
  )
);
