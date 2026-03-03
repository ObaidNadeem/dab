
# ⠿ DAB - Draw & Animate Braille

A visual editor for Unicode Braille patterns with frame-by-frame animation, a video-editor-style timeline, and multi-format code export. Think After Effects — but for braille pixel art.

Draw on a dot grid. Each braille character is a 2×4 dot matrix. The app converts your drawings to Unicode braille characters (U+2800–U+28FF) in real-time, with export formats ready for CLI apps, terminals, READMEs, and code.

```
⣿⣷⣾⣽  →  const frames = ["⣿⣷⣾⣽", "⡿⣟⣯⣻"];
```

---

## Features

**Canvas & Drawing**
- Configurable grid: 1–10 columns × 1–6 rows of braille cells
- Draw and erase modes with click-and-drag painting
- Line tool (Bresenham's algorithm) and rectangle tool
- Fill, invert, and clear operations
- Visual cell boundary guides (toggle with `G`)
- Undo/redo with stroke batching — entire paint strokes are one step

**Animation Timeline**
- Frame-by-frame animation with add, duplicate, and delete
- Drag-and-drop frame reordering
- Adjustable playback speed (1–24 FPS) with loop toggle
- Onion skinning — ghost the previous frame while drawing
- Live animated braille preview in the sidebar

**Export Formats**
- **Braille** — raw Unicode characters
- **Unicode** — codepoint notation (`U+28FF`)
- **ASCII** — `##` / `..` grid
- **[Termdot](https://www.npmjs.com/package/termdotdesign)** — `*` / `.` flat string
- **JS / Python / Rust / C** — string literals
- **Animation** — full frame arrays in 7 formats (JS Braille, JS Termdot, JS Grid, JSON, Python, Rust, C)

**Project Management**
- Auto-save to localStorage (debounced 500ms)
- Auto-restore on page load
- Save/load project files (`.braille-project.json`)
- Import animations from JSON, JS arrays, raw braille text, or grid arrays
- Frame clipboard — copy, cut, paste frames with `Ctrl+C/X/V`

**Command Palette**
- `Ctrl+K` / `Cmd+K` — search and execute any action
- Fuzzy filtering with keyboard navigation

---

## Keyboard Shortcuts

```
D Draw              N New frame
E Erase         Space Play
C Clear             ← Prev frame
F Fill              → Next frame
I Invert        Shift Erase dot
L Line            Del Delete frame
R Rectangle        M  Cycle mirror
G Grid guides  Ctrl+Z Undo
               Ctrl+S Save project
               Ctrl+K Command palette
```

---

## Braille Encoding

Each character maps to a 2×4 dot matrix in Unicode range U+2800–U+28FF:

```
col  0    1
    ┌────┬────┐
 0  │ 0x01 │ 0x08 │
 1  │ 0x02 │ 0x10 │
 2  │ 0x04 │ 0x20 │
 3  │ 0x40 │ 0x80 │
    └────┴────┘
```

`character = String.fromCodePoint(0x2800 + bitmask)` where bitmask is the OR of all active dot bit values.

---

## Tech Stack

Zero dependencies. Pure HTML + CSS + JS.

- `index.html` — layout and structure
- `style.css` — complete design system
- `app.js` — all logic (braille encoding, state, drawing tools, export, import, undo/redo, timeline, drag-and-drop, shortcuts)

---

## Getting Started

Just open `index.html` in a browser. No build step, no server, no install.

```bash
open index.html
```

Or serve it:

```bash
npx serve .
```

---

## Project Structure

```
index.html    Full app layout
style.css     Design system, all styles
app.js        All application logic
README.md     This file
```

---

## Design

Dark, monospace-dominant, monochromatic. No colored accents — the palette is black, gray, and white. Built for focus.

- **Background**: `#0a0a0a` → `#111` → `#1a1a1a`
- **Text**: `#e5e5e5` primary, `#555` secondary
- **Dots**: 26px circles, glow on active (`box-shadow: 0 0 6px rgba(255,255,255,0.12)`)
- **Typography**: SF Mono / Cascadia Code / Fira Code / JetBrains Mono

---

---

Built with [Command Code](https://commandcode.ai)

## License

MIT © [Obaid Nadeem](https://github.com/ObaidNadeem)
