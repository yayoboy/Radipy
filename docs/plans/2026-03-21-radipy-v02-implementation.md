# Radipy v0.2.0 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Undo/Redo + Keyboard Shortcuts, Grid Snapping, and Syntax Highlighting to Radipy GUI Builder.

**Architecture:** All changes are frontend-only (`frontend/src/App.jsx`). Feature 1 uses a history stack via `useRef` to wrap all schema mutations. Feature 2 adds a `snapToGrid` helper applied at drag/drop/resize time. Feature 3 installs `react-syntax-highlighter` and replaces the Python `<pre>` panel.

**Tech Stack:** React 18, Vitest + React Testing Library (jsdom), react-syntax-highlighter (new dep)

---

## Task 1: Install react-syntax-highlighter

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install the package**

```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/frontend
npm install react-syntax-highlighter
```

Expected output: `added N packages` — no errors.

**Step 2: Verify installation**

```bash
cat package.json | grep syntax-highlighter
```

Expected: `"react-syntax-highlighter": "^X.X.X"` in dependencies.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install react-syntax-highlighter"
```

---

## Task 2: Fix existing broken test

**Files:**
- Modify: `frontend/src/__tests__/App.test.jsx:42`

The test looks for "Generated Code" but the heading in App.jsx reads "Generated Artifacts". Fix the test to match reality.

**Step 1: Run existing tests to confirm failure**

```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/frontend
npm run test:run
```

Expected: FAIL on `renders generated code panel` — text "Generated Code" not found.

**Step 2: Fix the test**

In `frontend/src/__tests__/App.test.jsx`, line 42, change:
```jsx
// BEFORE
expect(screen.getByText(/Generated Code/i)).toBeInTheDocument();

// AFTER
expect(screen.getByText(/Generated Artifacts/i)).toBeInTheDocument();
```

**Step 3: Run tests again**

```bash
npm run test:run
```

Expected: All tests PASS.

**Step 4: Commit**

```bash
git add frontend/src/__tests__/App.test.jsx
git commit -m "fix: update test to match 'Generated Artifacts' heading"
```

---

## Task 3: Add Grid Snapping

**Files:**
- Modify: `frontend/src/App.jsx`

**Step 1: Write the failing test**

Add to `frontend/src/__tests__/App.test.jsx`:

```jsx
describe('Grid Snapping', () => {
  test('renders grid toggle button', () => {
    render(<App />);
    expect(screen.getByTitle(/grid snapping/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run to verify it fails**

```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/frontend && npm run test:run
```

Expected: FAIL — cannot find element with title "grid snapping".

**Step 3: Implement Grid Snapping in App.jsx**

**3a.** After the `INITIAL_SCHEMA` constant (around line 28), add:

```jsx
const GRID_SIZE = 20;
const snapToGrid = (val, enabled) => enabled ? Math.round(val / GRID_SIZE) * GRID_SIZE : val;
```

**3b.** In the state declarations (after `const [isResizing, setIsResizing]`), add:

```jsx
const [gridEnabled, setGridEnabled] = useState(true);
```

**3c.** In `handleDropOnCanvas`, where `data.source === 'sidebar'`, change:

```jsx
// BEFORE
const x = Math.round(e.clientX - canvasRect.left);
const y = Math.round(e.clientY - canvasRect.top);

// AFTER
const x = snapToGrid(Math.round(e.clientX - canvasRect.left), gridEnabled);
const y = snapToGrid(Math.round(e.clientY - canvasRect.top), gridEnabled);
```

**3d.** In `handleDropOnCanvas`, where `data.source === 'canvas'`, change:

```jsx
// BEFORE
const x = Math.round(e.clientX - canvasRect.left - data.offsetX);
const y = Math.round(e.clientY - canvasRect.top - data.offsetY);

// AFTER
const x = snapToGrid(Math.round(e.clientX - canvasRect.left - data.offsetX), gridEnabled);
const y = snapToGrid(Math.round(e.clientY - canvasRect.top - data.offsetY), gridEnabled);
```

**3e.** In `startResize` inside `doDrag`, change:

```jsx
// BEFORE
const newWidth = Math.max(20, startWidth + (dragEvent.clientX - startX));
const newHeight = Math.max(20, startHeight + (dragEvent.clientY - startY));

// AFTER
const newWidth = snapToGrid(Math.max(20, startWidth + (dragEvent.clientX - startX)), gridEnabled);
const newHeight = snapToGrid(Math.max(20, startHeight + (dragEvent.clientY - startY)), gridEnabled);
```

**3f.** In the header `<div>` with the theme selector, add the grid toggle button AFTER the theme selector div:

```jsx
<button
  title="Grid Snapping"
  onClick={() => setGridEnabled(g => !g)}
  style={{
    padding: "5px 12px",
    backgroundColor: gridEnabled ? "#4ec9b0" : "#3c3c3c",
    color: gridEnabled ? "#1e1e1e" : "#aaa",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "bold"
  }}
>
  Grid: {gridEnabled ? "ON" : "OFF"}
</button>
```

**Step 4: Run tests**

```bash
npm run test:run
```

Expected: All PASS including the new Grid Snapping test.

**Step 5: Commit**

```bash
git add frontend/src/App.jsx frontend/src/__tests__/App.test.jsx
git commit -m "feat: add grid snapping with 20px grid and toggle button"
```

---

## Task 4: Add Syntax Highlighting for Python Code

**Files:**
- Modify: `frontend/src/App.jsx`

**Step 1: Write the failing test**

Add to `frontend/src/__tests__/App.test.jsx`:

```jsx
describe('Syntax Highlighting', () => {
  test('renders code output panel with filename label', () => {
    render(<App />);
    expect(screen.getByText(/generated_app\.py/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run to verify it passes already** (this text already exists, so this test should pass — good baseline)

```bash
npm run test:run
```

Expected: PASS (sanity check that the panel renders).

**Step 3: Add import for SyntaxHighlighter at top of App.jsx**

After the `import React, ...` line (line 1), add:

```jsx
import SyntaxHighlighter from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
```

**Step 4: Replace the Python <pre> block**

Find the `<pre>` block inside the `generated_app.py` panel (around line 664). Replace:

```jsx
// BEFORE
<pre style={{ flex: 1, margin: 0, padding: "10px", fontSize: "10px", color: "#ce9178", overflow: "auto", whiteSpace: "pre-wrap", lineHeight: "1.3" }}>
  {generatedCode || "# Click 'Generate OOP Code' to see the Object-Oriented App Class..."}
</pre>

// AFTER
<div style={{ flex: 1, overflow: "auto", fontSize: "11px" }}>
  <SyntaxHighlighter
    language="python"
    style={vscDarkPlus}
    customStyle={{ margin: 0, background: "transparent", fontSize: "11px", lineHeight: "1.4" }}
    showLineNumbers={!!generatedCode}
  >
    {generatedCode || "# Click 'Generate OOP Code' to see the Object-Oriented App Class..."}
  </SyntaxHighlighter>
</div>
```

**Step 5: Run tests**

```bash
npm run test:run
```

Expected: All PASS.

**Step 6: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: add Python syntax highlighting in code output panel"
```

---

## Task 5: Add Undo/Redo + Keyboard Shortcuts

**Files:**
- Modify: `frontend/src/App.jsx`

**Step 1: Write the failing tests**

Add to `frontend/src/__tests__/App.test.jsx`:

```jsx
import { fireEvent } from '@testing-library/react';

describe('Undo/Redo', () => {
  test('renders undo button disabled initially', () => {
    render(<App />);
    const undoBtn = screen.getByTitle(/undo/i);
    expect(undoBtn).toBeDisabled();
  });

  test('renders redo button disabled initially', () => {
    render(<App />);
    const redoBtn = screen.getByTitle(/redo/i);
    expect(redoBtn).toBeDisabled();
  });
});
```

**Step 2: Run to verify they fail**

```bash
npm run test:run
```

Expected: FAIL — undo/redo buttons not found.

**Step 3: Implement history state in App.jsx**

**3a.** After the existing `useRef` declarations (after `const canvasRef = useRef(null)`), add:

```jsx
const history = useRef([]);
const historyIndex = useRef(-1);
```

**3b.** After the `historyIndex` declaration, add the `pushHistory` helper:

```jsx
const pushHistory = (newSchema) => {
  // Slice off any redo states beyond current index
  history.current = history.current.slice(0, historyIndex.current + 1);
  history.current.push(JSON.parse(JSON.stringify(newSchema)));
  if (history.current.length > 50) history.current.shift();
  historyIndex.current = history.current.length - 1;
};
```

**3c.** After `pushHistory`, add the undo/redo state tracker (used to trigger re-renders for button disabled state):

```jsx
const [historyStep, setHistoryStep] = useState(0);
```

**3d.** Add the `undo` and `redo` functions after `pushHistory`:

```jsx
const undo = () => {
  if (historyIndex.current <= 0) return;
  historyIndex.current -= 1;
  const prev = JSON.parse(JSON.stringify(history.current[historyIndex.current]));
  setSchema(prev);
  setHistoryStep(historyIndex.current);
};

const redo = () => {
  if (historyIndex.current >= history.current.length - 1) return;
  historyIndex.current += 1;
  const next = JSON.parse(JSON.stringify(history.current[historyIndex.current]));
  setSchema(next);
  setHistoryStep(historyIndex.current);
};
```

**3e.** Initialize history on first load — add a `useEffect` after the persistence effect:

```jsx
useEffect(() => {
  // Seed history with initial schema
  history.current = [JSON.parse(JSON.stringify(schema))];
  historyIndex.current = 0;
  setHistoryStep(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

**3f.** Modify the schema-mutating functions to call `pushHistory` BEFORE calling `setSchema`. Update these functions:

`handleDropOnCanvas` (adding from sidebar):
```jsx
// Add before setSchema call in sidebar drop:
pushHistory({ ...prev, pages: newPages });
setSchema(prev => { ... });
// Change to use functional form that also calls pushHistory:
```

Instead of modifying each function individually, wrap `setSchema` with a helper. Replace all `setSchema(prev => { ... })` in mutation functions with a wrapper. Add this helper right after `pushHistory`:

```jsx
const setSchemaWithHistory = (updater) => {
  setSchema(prev => {
    const next = typeof updater === 'function' ? updater(prev) : updater;
    pushHistory(next);
    setHistoryStep(h => h + 1);
    return next;
  });
};
```

Then replace `setSchema(prev => {...})` in the following functions with `setSchemaWithHistory(prev => {...})`:
- `handleDropOnCanvas` (the sidebar drop that pushes newComp)
- `handleDropOnCanvas` (the canvas move — calls `updateComponentLayout` which calls `setSchema`)
- `updateComponentProps`
- `updateComponentLayout`
- `addPage`
- `deletePage`
- `clearProject`
- The theme `onChange` handler in the header
- The tab name `onChange` handler

**Step 4: Add keyboard shortcuts useEffect**

After the persistence `useEffect`, add:

```jsx
useEffect(() => {
  const handleKeyDown = (e) => {
    const tag = document.activeElement?.tagName?.toLowerCase();
    const isInputFocused = ['input', 'textarea', 'select'].includes(tag);

    if (e.key === 'Escape') {
      setSelectedId(null);
      return;
    }

    if (isInputFocused) return; // Don't intercept typing in inputs

    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
      e.preventDefault();
      deleteComponent(selectedId);
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedId) {
      e.preventDefault();
      const comp = schema.pages[activePage]?.components.find(c => c.id === selectedId);
      if (comp) {
        const newComp = {
          ...JSON.parse(JSON.stringify(comp)),
          id: generateId(comp.type.replace('ttk.', '').replace('MapView', 'Map').replace('MatplotlibChart', 'Chart')),
          layout: { ...comp.layout, x: comp.layout.x + 20, y: comp.layout.y + 20 }
        };
        setSchemaWithHistory(prev => {
          const newPages = [...prev.pages];
          newPages[activePage].components.push(newComp);
          return { ...prev, pages: newPages };
        });
        setSelectedId(newComp.id);
      }
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [selectedId, activePage, schema, undo, redo]);
```

**Step 5: Add Undo/Redo buttons to the header**

In the header `<div style={{display: "flex", gap: "10px"}}>` (the right side buttons), add BEFORE the "Clear All" button:

```jsx
<div style={{ display: "flex", alignItems: "center", gap: "5px", backgroundColor: "#333", padding: "5px 10px", borderRadius: "4px" }}>
  <button
    title="Undo (Ctrl+Z)"
    onClick={undo}
    disabled={historyIndex.current <= 0}
    style={{
      padding: "4px 10px",
      backgroundColor: "transparent",
      color: historyIndex.current <= 0 ? "#555" : "#aaa",
      border: "1px solid #555",
      borderRadius: "3px",
      cursor: historyIndex.current <= 0 ? "not-allowed" : "pointer",
      fontSize: "12px"
    }}
  >
    ↩ Undo
  </button>
  <button
    title="Redo (Ctrl+Y)"
    onClick={redo}
    disabled={historyIndex.current >= history.current.length - 1}
    style={{
      padding: "4px 10px",
      backgroundColor: "transparent",
      color: historyIndex.current >= history.current.length - 1 ? "#555" : "#aaa",
      border: "1px solid #555",
      borderRadius: "3px",
      cursor: historyIndex.current >= history.current.length - 1 ? "not-allowed" : "pointer",
      fontSize: "12px"
    }}
  >
    ↪ Redo
  </button>
  <span style={{ fontSize: "10px", color: "#555" }}>
    {historyIndex.current}/{history.current.length - 1}
  </span>
</div>
```

**Step 6: Run tests**

```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/frontend && npm run test:run
```

Expected: All PASS including new undo/redo tests.

**Step 7: Manual smoke test**

```bash
npm run dev
```

Open http://localhost:3000, drag a widget onto the canvas, press Ctrl+Z → widget disappears. Press Ctrl+Y → widget reappears. Press Ctrl+D to duplicate. Press Delete to remove. Toggle Grid button → drag widgets freely or snapped.

**Step 8: Commit**

```bash
git add frontend/src/App.jsx frontend/src/__tests__/App.test.jsx
git commit -m "feat: add undo/redo with 50-step history and keyboard shortcuts (Ctrl+Z/Y/D, Delete, Escape)"
```

---

## Task 6: Final integration test

**Step 1: Run full test suite**

```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/frontend && npm run test:run
```

Expected: All tests PASS, 0 failures.

**Step 2: Run backend tests too**

```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/backend && pytest -v
```

Expected: All PASS (no backend changes were made).

**Step 3: Final commit if needed**

```bash
git add .
git commit -m "chore: radipy v0.2.0 — undo/redo, grid snap, syntax highlight"
```

---

## Summary of Changes

| File | What Changed |
|---|---|
| `frontend/package.json` | Added `react-syntax-highlighter` dependency |
| `frontend/src/App.jsx` | History stack, keyboard shortcuts, grid snap, syntax highlighter |
| `frontend/src/__tests__/App.test.jsx` | Fixed broken test + new tests for grid/undo/redo |

## Keyboard Shortcuts Reference

| Key | Action |
|---|---|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Delete` / `Backspace` | Delete selected component |
| `Ctrl+D` | Duplicate selected component |
| `Escape` | Deselect component |
