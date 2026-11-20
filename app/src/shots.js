// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos
// loaded; ?shot=cover shows the cover alone, full bleed. `size`, `layout`,
// `grade`, `caption`, `sub`, `photo`, `photo2` and `photo3` pick the scene's
// details. window.__shotReady is set once the fonts are in and it is painted.

import { setPanelPhoto } from './state.js';

async function waitForFonts() {
  try {
    await Promise.all([
      document.fonts.load('100px "Anton"'),
      document.fonts.load('100px "Archivo Black"'),
      document.fonts.ready,
    ]);
  } catch { /* fonts fall back to the system stack */ }
}

function markReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

/** Fills the three panels from the query's photo names (sample file stems). */
async function fillPanels(app, query) {
  const names = [
    query.get('photo') ?? 'boulevard',
    query.get('photo2') ?? 'pier',
    query.get('photo3') ?? 'boulevard',
  ];
  for (let i = 0; i < 3; i += 1) {
    const photo = await app.loadSample(names[i]);
    setPanelPhoto(app.state.panels[i], photo, `${names[i]}.jpg`);
  }
}

export async function runShot(shot, query, app) {
  const { state } = app;
  state.size = query.get('size') ?? 'landscape';
  state.layout = query.get('layout') ?? 'split';
  state.grade = query.get('grade') ?? 'sunset';
  app.applyCaption(
    query.get('caption') ?? 'Neon Nights',
    query.get('sub') ?? 'A night on the boulevard',
  );
  await fillPanels(app, query);
  state.selected = 0;
  app.resizeCanvas();
  app.refreshPanels();
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await waitForFonts();
  app.redraw();
  markReady();
}
