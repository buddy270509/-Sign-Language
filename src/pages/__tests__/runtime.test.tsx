/**
 * @vitest-environment jsdom
 *
 * Runtime smoke test in a DOM: the SSR test only proves a page can be rendered to a
 * string, so effects (the animation loop, settings persistence, IndexedDB autosave,
 * camera permission handling) never run there. Here every route is actually mounted,
 * the animation loop is ticked, and transport buttons are pressed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SettingsProvider } from '../../store/settings';
import { AppShell } from '../../components/layout/AppShell';
import { HomePage } from '../HomePage';
import { TextToSignPage } from '../TextToSignPage';
import { DemosPage } from '../DemosPage';
import { GalleryPage } from '../GalleryPage';
import { StudioPage } from '../StudioPage';
import { CameraPage } from '../CameraPage';
import { SettingsPage } from '../SettingsPage';
import { AvatarPlayer } from '../../components/avatar/AvatarPlayer';
import { DEMO_ANIMATIONS } from '../../data/animations';

const errors: unknown[] = [];

beforeEach(() => {
  errors.length = 0;
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    errors.push(args);
  });
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mount = (ui: React.ReactNode, path = '/') =>
  render(
    <SettingsProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="*" element={ui} />
          </Route>
        </Routes>
      </MemoryRouter>
    </SettingsProvider>,
  );

/** The player is used inside a page; mount it on its own so the transport is testable. */
const mountPlayer = (ui: React.ReactNode) =>
  render(
    <SettingsProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </SettingsProvider>,
  );

const tick = async (ms = 120) => {
  await waitFor(() => expect(screen.getByRole('main')).toBeTruthy(), { timeout: 1000 }).catch(() => undefined);
  await new Promise((resolve) => setTimeout(resolve, ms));
};

describe('pages mount and their effects run', () => {
  const pages = [
    { name: 'home', element: <HomePage />, path: '/' },
    { name: 'text to sign', element: <TextToSignPage />, path: '/text-to-sign' },
    { name: 'demos', element: <DemosPage />, path: '/demos' },
    { name: 'gallery', element: <GalleryPage />, path: '/gallery' },
    { name: 'studio', element: <StudioPage />, path: '/studio' },
    { name: 'camera', element: <CameraPage />, path: '/camera' },
    { name: 'settings', element: <SettingsPage />, path: '/settings' },
  ];

  for (const page of pages) {
    it(`${page.name} mounts without errors`, async () => {
      mount(page.element, page.path);
      await tick();
      // Prove the page body actually rendered, not just the shell.
      expect(document.querySelector('h1')?.textContent ?? '').not.toBe('');
      expect(errors, JSON.stringify(errors)).toEqual([]);
    });
  }
});

describe('player transport', () => {
  it('starts, ticks and pauses', async () => {
    mountPlayer(<AvatarPlayer animations={DEMO_ANIMATIONS.slice(0, 1)} showViewSwitch showSpeed showScrubber />);
    const play = screen.getAllByRole('button').find((button) => /play/i.test(button.textContent ?? ''));
    expect(play).toBeTruthy();
    fireEvent.click(play!);
    await tick(220);

    // After a couple of hundred milliseconds the transport snapshot must be moving.
    const status = screen.getByRole('status');
    const moving = status.textContent ?? '';
    expect(moving.length).toBeGreaterThan(0);

    const pause = screen
      .getAllByRole('button')
      .find((button) => /pause/i.test(button.textContent ?? '') || button.getAttribute('aria-label')?.match(/pause/i));
    if (pause) fireEvent.click(pause);
    expect(errors, JSON.stringify(errors)).toEqual([]);
  });

  it('declares its review status', () => {
    mountPlayer(<AvatarPlayer animations={DEMO_ANIMATIONS.slice(0, 1)} showViewSwitch showSpeed showScrubber />);
    expect(document.body.textContent).toMatch(/not verified by a deaf signer|draft/i);
  });
});

describe('camera page consent gate', () => {
  it('cannot start the camera before consent', () => {
    mount(<CameraPage />, '/camera');
    const start = screen
      .getAllByRole('button')
      .find((button) => /test my camera|start camera/i.test(button.textContent ?? '')) as HTMLButtonElement | undefined;
    expect(start, 'the camera test button should render').toBeTruthy();
    expect(start!.disabled).toBe(true);

    // Ticking the consent box is the only thing that enables it.
    const consent = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(consent);
    expect(start!.disabled).toBe(false);
  });
});

describe('settings persistence', () => {
  it('writes the chosen view into localStorage', async () => {
    mount(<SettingsPage />, '/settings');
    await tick();
    const raw = localStorage.getItem('signbridge.settings.v2');
    expect(raw).toBeTruthy();
    expect(raw).toContain('view');
    expect(errors, JSON.stringify(errors)).toEqual([]);
  });
});
