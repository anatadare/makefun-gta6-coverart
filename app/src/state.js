// The editor's state: which size, layout and grade the cover uses, what each panel
// shows, and how the caption looks. Nothing here touches the DOM; the renderer
// (cover.js) and the editor (editor.js) both read this shape.

export const SIZES = {
  square: { width: 1080, height: 1080, label: 'Square 1080 x 1080' },
  portrait: { width: 1080, height: 1350, label: 'Portrait 1080 x 1350' },
  landscape: { width: 1920, height: 1080, label: 'Wide 1920 x 1080' },
};

export const LAYOUTS = {
  split: 'Hero + two panels',
  trio: 'Three equal panels',
  inset: 'Hero + two insets',
};

export const GRADES = {
  sunset: 'Sunset',
  neon: 'Neon night',
  pastel: 'Pastel',
  noir: 'Noir',
};

export const CAPTION_COLORS = [
  { name: 'White', value: '#ffffff' },
  { name: 'Sun yellow', value: '#ffd60a' },
  { name: 'Hot pink', value: '#ff2e88' },
  { name: 'Neon cyan', value: '#35f0ff' },
  { name: 'Lime', value: '#b6ff2e' },
];

export const SAMPLES = [
  { name: 'boulevard', label: 'Boulevard' },
  { name: 'pier', label: 'Pier' },
];

/** One panel's photo: the image, how far it is zoomed, and where it sits (0..1 each way). */
export function emptyPanel() {
  return { photo: null, photoName: '', zoom: 1, panX: 0.5, panY: 0.5 };
}

/** A fresh editor state: wide cover, hero layout, sunset grade, three empty panels. */
export function createState() {
  return {
    size: 'landscape',
    layout: 'split',
    grade: 'sunset',
    caption: {
      text: 'Neon Nights',
      sub: 'A night on the boulevard',
      scale: 1,
      color: '#ffffff',
      outline: true,
      position: 'bottom',
    },
    panels: [emptyPanel(), emptyPanel(), emptyPanel()],
    selected: 0,
  };
}

/** Puts an image into a panel, resetting its crop to the centred full view. */
export function setPanelPhoto(panel, photo, name) {
  panel.photo = photo;
  panel.photoName = name;
  panel.zoom = 1;
  panel.panX = 0.5;
  panel.panY = 0.5;
}

/** Copies one panel's photo (and crop) into every panel. */
export function spreadPhotoToAllPanels(state, index) {
  const source = state.panels[index];
  if (!source.photo) return;
  for (const panel of state.panels) {
    panel.photo = source.photo;
    panel.photoName = source.photoName;
    panel.zoom = source.zoom;
    panel.panX = source.panX;
    panel.panY = source.panY;
  }
}
