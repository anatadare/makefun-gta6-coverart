// Draws the cover art onto a canvas 2D context: photo panels in a multi-panel
// poster layout, a sunset or neon colour grade over each photo, and the bold
// caption lettering. Pure drawing: it takes a state (see state.js) and a size,
// and paints the same cover at any resolution.

const FRAME = 'rgba(255, 243, 224, 0.95)';
const BACKDROP = '#160a24';

/** How each grade colours a photo: a canvas filter, a tint gradient, and a vignette. */
export const GRADE_RECIPES = {
  sunset: {
    filter: 'saturate(1.4) contrast(1.1) brightness(1.03)',
    tint: ['#ff9a3d', '#c2185b'],
    blend: 'overlay',
    tintAlpha: 0.3,
    vignette: 0.32,
  },
  neon: {
    filter: 'saturate(1.6) contrast(1.18) brightness(0.98)',
    tint: ['#22d3ee', '#e879f9'],
    blend: 'soft-light',
    tintAlpha: 0.38,
    vignette: 0.45,
  },
  pastel: {
    filter: 'saturate(0.9) contrast(0.98) brightness(1.1)',
    tint: ['#fbcfe8', '#fde68a'],
    blend: 'soft-light',
    tintAlpha: 0.3,
    vignette: 0.18,
  },
  noir: {
    filter: 'grayscale(1) contrast(1.15) brightness(1.02)',
    tint: ['#ffffff', '#000000'],
    blend: 'overlay',
    tintAlpha: 0.12,
    vignette: 0.4,
  },
};

/**
 * The panel rectangles for a layout at a canvas size. Every layout has three
 * panels: index 0 is the hero, 1 and 2 the smaller ones. `gap` is the strip of
 * backdrop showing between panels.
 */
export function layoutPanels(layout, w, h) {
  const gap = Math.max(4, Math.round(Math.min(w, h) * 0.008));
  if (layout === 'trio') {
    if (w >= h) {
      const pw = (w - gap * 2) / 3;
      return [
        { x: 0, y: 0, w: pw, h },
        { x: pw + gap, y: 0, w: pw, h },
        { x: (pw + gap) * 2, y: 0, w: pw, h },
      ];
    }
    const ph = (h - gap * 2) / 3;
    return [
      { x: 0, y: 0, w, h: ph },
      { x: 0, y: ph + gap, w, h: ph },
      { x: 0, y: (ph + gap) * 2, w, h: ph },
    ];
  }
  if (layout === 'inset') {
    const iw = Math.round(w * (w >= h ? 0.28 : 0.4));
    const ih = Math.round(h * (w >= h ? 0.26 : 0.17));
    const margin = Math.round(Math.min(w, h) * 0.03);
    return [
      { x: 0, y: 0, w, h },
      { x: margin, y: h - ih - margin, w: iw, h: ih },
      { x: w - iw - margin, y: h - ih - margin, w: iw, h: ih },
    ];
  }
  // split: hero beside or above two smaller panels.
  if (w >= h) {
    const heroW = Math.round(w * 0.62);
    const sideX = heroW + gap;
    const sideW = w - sideX;
    const smallH = (h - gap) / 2;
    return [
      { x: 0, y: 0, w: heroW, h },
      { x: sideX, y: 0, w: sideW, h: smallH },
      { x: sideX, y: smallH + gap, w: sideW, h: smallH },
    ];
  }
  const heroH = Math.round(h * 0.6);
  const rowY = heroH + gap;
  const rowH = h - rowY;
  const smallW = (w - gap) / 2;
  return [
    { x: 0, y: 0, w, h: heroH },
    { x: 0, y: rowY, w: smallW, h: rowH },
    { x: smallW + gap, y: rowY, w: smallW, h: rowH },
  ];
}

/** The scale that covers a panel with a photo, times the panel's zoom. */
function coverScale(photo, panel, zoom) {
  return Math.max(panel.w / photo.naturalWidth, panel.h / photo.naturalHeight) * zoom;
}

/** Paints one photo into one panel, cropped by the panel's zoom and pan. */
function paintPhoto(ctx, photo, panel, zoom, panX, panY, recipe) {
  const scale = coverScale(photo, panel, zoom);
  const pw = photo.naturalWidth * scale;
  const ph = photo.naturalHeight * scale;
  const dx = panel.x - panX * (pw - panel.w);
  const dy = panel.y - panY * (ph - panel.h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(panel.x, panel.y, panel.w, panel.h);
  ctx.clip();
  ctx.filter = recipe.filter;
  ctx.drawImage(photo, dx, dy, pw, ph);
  ctx.filter = 'none';
  const tint = ctx.createLinearGradient(0, panel.y, 0, panel.y + panel.h);
  tint.addColorStop(0, recipe.tint[0]);
  tint.addColorStop(1, recipe.tint[1]);
  ctx.globalCompositeOperation = recipe.blend;
  ctx.globalAlpha = recipe.tintAlpha;
  ctx.fillStyle = tint;
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  const cx = panel.x + panel.w / 2;
  const cy = panel.y + panel.h / 2;
  const edge = Math.hypot(panel.w, panel.h) / 2;
  const shade = ctx.createRadialGradient(cx, cy, edge * 0.45, cx, cy, edge);
  shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(1, `rgba(8, 2, 16, ${recipe.vignette})`);
  ctx.fillStyle = shade;
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  ctx.restore();
}

/** Paints the placeholder a panel shows before a photo is loaded. */
function paintEmptyPanel(ctx, panel, index) {
  const grad = ctx.createLinearGradient(panel.x, panel.y, panel.x + panel.w, panel.y + panel.h);
  grad.addColorStop(0, '#2c1445');
  grad.addColorStop(1, '#431b5e');
  ctx.fillStyle = grad;
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = `700 ${Math.max(14, Math.round(panel.h * 0.07))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(index === 0 ? 'ADD A PHOTO' : `PANEL ${index + 1}`, panel.x + panel.w / 2, panel.y + panel.h / 2);
}

/** Splits the caption on '|' into lines and fits the largest size that fits the width. */
function fitCaptionLines(ctx, text, maxWidth, baseSize) {
  const lines = text.split('|').map((line) => line.trim().toUpperCase()).filter(Boolean);
  if (!lines.length) return { lines: [], size: baseSize };
  let size = baseSize;
  const setFont = () => { ctx.font = `${size}px Anton, 'Archivo Black', sans-serif`; };
  setFont();
  while (size > 16 && lines.some((line) => ctx.measureText(line).width > maxWidth)) {
    size -= 2;
    setFont();
  }
  return { lines, size };
}

/** Paints the caption, its rule bar and its sub-line over the cover. */
function paintCaption(ctx, caption, w, h, layout) {
  const atTop = caption.position === 'top';
  const bandH = h * 0.34;
  const band = atTop
    ? ctx.createLinearGradient(0, 0, 0, bandH)
    : ctx.createLinearGradient(0, h - bandH, 0, h);
  band.addColorStop(0, atTop ? 'rgba(10, 4, 20, 0.78)' : 'rgba(10, 4, 20, 0)');
  band.addColorStop(1, atTop ? 'rgba(10, 4, 20, 0)' : 'rgba(10, 4, 20, 0.78)');
  ctx.fillStyle = band;
  ctx.fillRect(0, atTop ? 0 : h - bandH, w, bandH);

  const { lines, size } = fitCaptionLines(ctx, caption.text, w * 0.92, h * 0.105 * caption.scale);
  if (!lines.length) return;
  const lineH = size * 1.08;
  const blockH = lines.length * lineH;
  const lift = layout === 'inset' && !atTop ? h * 0.22 : 0;
  const baseY = atTop
    ? h * 0.055 + size
    : h - h * 0.05 - lift - blockH + size;
  const cx = w / 2;

  ctx.save();
  ctx.translate(cx, baseY + blockH / 2 - size / 2);
  ctx.rotate(-0.028);
  ctx.translate(-cx, -(baseY + blockH / 2 - size / 2));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${size}px Anton, 'Archivo Black', sans-serif`;
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = size * 0.18;
  ctx.shadowOffsetY = size * 0.05;
  lines.forEach((line, i) => {
    const y = baseY + i * lineH;
    if (caption.outline) {
      ctx.strokeStyle = '#12041f';
      ctx.lineWidth = Math.max(2, size * 0.09);
      ctx.strokeText(line, cx, y);
    }
    ctx.fillStyle = caption.color;
    ctx.fillText(line, cx, y);
  });
  ctx.restore();

  const sub = caption.sub.trim();
  const subSize = Math.max(12, size * 0.24);
  const lastBaseline = baseY + (lines.length - 1) * lineH;
  // The tagline sits clear of the caption: above its first line's cap top at
  // the bottom, below its last line's baseline at the top.
  const subY = atTop
    ? lastBaseline + size * 0.55 + subSize * 0.8
    : baseY - size * 0.85;
  if (sub) {
    ctx.font = `${subSize}px 'Archivo Black', sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.3)}px`; } catch { /* older canvas: no letter spacing */ }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = subSize * 0.3;
    ctx.fillText(sub.toUpperCase(), cx, subY);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
    ctx.shadowBlur = 0;
  }

  const ruleW = w * 0.16;
  const ruleH = Math.max(3, h * 0.006);
  let ruleY;
  if (atTop) {
    ruleY = sub ? subY + size * 0.25 : lastBaseline + size * 0.4;
  } else {
    const topEdge = sub ? subY - subSize * 0.75 : baseY - size * 0.72;
    ruleY = topEdge - size * 0.22 - ruleH;
  }
  const rule = ctx.createLinearGradient(cx - ruleW / 2, 0, cx + ruleW / 2, 0);
  rule.addColorStop(0, '#ff2e88');
  rule.addColorStop(0.5, '#ffb020');
  rule.addColorStop(1, '#35f0ff');
  ctx.fillStyle = rule;
  ctx.fillRect(cx - ruleW / 2, Math.max(0, Math.min(h - ruleH, ruleY)), ruleW, ruleH);
}

/**
 * Draws the whole cover for a state onto `ctx` at `w` by `h` pixels:
 * backdrop, photo panels with their grade, cream frame lines, caption.
 */
export function drawCover(ctx, state, w, h) {
  ctx.save();
  ctx.fillStyle = BACKDROP;
  ctx.fillRect(0, 0, w, h);
  const recipe = GRADE_RECIPES[state.grade] ?? GRADE_RECIPES.sunset;
  const panels = layoutPanels(state.layout, w, h);
  state.panels.forEach((panel, i) => {
    const rect = panels[i];
    if (!rect) return;
    if (state.layout === 'inset' && i > 0) {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = Math.round(w * 0.012);
      ctx.shadowOffsetY = Math.round(h * 0.008);
      ctx.fillStyle = FRAME;
      ctx.fillRect(rect.x - 3, rect.y - 3, rect.w + 6, rect.h + 6);
      ctx.restore();
    }
    if (panel.photo) {
      paintPhoto(ctx, panel.photo, rect, panel.zoom, panel.panX, panel.panY, recipe);
    } else {
      paintEmptyPanel(ctx, rect, i);
    }
  });
  const border = Math.max(2, Math.round(w * 0.0025));
  ctx.lineWidth = border;
  ctx.strokeStyle = FRAME;
  panels.forEach((rect) => ctx.strokeRect(rect.x, rect.y, rect.w, rect.h));
  paintCaption(ctx, state.caption, w, h, state.layout);
  const tagSize = Math.max(11, Math.round(h * 0.016));
  ctx.font = `${tagSize}px 'Archivo Black', sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText('NEON COVER STUDIO', w - w * 0.018, h * 0.018);
  const outer = Math.max(3, Math.round(w * 0.004));
  ctx.lineWidth = outer;
  ctx.strokeStyle = FRAME;
  ctx.strokeRect(outer / 2, outer / 2, w - outer, h - outer);
  ctx.restore();
}
