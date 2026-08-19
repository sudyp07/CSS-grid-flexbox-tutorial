# Axis — Flexbox & Grid Studio

An interactive playground for learning CSS Flexbox and Grid. Change properties visually, watch the layout update live, and copy the exact CSS it generates.

## Getting started

No build step, no dependencies to install.

1. Keep `index.html`, `styles.css`, and `script.js` in the same folder.
2. Open `index.html` in any modern browser.

That's it. An internet connection is needed on first load for the Google Fonts and Font Awesome icons (loaded via CDN); everything else runs locally in the browser.

## Features

- **Flexbox + Grid in one tool** — switch modes instantly, each keeps its own settings
- **Live playground** — drag items to reorder, double-click to recolor, click to select and edit individual item properties
- **Real-time CSS/HTML panel** — syntax highlighted, copy to clipboard, or download as a file
- **8 layout presets** — navbar, centered box, card row, sidebar, card grid, holy grail, pricing table, dashboard
- **Challenge mode** — random layout goals to recreate, with a checker
- **Grid line overlay** and **axis indicators** to visualize what's happening
- **Responsive preview** — simulate desktop / tablet / mobile container widths
- **Tooltips + difficulty tags** on every property (beginner / intermediate / advanced)
- **Session persistence** — save your layout to `localStorage` and pick up where you left off

## Keyboard shortcuts

| Key     | Action                  |
|---------|--------------------------|
| `1`     | Switch to Flexbox mode  |
| `2`     | Switch to Grid mode     |
| `R`     | Reset to defaults       |
| `Space` | Randomize properties    |

## File structure

```
.
├── index.html   # markup
├── styles.css   # all styling
├── script.js    # all app logic (state, rendering, controls, code generation)
└── README.md
```

## Tech

Vanilla HTML, CSS, and JavaScript — no frameworks, no bundler. Fonts: Space Grotesk, Inter, JetBrains Mono. Icons: Font Awesome.