import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SettingsProvider } from './store/settings';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { TextToSignPage } from './pages/TextToSignPage';
import { DemosPage } from './pages/DemosPage';
import { GalleryPage } from './pages/GalleryPage';
import { StudioPage } from './pages/StudioPage';
import { CameraPage } from './pages/CameraPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="text-to-sign" element={<TextToSignPage />} />
            <Route path="demos" element={<DemosPage />} />
            <Route path="gallery" element={<GalleryPage />} />
            <Route path="studio" element={<StudioPage />} />
            <Route path="camera" element={<CameraPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SettingsProvider>
  );
}
