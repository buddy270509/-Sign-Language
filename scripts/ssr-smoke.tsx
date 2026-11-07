/**
 * Headless render smoke test (no browser needed).
 *
 * Renders every route with react-dom/server and checks for expected content and the
 * accessibility basics (single h1, safety notice present). This catches render-time
 * crashes; it does not replace testing in a real browser.
 *
 *   npm run check:render
 */
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from '../src/components/layout/AppShell';
import { SettingsProvider } from '../src/store/settings';
import { HomePage } from '../src/pages/HomePage';
import { TextToSignPage } from '../src/pages/TextToSignPage';
import { CameraPage } from '../src/pages/CameraPage';
import { SettingsPage } from '../src/pages/SettingsPage';

const routes = [
  { path: '/', element: <HomePage />, expect: ['SignBridge', 'Communication should flow both ways'] },
  { path: '/text-to-sign', element: <TextToSignPage />, expect: ['Text to Sign', 'Sign sequence', 'Now signing'] },
  { path: '/camera', element: <CameraPage />, expect: ['Sign to Text', 'Lighting and framing tips'] },
  { path: '/settings', element: <SettingsPage />, expect: ['Settings', 'Privacy and data'] },
];

let failures = 0;

for (const route of routes) {
  const html = renderToString(
    <SettingsProvider>
      <MemoryRouter initialEntries={[route.path]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="*" element={route.element} />
          </Route>
        </Routes>
      </MemoryRouter>
    </SettingsProvider>,
  );

  const problems: string[] = [];
  for (const needle of route.expect) {
    if (!html.includes(needle)) problems.push(`missing "${needle}"`);
  }
  const h1Count = (html.match(/<h1/g) ?? []).length;
  if (h1Count !== 1) problems.push(`expected exactly one <h1>, found ${h1Count}`);
  if (!html.includes('does not replace a certified interpreter') && !html.includes('may make mistakes')) {
    problems.push('safety notice missing');
  }
  if (!html.includes('aria-label')) problems.push('no aria-labels rendered');

  if (problems.length) {
    failures += 1;
    console.error(`✗ ${route.path}: ${problems.join('; ')}`);
  } else {
    console.log(`✓ ${route.path} (${Math.round(html.length / 1024)} kB html)`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} route(s) failed the render smoke test.`);
  process.exit(1);
}
console.log('\nAll routes rendered.');
