# Grid Fix + ttk.Notebook Container Design

**Date:** 2026-03-22

---

## Bug Fix 1: Grid Visibility Toggle

The canvas `backgroundImage` (CSS grid lines) is currently hardcoded — always visible regardless of the `gridEnabled` state. The grid toggle button only controls snapping, not visual grid visibility.

**Fix:** Tie the canvas `backgroundImage` to `gridEnabled`:
```jsx
backgroundImage: gridEnabled
  ? "linear-gradient(#3c3c3c 1px, transparent 1px), linear-gradient(90deg, #3c3c3c 1px, transparent 1px)"
  : "none"
```

---

## Bug Fix 2: Canvas Min Size

The canvas resize handle and the inspector inputs enforce `Math.max(400, ...)` / `Math.max(300, ...)`. This prevents small windows.

**Fix:** Lower minimum to 100×100 in both:
- `startCanvasResize` doDrag: `Math.max(100, ...)`
- Inspector width onChange: `Math.max(100, ...)`
- Inspector height onChange: `Math.max(100, ...)`

---

## Feature: ttk.Notebook as Interactive Container

### Schema

```json
{
  "type": "ttk.Notebook",
  "id": "notebook_1",
  "props": { "tabCount": 2, "tabHeight": 28 },
  "layout": { "x": 100, "y": 50, "width": 400, "height": 300 },
  "tabs": [
    { "id": "notebook_1_tab_0", "label": "Tab 1", "components": [] },
    { "id": "notebook_1_tab_1", "label": "Tab 2", "components": [] }
  ]
}
```

### WIDGET_TYPES Entry

```js
{ type: 'ttk.Notebook', desc: "Contenitore a schede selezionabili", defaultProps: { tabCount: 2, tabHeight: 28 }, defaultLayout: { width: 400, height: 300 } }
```

### Canvas Preview

- Tab bar rendered at top with height = `tabHeight` px
- Each tab is a clickable button; active tab highlighted (lighter background)
- Active tab tracked in React state: `activeNotebookTab: { [notebookId]: tabIdx }`
- Content area (below tab bar) shows components of the active tab
- Widgets rendered absolutely at their relative coordinates within the content area
- Drop into content area → goes into `tabs[activeTabIdx].components` with relative coords (`y` offset by `tabHeight`)
- Clicking a tab in the canvas selects that tab (sets `activeNotebookTab`)

### Drop Logic (handleDropOnCanvas)

`findTargetNotebookTab(dropX, dropY)` helper:
- Checks if drop falls inside a `ttk.Notebook` bounding box
- Content area starts at `y + tabHeight`
- Returns `{ notebookId, tabId, tabIdx, relX, relY }` where `relY = dropY - comp.layout.y - tabHeight`
- Returns `null` if not inside any Notebook content area

### Inspector — Notebook Props

When a `ttk.Notebook` is selected:
- `tabCount`: dropdown 2/3/4 — resizes `tabs` array, preserves existing tab components
- `tabHeight`: number input (min 18, default 28)
- Per-tab label: text input for each `tabs[i].label`

Special case in `Object.keys(selectedComp.props).map`:
- `tabCount` → `<select>` 2/3/4 with panes-resize pattern
- `tabHeight` → number input

Tab labels rendered below props section.

### Generated Code

```python
style = ttk.Style()
style.configure('TNotebook.Tab', padding=[10, {tabHeight // 4}])

self.notebook_1 = ttk.Notebook(self)
self.notebook_1.place(x=100, y=50, width=400, height=300)

self._tab_notebook_1_tab_0 = ttk.Frame(self.notebook_1)
self.notebook_1.add(self._tab_notebook_1_tab_0, text='Tab 1')

self._tab_notebook_1_tab_1 = ttk.Frame(self.notebook_1)
self.notebook_1.add(self._tab_notebook_1_tab_1, text='Tab 2')

# Widgets in tab 0
self.btn_1 = ttk.Button(self._tab_notebook_1_tab_0, text='Click')
self.btn_1.place(x=10, y=10, width=100, height=35)
```

### localStorage Migration

Old schemas without `ttk.Notebook` components need no migration (new widget type simply doesn't appear in old schemas).

---

## Implementation Order

1. Bug fix: grid visibility (`backgroundImage` tied to `gridEnabled`)
2. Bug fix: min canvas size (100×100)
3. Add `ttk.Notebook` to WIDGET_TYPES + inject `tabs` on drop
4. Canvas preview for Notebook (tab bar + content area + active tab state)
5. Drop-into-notebook-tab logic (`findTargetNotebookTab`)
6. Inspector: tabCount dropdown + tabHeight input + per-tab labels
7. Backend codegen: Notebook frames + add() + nested widgets
8. Tests
