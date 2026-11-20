// Wires the editor page: panel cards with uploads and samples, drag-to-pan and
// wheel-to-zoom on the preview, and every layout, grade, caption and size
// control. It never draws the cover itself; it updates the state and asks the
// app to redraw (see main.js).

import { layoutPanels } from './cover.js';
import { CAPTION_COLORS, GRADES, LAYOUTS, SAMPLES, SIZES, setPanelPhoto, spreadPhotoToAllPanels } from './state.js';

const PANEL_TITLES = ['Hero panel', 'Panel 2', 'Panel 3'];

/** Reads an image file from the user's machine into an Image, locally only. */
export function readFileAsImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('That file is not a readable image.'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

/** Builds one panel card: thumbnail, upload and sample buttons, zoom slider. */
function buildPanelCard(app, index) {
  const card = document.createElement('article');
  card.className = 'panel-card';
  card.dataset.index = String(index);
  card.innerHTML = `
    <button type="button" class="panel-pick" aria-label="Edit ${PANEL_TITLES[index]}">
      <span class="thumb"><span class="thumb-empty">+</span></span>
      <span class="panel-meta"><strong>${PANEL_TITLES[index]}</strong><span class="photo-name">No photo yet</span></span>
    </button>
    <div class="panel-actions">
      <label class="btn small">Upload photo<input type="file" accept="image/*" hidden></label>
      ${SAMPLES.map((s) => `<button type="button" class="btn small ghost" data-sample="${s.name}">${s.label}</button>`).join('')}
      <button type="button" class="btn small ghost" data-spread>Use for all panels</button>
    </div>
    <label class="zoom-row">Zoom <input type="range" min="1" max="4" step="0.05" value="1" aria-label="Zoom ${PANEL_TITLES[index]}"></label>
  `;
  const { state } = app;
  card.querySelector('.panel-pick').addEventListener('click', () => {
    state.selected = index;
    app.refreshSelection();
    app.redraw();
  });
  card.querySelector('input[type="file"]').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const photo = await readFileAsImage(file);
      setPanelPhoto(state.panels[index], photo, file.name);
      state.selected = index;
      app.refreshPanels();
      app.redraw();
    } catch (err) {
      app.setStatus(err.message);
    }
    event.target.value = '';
  });
  card.querySelectorAll('[data-sample]').forEach((button) => {
    button.addEventListener('click', async () => {
      const name = button.dataset.sample;
      const photo = await app.loadSample(name);
      setPanelPhoto(state.panels[index], photo, `${name}.jpg`);
      state.selected = index;
      app.refreshPanels();
      app.redraw();
    });
  });
  card.querySelector('[data-spread]').addEventListener('click', () => {
    spreadPhotoToAllPanels(state, index);
    app.refreshPanels();
    app.redraw();
  });
  card.querySelector('input[type="range"]').addEventListener('input', (event) => {
    state.panels[index].zoom = Number(event.target.value);
    app.redraw();
  });
  return card;
}

/** Refreshes the panel cards' thumbnails, names and zoom sliders from the state. */
function refreshPanelCards(app, cards) {
  app.state.panels.forEach((panel, i) => {
    const card = cards[i];
    const thumb = card.querySelector('.thumb');
    const name = card.querySelector('.photo-name');
    if (panel.photo) {
      thumb.innerHTML = '';
      const img = document.createElement('img');
      img.src = panel.photo.src;
      img.alt = '';
      thumb.appendChild(img);
      name.textContent = panel.photoName || 'Photo loaded';
    } else {
      thumb.innerHTML = '<span class="thumb-empty">+</span>';
      name.textContent = 'No photo yet';
    }
    card.querySelector('input[type="range"]').value = String(panel.zoom);
    card.classList.toggle('selected', app.state.selected === i);
  });
}

/** Builds a row of choice buttons from a {key: label} map. */
function buildChoiceRow(container, options, current, onPick) {
  Object.entries(options).forEach(([key, label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice';
    button.dataset.key = key;
    button.textContent = label;
    if (key === current) button.classList.add('active');
    button.addEventListener('click', () => {
      container.querySelectorAll('.choice').forEach((b) => b.classList.toggle('active', b === button));
      onPick(key);
    });
    container.appendChild(button);
  });
}

/** Paints the dashed selection outline over the selected panel in the preview. */
export function drawSelection(ctx, state, w, h) {
  const panels = layoutPanels(state.layout, w, h);
  const rect = panels[state.selected];
  if (!rect) return;
  ctx.save();
  ctx.strokeStyle = '#35f0ff';
  ctx.lineWidth = Math.max(2, w * 0.003);
  ctx.setLineDash([Math.round(w * 0.012), Math.round(w * 0.008)]);
  ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
  ctx.restore();
}

/** Finds which panel a point (canvas pixels) falls in, topmost panel first. */
function hitPanel(state, w, h, x, y) {
  const panels = layoutPanels(state.layout, w, h);
  for (let i = panels.length - 1; i >= 0; i -= 1) {
    const r = panels[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

/** Wires drag-to-pan and wheel-to-zoom on the preview canvas. */
function wireCanvasGestures(app) {
  const { canvas, state } = app;
  let drag = null;
  const toCanvas = (event) => {
    const box = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - box.left) * (canvas.width / box.width),
      y: (event.clientY - box.top) * (canvas.height / box.height),
    };
  };
  canvas.addEventListener('pointerdown', (event) => {
    const point = toCanvas(event);
    const index = hitPanel(state, canvas.width, canvas.height, point.x, point.y);
    if (index === -1) return;
    state.selected = index;
    app.refreshSelection();
    const panel = state.panels[index];
    drag = { panel, startX: point.x, startY: point.y, panX: panel.panX, panY: panel.panY };
    canvas.setPointerCapture(event.pointerId);
    app.redraw();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag || !drag.panel.photo) return;
    const point = toCanvas(event);
    const rects = layoutPanels(state.layout, canvas.width, canvas.height);
    const rect = rects[state.selected];
    const photo = drag.panel.photo;
    const scale = Math.max(rect.w / photo.naturalWidth, rect.h / photo.naturalHeight) * drag.panel.zoom;
    const overflowX = photo.naturalWidth * scale - rect.w;
    const overflowY = photo.naturalHeight * scale - rect.h;
    if (overflowX > 0) drag.panel.panX = Math.min(1, Math.max(0, drag.panX - (point.x - drag.startX) / overflowX));
    if (overflowY > 0) drag.panel.panY = Math.min(1, Math.max(0, drag.panY - (point.y - drag.startY) / overflowY));
    app.redraw();
  });
  const endDrag = () => { drag = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const panel = state.panels[state.selected];
    if (!panel.photo) return;
    panel.zoom = Math.min(4, Math.max(1, panel.zoom * Math.exp(-event.deltaY * 0.0012)));
    app.refreshPanels();
    app.redraw();
  }, { passive: false });
  canvas.addEventListener('dragover', (event) => event.preventDefault());
  canvas.addEventListener('drop', async (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const photo = await readFileAsImage(file);
      setPanelPhoto(state.panels[state.selected], photo, file.name);
      app.refreshPanels();
      app.redraw();
    } catch (err) {
      app.setStatus(err.message);
    }
  });
}

/** Wires every control on the page to the state. Returns the card elements. */
export function initEditor(app) {
  const { state } = app;
  const cardHolder = document.getElementById('panel-cards');
  const cards = [0, 1, 2].map((i) => {
    const card = buildPanelCard(app, i);
    cardHolder.appendChild(card);
    return card;
  });
  app.refreshPanels = () => refreshPanelCards(app, cards);
  app.refreshSelection = () => {
    cards.forEach((card, i) => card.classList.toggle('selected', state.selected === i));
  };

  buildChoiceRow(document.getElementById('layout-options'), LAYOUTS, state.layout, (key) => {
    state.layout = key;
    app.redraw();
  });
  buildChoiceRow(document.getElementById('grade-options'), GRADES, state.grade, (key) => {
    state.grade = key;
    app.redraw();
  });
  buildChoiceRow(document.getElementById('size-options'), Object.fromEntries(
    Object.entries(SIZES).map(([key, size]) => [key, size.label]),
  ), state.size, (key) => {
    state.size = key;
    app.resizeCanvas();
    app.redraw();
  });

  const captionInput = document.getElementById('caption-text');
  captionInput.addEventListener('input', () => {
    state.caption.text = captionInput.value;
    app.redraw();
  });
  const subInput = document.getElementById('caption-sub');
  subInput.addEventListener('input', () => {
    state.caption.sub = subInput.value;
    app.redraw();
  });
  const sizeInput = document.getElementById('caption-size');
  const sizeValue = document.getElementById('caption-size-value');
  sizeInput.addEventListener('input', () => {
    state.caption.scale = Number(sizeInput.value);
    sizeValue.textContent = `${Math.round(state.caption.scale * 100)}%`;
    app.redraw();
  });
  const colorHolder = document.getElementById('caption-colors');
  CAPTION_COLORS.forEach((color) => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'swatch';
    swatch.style.background = color.value;
    swatch.title = color.name;
    swatch.setAttribute('aria-label', `Caption colour ${color.name}`);
    if (color.value === state.caption.color) swatch.classList.add('active');
    swatch.addEventListener('click', () => {
      state.caption.color = color.value;
      colorHolder.querySelectorAll('.swatch').forEach((s) => s.classList.toggle('active', s === swatch));
      app.redraw();
    });
    colorHolder.appendChild(swatch);
  });
  document.getElementById('caption-outline').addEventListener('change', (event) => {
    state.caption.outline = event.target.checked;
    app.redraw();
  });
  document.getElementById('caption-position').addEventListener('change', (event) => {
    state.caption.position = event.target.value;
    app.redraw();
  });

  document.getElementById('demo').addEventListener('click', async () => {
    await app.loadDemoCover();
  });
  document.getElementById('export').addEventListener('click', async () => {
    const name = await app.exportCurrent();
    if (name) app.setStatus(`Saved ${name}`);
  });

  wireCanvasGestures(app);
  refreshPanelCards(app, cards);
}
