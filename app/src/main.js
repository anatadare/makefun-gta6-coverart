// Boots the app: builds the state, sizes the preview canvas, draws the cover,
// and wires the editor. A `?shot=` query sets up a fixed scene for a
// screenshot instead (./shots.js). window.coverStudio exposes the export for
// automation: exportPng('landscape') returns the cover as a PNG data URL.

import { drawCover } from './cover.js';
import { drawSelection, initEditor } from './editor.js';
import { runShot } from './shots.js';
import { SIZES, createState, setPanelPhoto } from './state.js';

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const state = createState();

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${url}`));
    img.src = url;
  });
}

const app = {
  state,
  canvas,
  loadSample: (name) => loadImage(`samples/${name}.jpg`),
  setStatus: (text) => { status.textContent = text; },

  resizeCanvas() {
    const size = SIZES[state.size];
    canvas.width = size.width;
    canvas.height = size.height;
    document.getElementById('size-label').textContent = `${size.width} x ${size.height}`;
  },

  redraw() {
    drawCover(ctx, state, canvas.width, canvas.height);
    if (!document.body.classList.contains('shot-cover')) {
      drawSelection(ctx, state, canvas.width, canvas.height);
    }
  },

  applyCaption(text, sub) {
    state.caption.text = text;
    state.caption.sub = sub;
    document.getElementById('caption-text').value = text;
    document.getElementById('caption-sub').value = sub;
  },

  async loadDemoCover() {
    const boulevard = await app.loadSample('boulevard');
    const pier = await app.loadSample('pier');
    setPanelPhoto(state.panels[0], boulevard, 'boulevard.jpg');
    setPanelPhoto(state.panels[1], pier, 'pier.jpg');
    setPanelPhoto(state.panels[2], boulevard, 'boulevard.jpg');
    app.applyCaption('Neon Nights', 'A night on the boulevard');
    state.layout = 'split';
    state.grade = 'sunset';
    state.size = 'landscape';
    state.selected = 0;
    app.resizeCanvas();
    app.refreshPanels();
    app.redraw();
  },

  /** Draws the cover at a size and returns it as a PNG data URL. */
  exportPng(sizeKey) {
    const size = SIZES[sizeKey] ?? SIZES[state.size];
    const off = document.createElement('canvas');
    off.width = size.width;
    off.height = size.height;
    drawCover(off.getContext('2d'), state, size.width, size.height);
    return off.toDataURL('image/png');
  },

  /** Downloads the cover at the editor's current size as a PNG file. */
  async exportCurrent() {
    const size = SIZES[state.size];
    const off = document.createElement('canvas');
    off.width = size.width;
    off.height = size.height;
    drawCover(off.getContext('2d'), state, size.width, size.height);
    const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
    const name = `neon-cover-${size.width}x${size.height}.png`;
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(anchor.href), 60_000);
    return name;
  },
};

window.coverStudio = app;

initEditor(app);
app.resizeCanvas();

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
let ready;
if (shot) {
  ready = runShot(shot, query, app);
} else {
  ready = (async () => {
    try {
      await Promise.all([
        document.fonts.load('100px "Anton"'),
        document.fonts.load('100px "Archivo Black"'),
      ]);
    } catch { /* fonts fall back to the system stack */ }
    await app.loadDemoCover();
  })();
}
ready.then(() => app.redraw());
