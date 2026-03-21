# Window Properties + PanedWindow Container Design

**Date:** 2026-03-21

---

## Feature 1: Resizable Canvas + Window Properties

### Schema Extension

Add a `window` object at the root level of the project schema (alongside `theme` and `pages`):

```json
{
  "window": {
    "width": 800,
    "height": 600,
    "title": "My App",
    "minWidth": 0,
    "minHeight": 0,
    "resizableX": true,
    "resizableY": true,
    "bg": "#f0f0f0",
    "overrideredirect": false,
    "showMenuBar": false
  },
  "theme": "darkly",
  "pages": [...]
}
```

### Canvas Behavior

- Canvas dimensions driven by `window.width × window.height` (min 400×300)
- Resize handle on canvas bottom-right corner (same pattern as widget resize)
- Clicking empty canvas area selects the "window" (sets `selectedId = null`, shows window inspector)
- "Window" label shown in canvas border area

### Inspector — Window Panel

Shown when no component is selected:

| Field | Type | Maps to |
|---|---|---|
| Width | number | `window.width` → canvas size + `self.geometry()` |
| Height | number | `window.height` → canvas size + `self.geometry()` |
| Title | text | `self.title('...')` |
| Min Width | number | `self.minsize(minWidth, minHeight)` |
| Min Height | number | `self.minsize(minWidth, minHeight)` |
| Resizable X | checkbox | `self.resizable(x, y)` |
| Resizable Y | checkbox | `self.resizable(x, y)` |
| Background | color picker | `self.configure(bg='...')` |
| Override Redirect | toggle | `self.overrideredirect(True)` — removes OS title bar + decorations |
| Menu Bar | toggle | generates basic `tk.Menu(self)` + `self.config(menu=menubar)` |

### Generated Code

```python
self.geometry('800x600')
self.title('My App')
self.minsize(0, 0)
self.resizable(True, True)
self.configure(bg='#f0f0f0')
self.overrideredirect(True)     # only if enabled
menubar = tk.Menu(self)         # only if showMenuBar
self.config(menu=menubar)       # only if showMenuBar
```

---

## Feature 2: PanedWindow as Interactive Container

### Schema Change

PanedWindow component gains a `panes` array. Each pane holds its own `components` list. Child widgets carry a `parentId` and their layout coordinates are **relative to the pane's top-left**:

```json
{
  "type": "ttk.PanedWindow",
  "id": "paned_1",
  "props": { "orient": "horizontal", "paneCount": 2, "sashwidth": 4 },
  "layout": { "x": 100, "y": 50, "width": 400, "height": 300 },
  "panes": [
    { "id": "paned_1_pane_0", "components": [
      {
        "type": "Button",
        "id": "btn_1",
        "parentId": "paned_1_pane_0",
        "props": { "text": "Click" },
        "layout": { "x": 10, "y": 10, "width": 100, "height": 35 }
      }
    ]},
    { "id": "paned_1_pane_1", "components": [] }
  ]
}
```

### Canvas Preview

- PanedWindow renders its panes split by a visible sash handle
- Each pane is a distinct drop zone — highlighted with dashed border on hover
- Widgets dropped inside a pane are rendered relative to the pane's origin
- Clicking inside a pane (not on a child widget) shows PanedWindow props in inspector
- Sash proportions: each pane gets `1 / paneCount` of the total width or height

### Inspector — PanedWindow Props

| Field | Type | Values |
|---|---|---|
| orient | dropdown | horizontal / vertical |
| paneCount | number | 2 or 3 |
| sashwidth | number | px |

### Generated Code

```python
self.paned_1 = ttk.PanedWindow(self, orient='horizontal', sashwidth=4)
self.paned_1.place(x=100, y=50, width=400, height=300)

self._frame_paned_1_pane_0 = ttk.Frame(self.paned_1)
self.paned_1.add(self._frame_paned_1_pane_0, weight=1)
self._frame_paned_1_pane_1 = ttk.Frame(self.paned_1)
self.paned_1.add(self._frame_paned_1_pane_1, weight=1)

# Widgets in pane 0
self.btn_1 = ttk.Button(self._frame_paned_1_pane_0, text='Click')
self.btn_1.place(x=10, y=10, width=100, height=35)
```

---

## Implementation Order

1. Window schema + `INITIAL_SCHEMA` update
2. Canvas resize handle (reuse existing startResize pattern)
3. Window inspector panel (when nothing selected)
4. Code generator updates (window props + PanedWindow nested frames)
5. PanedWindow canvas preview with droppable panes
6. Drop logic for nested components (parentId, relative coords)
7. Tests
