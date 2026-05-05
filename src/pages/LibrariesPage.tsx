import { Navigate } from "react-router-dom";
import { useServerStore } from "@/state/serverStore";

export function LibrariesPage() {
  const libraryId = useServerStore((s) => s.preferredMusicLibraryId);
  if (libraryId) {
    return <Navigate to={`/library/${libraryId}`} replace />;
  }
  return <Navigate to="/settings" replace />;
}
