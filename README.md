# Sudyp Studio — Flexbox & Grid, Visualized

An interactive CSS Flexbox and Grid playground. Pick a property, click it, and watch the layout react in real time — no reading a spec table and guessing what `align-content` actually does.

Built by **Sudip Nepal** — [github.com/sudyp07](https://github.com/sudyp07)
**TRY at - https://sudyp07.github.io/CSS-grid-flexbox-tutorial/
---

## Why this exists

Most Flexbox/Grid explainers make you read first and imagine second. This flips that: every property is a clickable control, every change animates live on real boxes, and the exact CSS being applied is shown next to it the whole time — so the connection between "I clicked this" and "this is what changed" is immediate.

## What you'll learn

### Flexbox
| Concept | What it covers |
|---|---|
| `flex-direction` / `flex-wrap` | Row vs column, single line vs wrapping |
| `justify-content` / `align-items` / `align-content` | Main-axis and cross-axis alignment |
| `gap` | Spacing between items without margin hacks |
| `order`, `flex-grow/shrink/basis`, `align-self` | Per-item overrides, independent of the container |

### Grid
| Concept | What it covers |
|---|---|
| `grid-template-columns` / `grid-template-rows` | Defining the track structure |
| `grid-auto-flow` | How auto-placed items fill the grid |
| `justify-items` / `align-items` | Aligning content inside each cell |
| `justify-content` / `align-content` | Positioning the whole track grid within the container |
| `grid-column` / `grid-row`, `justify-self` / `align-self` | Per-item placement and spanning |

### Also included
- **8 layout presets** — navbar, centered box, card row, sidebar, card grid, holy grail, pricing table, dashboard
- **Challenge mode** — random layout goals with a pass/fail checker
- **Grid line overlay + axis indicators** to visualize what's actually happening on-axis
- **Responsive preview** — simulate desktop / tablet / mobile container widths
- **Drag-to-reorder** items, double-click to recolor
- **Live code panel** — syntax-highlighted CSS & HTML, copy button, download as file
- **Session persistence** via `localStorage`

## Keyboard shortcuts

| Key | Action |
|---|---|
| `1` | Switch to Flexbox mode |
| `2` | Switch to Grid mode |
| `R` | Reset to defaults |
| `Space` | Randomize properties |

## Run it locally

No build step, no dependencies to install — it's plain HTML/CSS/JS.

```bash
# clone the repo
git clone https://github.com/sudyp07/CSS-grid-flexbox-tutorial.git

# move into it
cd CSS-grid-flexbox-tutorial

# open index.html in your browser
open index.html      # macOS
start index.html      # Windows
xdg-open index.html   # Linux
```

You can also just double-click `index.html` — no server required.

> An internet connection is needed on first load for Google Fonts and Font Awesome icons (loaded via CDN). Everything else runs fully client-side.

## File structure

```
.
├── index.html   # markup
├── styles.css   # all styling
├── script.js    # app state, rendering, controls, code generation
└── README.md
```

Split into three files on purpose — easier to read, easier to diff, easier to extend than one giant HTML blob.

## Tech

Vanilla HTML, CSS, and JavaScript. No framework, no bundler, no build step. Fonts: Space Grotesk, Inter, JetBrains Mono. Icons: Font Awesome.

## Author

**Sudip Nepal**
GitHub: [@sudyp07](https://github.com/sudyp07)

Feel free to fork, star, or open an issue if you spot a bug or have an idea for a preset/challenge worth adding.
