# Radipy v0.2.0 Features Design

**Date:** 2026-03-21
**Scope:** Three UX improvements for the Radipy GUI Builder

---

## Feature 1 — Undo/Redo + Keyboard Shortcuts

### Architecture
- `history` useRef: array of schema snapshots (max 50 steps)
- `historyIndex` useRef: pointer into history array
- `pushHistory(newSchema)` helper: slices array at current index, pushes new snapshot, updates index
- All schema mutations (`setSchema`) go through `pushHistory`
- `useEffect` adds/removes a `keydown` listener on `document`

### Keyboard Shortcuts
| Shortcut | Action |
|---|---|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Delete` / `Backspace` | Delete selected component |
| `Ctrl+D` | Duplicate selected component |
| `Escape` | Deselect |

### UI Changes
- Two buttons (Undo / Redo) in the header, disabled when no history available
- Show step counter (e.g., `3/10`)

---

## Feature 2 — Grid Snapping

### Architecture
- Constant `GRID_SIZE = 20` (matches existing canvas background grid at 20px)
- `gridEnabled` boolean state (default: `true`)
- Helper: `snapToGrid(val) => Math.round(val / GRID_SIZE) * GRID_SIZE`
- Applied to:
  - Drop from sidebar (x, y)
  - Move from canvas (x, y)
  - Resize (width, height)

### UI Changes
- Toggle button in header: `Grid: ON / OFF`
- When off, snapping is bypassed (free positioning)

---

## Feature 3 — Syntax Highlighting

### Architecture
- Install `react-syntax-highlighter` package
- Use `Prism` highlighter with `vscDarkPlus` theme
- Replace `<pre>` in the `generated_app.py` panel with `<SyntaxHighlighter language="python" style={vscDarkPlus}>`
- `requirements.txt` and `Run Instructions` panels remain as `<pre>` (plain text)

### UI Changes
- Python code panel gets full VSCode-like syntax coloring
- Keyword, string, comment, function colors match VSCode dark theme

---

## Implementation Order

1. Feature 1 (Undo/Redo) — highest UX impact
2. Feature 2 (Grid Snapping) — low complexity, canvas integration
3. Feature 3 (Syntax Highlighting) — npm install + UI swap
