# Neon Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/anatadare/makefun-gta6-coverart/rank.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=referral&utm_campaign=makefun-gta6-coverart)
[![Reward](https://make.fun/badge/gta6-cover-art-01/anatadare/makefun-gta6-coverart/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=referral&utm_campaign=makefun-gta6-coverart)

A web app that turns your photos and a caption into bold multi-panel cover art
in the style of GTA 6's posters, and exports it as a PNG to share. It runs
fully offline in desktop Chrome: every file it loads lives under `app/`, and
your photos are read on your own machine, never uploaded.

## What it does

- **Multi-panel poster layouts**: a large hero panel plus smaller panels, in
  three layouts (hero + two panels, three equal panels, hero + two insets),
  with cream frame lines between panels.
- **Your photos, your crop**: upload a photo per panel, or spread one photo
  over all panels. Click a panel to select it, drag it to move the photo,
  scroll or use the slider to zoom. Drop a photo straight onto the preview.
- **Caption lettering**: bold condensed display type with an outline and
  shadow, a tagline, size, colour and top/bottom position controls.
- **Sunset and neon grades**: four colour grades (Sunset, Neon night, Pastel,
  Noir) applied per panel with canvas filters, tint gradients and vignettes.
- **Three post sizes**: 1080 x 1080, 1080 x 1350 and 1920 x 1080, one click to
  export a PNG.
- **One-click demo**: two free sample photos ship under `app/samples/`, and
  the app opens on a finished sample cover.

## Try it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome.

## Files

- `app/index.html`, `app/style.css` — the editor page.
- `app/src/state.js` — the editor's state (sizes, layouts, grades, panels).
- `app/src/cover.js` — the cover renderer: panel geometry, photo grades, caption.
- `app/src/editor.js` — the editor wiring: uploads, drag-to-pan, zoom, controls.
- `app/src/shots.js` — fixed `?shot=` scenes for screenshots.
- `app/src/main.js` — bootstrap and the `window.coverStudio` export hook.
- `app/fonts/` — Anton and Archivo Black, both under the SIL Open Font License
  (license texts beside them). No Rockstar artwork, logos or fonts are used.
- `main.ts` — the entry program: copies `app/` and `screenshots/` to the
  output directory and writes `dossier.json`.

## License

MIT. See `LICENSE`.
