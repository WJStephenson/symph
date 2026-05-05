import { Navigate, Route, Routes } from "react-router-dom";
import { ShellLayout } from "./layout/ShellLayout";
import { WelcomePage } from "./pages/WelcomePage";
import { HomeHubPage } from "./pages/HomeHubPage";
import { LibrariesPage } from "./pages/LibrariesPage";
import { LibraryBrowsePage } from "./pages/LibraryBrowsePage";
import { AlbumPage } from "./pages/AlbumPage";
import { SearchPage } from "./pages/SearchPage";
import { SettingsPage } from "./pages/SettingsPage";
import { useServerStore } from "./state/serverStore";

function App() {
  const connected = useServerStore((s) => s.session !== null);

  return (
    <Routes>
      <Route path="/welcome" element={<WelcomePage />} />
      <Route element={<ShellLayout />}>
        <Route
          path="/"
          element={connected ? <HomeHubPage /> : <Navigate to="/welcome" replace />}
        />
        <Route path="/libraries" element={<LibrariesPage />} />
        <Route path="/library/:parentId" element={<LibraryBrowsePage />} />
        <Route path="/album/:albumId" element={<AlbumPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
