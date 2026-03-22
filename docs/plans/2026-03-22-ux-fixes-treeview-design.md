# UX Fixes + Hierarchical Layers Treeview Design

**Date:** 2026-03-22

---

## Fix 1: Notebook Tab Count — Free Number Input

**Problem:** The `tabCount` inspector uses a `<select>` with hardcoded options 2/3/4, preventing users from creating more tabs.

**Fix:** Replace with `<input type="number" min={1}>`. The `tabs` array resize logic is unchanged — preserves existing tabs, creates new ones when count increases, drops trailing ones when count decreases.

---

## Fix 2: Canvas Dimensions — Editable While Typing

**Problem:** `parseInt(e.target.value) || 100` in Window Properties onChange resets the field to 100 as soon as the user clears it to start typing a new value, because `parseInt("") = NaN` and `NaN || 100 = 100`.

**Fix:** Add local draft state `const [sizeDraft, setSizeDraft] = useState({ w: null, h: null })`.
- Input `value`: `sizeDraft.w ?? schema.window?.width ?? 800`
- `onChange`: `setSizeDraft(prev => ({ ...prev, w: e.target.value }))` — no schema update
- `onBlur`: parse, clamp to min 100, call `setSchemaWithHistory`, reset draft to null

Same pattern applied to height. This lets users type freely; schema (and canvas) only update on blur.

---

## Fix 3: Notebook Child Selection on Canvas

**Problem:** Children inside notebook tabs have `pointerEvents: none` inside `renderPreview`, making them unclickable on the canvas.

**Fix in two parts:**

### Part A — `findComponentById` helper
Replace:
```jsx
const selectedComp = currentComponents.find(c => c.id === selectedId);
```
With a recursive search across tabs and panes:
```jsx
function findComponentById(id, comps) {
  for (const c of comps) {
    if (c.id === id) return c;
    if (c.tabs) {
      for (const tab of c.tabs) {
        const found = findComponentById(id, tab.components);
        if (found) return found;
      }
    }
    if (c.panes) {
      for (const pane of c.panes) {
        const found = findComponentById(id, pane.components);
        if (found) return found;
      }
    }
  }
  return null;
}
const selectedComp = findComponentById(selectedId, currentComponents);
```

### Part B — Canvas click hit-test for Notebook content area
Extend the Notebook's canvas `onClick` handler: if the click is in the content area (below tab bar), find which child widget the click coordinates fall on and select it:
```jsx
// After tab-bar click handling:
if (relY > tabHeight) {
  const activeTabIdx = activeNotebookTab[comp.id] ?? 0;
  const tabChildren = comp.tabs[activeTabIdx]?.components || [];
  const clickX = relX;
  const clickY = relY - tabHeight;
  const hit = [...tabChildren].reverse().find(child =>
    clickX >= child.layout.x && clickX <= child.layout.x + child.layout.width &&
    clickY >= child.layout.y && clickY <= child.layout.y + child.layout.height
  );
  if (hit) { setSelectedId(hit.id); e.stopPropagation(); }
}
```
(Reversed so topmost widget in z-order wins on overlap.)

---

## Fix 4: Hierarchical Layers Treeview

**Problem:** Layers panel shows only top-level components, not children inside Notebook tabs or PanedWindow panes.

**Fix:** Make the tree recursive. Structure:
```
📄 Page 1
  notebook_1 (ttk.Notebook)
    [Tab 1]
      btn_1 (Button)
    [Tab 2]
  panedwindow_1 (ttk.PanedWindow)
    [Pane 1]
      label_1 (Label)
  entry_1 (Entry)
```

Each widget row is clickable → `setSelectedId(id)`. Selected widget highlighted in blue. Container headers (Notebook, PanedWindow) are also selectable. Tab/pane labels are non-clickable section headers (indented, grey).

Implementation: replace the current flat `p.components.map(c => ...)` with a recursive `renderLayerNode(comp, depth)` function that checks `comp.tabs` and `comp.panes` and renders children indented.

---

## Implementation Order

1. Fix 1: Notebook tabCount free input (1 change in inspector)
2. Fix 2: sizeDraft local state for canvas W×H inputs
3. Fix 3a: `findComponentById` recursive helper
4. Fix 3b: Notebook canvas click hit-test
5. Fix 4: Hierarchical layers treeview
6. Tests + commit
