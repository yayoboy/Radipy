# Window Properties + PanedWindow Container Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add resizable canvas with window property editor and interactive PanedWindow container with droppable panes.

**Architecture:** Two independent feature sets. Feature 1 adds a `window` object to the schema root and a window inspector panel; the canvas div becomes dynamically sized. Feature 2 makes `ttk.PanedWindow` a true container: panes are droppable zones, child widgets live in `paned.panes[n].components` with relative coordinates. Both features require frontend (App.jsx) and backend (core.py) changes.

**Tech Stack:** React 18, Vitest + React Testing Library, FastAPI + pytest

---

## Task 1: Extend INITIAL_SCHEMA and PanedWindow defaultProps

**Files:**
- Modify: `frontend/src/App.jsx:30` (INITIAL_SCHEMA)
- Modify: `frontend/src/App.jsx:23` (WIDGET_TYPES ttk.PanedWindow entry)

**Step 1: Write failing test**

Add to `frontend/src/__tests__/App.test.jsx` inside `describe('App Component - Basic')`:

```jsx
describe('Window Properties', () => {
  test('schema has window object with defaults', () => {
    // Clear localStorage so we get INITIAL_SCHEMA
    localStorage.clear();
    render(<App />);
    // The canvas should render at default 800x600
    // We verify by checking the canvas resize handle exists
    expect(document.querySelector('[data-testid="canvas-resize-handle"]')).toBeNull(); // not yet added
  });
});
```

Actually write this simpler test that will pass after implementation:

```jsx
describe('Window Properties', () => {
  test('window inspector shows when nothing selected', () => {
    localStorage.clear();
    render(<App />);
    expect(screen.getByText(/window properties/i)).toBeInTheDocument();
  });
});
```

Run to confirm FAIL:
```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/frontend && npm run test:run
```

**Step 2: Update INITIAL_SCHEMA (line 30)**

```jsx
// BEFORE
const INITIAL_SCHEMA = { theme: "darkly", pages: [{ name: "Tab 1", components: [] }] };

// AFTER
const INITIAL_SCHEMA = {
  theme: "darkly",
  window: {
    width: 800,
    height: 600,
    title: "My App",
    minWidth: 0,
    minHeight: 0,
    resizableX: true,
    resizableY: true,
    bg: "",
    overrideredirect: false,
    showMenuBar: false
  },
  pages: [{ name: "Tab 1", components: [] }]
};
```

**Step 3: Add localStorage migration**

In the `useState` initializer for schema (line 36-42), add migration logic:

```jsx
const [schema, setSchema] = useState(() => {
  const saved = localStorage.getItem("radipy_project");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Migrate old schemas without window object
      if (!parsed.window) {
        parsed.window = { ...INITIAL_SCHEMA.window };
      }
      return parsed;
    } catch(e) {}
  }
  return INITIAL_SCHEMA;
});
```

**Step 4: Update ttk.PanedWindow in WIDGET_TYPES (line 23)**

```jsx
// BEFORE
{ type: 'ttk.PanedWindow', desc: "Layout split a due o più pannelli ridimensionabili", defaultProps: { orient: "vertical" }, defaultLayout: { width: 200, height: 200 } },

// AFTER
{ type: 'ttk.PanedWindow', desc: "Layout split a due o più pannelli ridimensionabili", defaultProps: { orient: "horizontal", paneCount: 2, sashwidth: 4 }, defaultLayout: { width: 400, height: 300 } },
```

**Step 5: When a PanedWindow is created (handleDropOnCanvas sidebar branch), inject panes array**

In `handleDropOnCanvas`, after building `newComp`, add:

```jsx
// After newComp is built, if it's a PanedWindow, add panes
if (newComp.type === 'ttk.PanedWindow') {
  const count = newComp.props.paneCount || 2;
  newComp.panes = Array.from({ length: count }, (_, i) => ({
    id: `${newComp.id}_pane_${i}`,
    components: []
  }));
}
```

**Step 6: Run tests**

```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/frontend && npm run test:run
```

Expected: "window inspector shows when nothing selected" still FAILS (not implemented yet). Other 16 tests PASS.

**Step 7: Commit**

```bash
git add frontend/src/App.jsx frontend/src/__tests__/App.test.jsx
git commit -m "feat: extend schema with window props and PanedWindow panes structure"
```

---

## Task 2: Resizable Canvas

**Files:**
- Modify: `frontend/src/App.jsx` (canvas JSX and startCanvasResize handler)

**Step 1: Make canvas size dynamic**

Find the canvas `<div>` (the one with `ref={canvasRef}`, `width: "800px"`, `height: "600px"`). Change to use `schema.window`:

```jsx
// BEFORE
style={{ width: "800px", height: "600px", ... }}

// AFTER
style={{ width: `${schema.window?.width ?? 800}px`, height: `${schema.window?.height ?? 600}px`, ... }}
```

**Step 2: Add startCanvasResize handler**

After `startResize` function, add:

```jsx
const startCanvasResize = (e) => {
  e.stopPropagation();
  e.preventDefault();

  const startX = e.clientX;
  const startY = e.clientY;
  const startWidth = schema.window?.width ?? 800;
  const startHeight = schema.window?.height ?? 600;
  let finalWidth = startWidth;
  let finalHeight = startHeight;

  const doDrag = (dragEvent) => {
    finalWidth = Math.max(400, snapToGrid(startWidth + (dragEvent.clientX - startX), gridEnabled));
    finalHeight = Math.max(300, snapToGrid(startHeight + (dragEvent.clientY - startY), gridEnabled));
    setSchema(prev => ({
      ...prev,
      window: { ...prev.window, width: finalWidth, height: finalHeight }
    }));
  };

  const stopDrag = () => {
    document.removeEventListener('mousemove', doDrag);
    document.removeEventListener('mouseup', stopDrag);
    setSchemaWithHistory(prev => ({
      ...prev,
      window: { ...prev.window, width: finalWidth, height: finalHeight }
    }));
  };

  document.addEventListener('mousemove', doDrag);
  document.addEventListener('mouseup', stopDrag);
};
```

**Step 3: Add resize handle to canvas JSX**

Inside the canvas `<div>` (after the components map and drag preview), add:

```jsx
{/* Canvas resize handle */}
<div
  data-testid="canvas-resize-handle"
  onMouseDown={startCanvasResize}
  style={{
    position: "absolute",
    right: "-6px",
    bottom: "-6px",
    width: "12px",
    height: "12px",
    backgroundColor: "#c586c0",
    cursor: "se-resize",
    borderRadius: "50%",
    zIndex: 200,
    border: "2px solid #1e1e1e"
  }}
/>
```

**Step 4: Run tests**

```bash
npm run test:run
```

Expected: 16 PASS + the window test still FAILS (window inspector not yet shown).

**Step 5: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: dynamic canvas size from schema.window with resize handle"
```

---

## Task 3: Window Inspector Panel

**Files:**
- Modify: `frontend/src/App.jsx` (inspector JSX, around the `!selectedComp` branch)

**Step 1: Replace "Select a component" placeholder with window inspector**

Find the inspector panel where `!selectedComp` renders a placeholder (around line 660):

```jsx
// BEFORE
{!selectedComp ? (
  <p style={{ fontSize: "12px", color: "#858585", fontStyle: "italic" }}>Select a component to edit.</p>
) : (
  ...component inspector...
)}
```

Replace the placeholder branch with the window properties panel:

```jsx
{!selectedComp ? (
  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
    <strong style={{ fontSize: "12px", color: "#c586c0" }}>Window Properties</strong>
    <div style={{ height: "1px", backgroundColor: "#3c3c3c" }} />

    {/* Width / Height */}
    <span style={{ fontSize: "11px", color: "#858585" }}>Size (w × h)</span>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px" }}>
      <div>
        <span style={{ fontSize: "10px" }}>W:</span>
        <input type="number" value={schema.window?.width ?? 800}
          onChange={e => setSchemaWithHistory(prev => ({ ...prev, window: { ...prev.window, width: Math.max(400, parseInt(e.target.value)||400) } }))}
          style={{ width: "100%", background: "#3c3c3c", border: "1px solid #555", color: "white", padding: "3px" }} />
      </div>
      <div>
        <span style={{ fontSize: "10px" }}>H:</span>
        <input type="number" value={schema.window?.height ?? 600}
          onChange={e => setSchemaWithHistory(prev => ({ ...prev, window: { ...prev.window, height: Math.max(300, parseInt(e.target.value)||300) } }))}
          style={{ width: "100%", background: "#3c3c3c", border: "1px solid #555", color: "white", padding: "3px" }} />
      </div>
    </div>

    {/* Title */}
    <span style={{ fontSize: "10px", color: "#ccc" }}>title:</span>
    <input type="text" value={schema.window?.title ?? ""}
      onChange={e => setSchemaWithHistory(prev => ({ ...prev, window: { ...prev.window, title: e.target.value } }))}
      style={{ width: "100%", background: "#3c3c3c", border: "1px solid #555", color: "white", padding: "3px" }} />

    {/* Min Width / Min Height */}
    <span style={{ fontSize: "11px", color: "#858585" }}>Min Size (w × h)</span>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px" }}>
      <div>
        <span style={{ fontSize: "10px" }}>W:</span>
        <input type="number" value={schema.window?.minWidth ?? 0}
          onChange={e => setSchemaWithHistory(prev => ({ ...prev, window: { ...prev.window, minWidth: parseInt(e.target.value)||0 } }))}
          style={{ width: "100%", background: "#3c3c3c", border: "1px solid #555", color: "white", padding: "3px" }} />
      </div>
      <div>
        <span style={{ fontSize: "10px" }}>H:</span>
        <input type="number" value={schema.window?.minHeight ?? 0}
          onChange={e => setSchemaWithHistory(prev => ({ ...prev, window: { ...prev.window, minHeight: parseInt(e.target.value)||0 } }))}
          style={{ width: "100%", background: "#3c3c3c", border: "1px solid #555", color: "white", padding: "3px" }} />
      </div>
    </div>

    {/* Resizable */}
    <span style={{ fontSize: "11px", color: "#858585" }}>Resizable</span>
    <div style={{ display: "flex", gap: "15px" }}>
      <label style={{ fontSize: "11px", color: "#ccc", display: "flex", alignItems: "center", gap: "4px" }}>
        <input type="checkbox" checked={schema.window?.resizableX ?? true}
          onChange={e => setSchemaWithHistory(prev => ({ ...prev, window: { ...prev.window, resizableX: e.target.checked } }))} />
        X
      </label>
      <label style={{ fontSize: "11px", color: "#ccc", display: "flex", alignItems: "center", gap: "4px" }}>
        <input type="checkbox" checked={schema.window?.resizableY ?? true}
          onChange={e => setSchemaWithHistory(prev => ({ ...prev, window: { ...prev.window, resizableY: e.target.checked } }))} />
        Y
      </label>
    </div>

    {/* Background */}
    <span style={{ fontSize: "10px", color: "#ccc" }}>bg (background):</span>
    <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
      <input type="color" value={schema.window?.bg || "#f0f0f0"}
        onChange={e => setSchemaWithHistory(prev => ({ ...prev, window: { ...prev.window, bg: e.target.value } }))}
        style={{ width: "40px", cursor: "pointer", padding: "0", border: "none", background: "transparent" }} />
      <input type="text" value={schema.window?.bg ?? ""}
        onChange={e => setSchemaWithHistory(prev => ({ ...prev, window: { ...prev.window, bg: e.target.value } }))}
        style={{ flex: 1, background: "#3c3c3c", border: "1px solid #555", color: "white", padding: "3px" }} />
    </div>

    {/* Override Redirect */}
    <label style={{ fontSize: "11px", color: "#569cd6", display: "flex", alignItems: "center", gap: "6px" }}>
      <input type="checkbox" checked={schema.window?.overrideredirect ?? false}
        onChange={e => setSchemaWithHistory(prev => ({ ...prev, window: { ...prev.window, overrideredirect: e.target.checked } }))} />
      Override Redirect (no title bar)
    </label>

    {/* Menu Bar */}
    <label style={{ fontSize: "11px", color: "#569cd6", display: "flex", alignItems: "center", gap: "6px" }}>
      <input type="checkbox" checked={schema.window?.showMenuBar ?? false}
        onChange={e => setSchemaWithHistory(prev => ({ ...prev, window: { ...prev.window, showMenuBar: e.target.checked } }))} />
      Show Menu Bar
    </label>
  </div>
) : (
  ...existing component inspector...
)}
```

**Step 2: Run tests**

```bash
npm run test:run
```

Expected: 17 PASS (the window inspector test now passes too).

**Step 3: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: window properties inspector panel with all window settings"
```

---

## Task 4: Backend — Window Props in Code Generator

**Files:**
- Modify: `backend/generator/core.py`
- Test: `backend/tests/test_generator.py`

**Step 1: Write failing tests**

Add to `backend/tests/test_generator.py`:

```python
def test_window_props_title_and_geometry():
    project = {
        "window": {"width": 1024, "height": 768, "title": "Test App",
                   "minWidth": 200, "minHeight": 150,
                   "resizableX": False, "resizableY": True,
                   "bg": "#ff0000", "overrideredirect": False, "showMenuBar": False},
        "theme": "",
        "pages": [{"name": "Main", "components": []}]
    }
    code = generate_tkinter_code(project)
    assert "self.geometry('1024x768')" in code
    assert "self.title('Test App')" in code
    assert "self.minsize(200, 150)" in code
    assert "self.resizable(False, True)" in code
    assert "self.configure(bg='#ff0000')" in code

def test_window_overrideredirect():
    project = {
        "window": {"width": 800, "height": 600, "title": "App",
                   "minWidth": 0, "minHeight": 0,
                   "resizableX": True, "resizableY": True,
                   "bg": "", "overrideredirect": True, "showMenuBar": False},
        "theme": "",
        "pages": [{"name": "Main", "components": []}]
    }
    code = generate_tkinter_code(project)
    assert "self.overrideredirect(True)" in code

def test_window_show_menubar():
    project = {
        "window": {"width": 800, "height": 600, "title": "App",
                   "minWidth": 0, "minHeight": 0,
                   "resizableX": True, "resizableY": True,
                   "bg": "", "overrideredirect": False, "showMenuBar": True},
        "theme": "",
        "pages": [{"name": "Main", "components": []}]
    }
    code = generate_tkinter_code(project)
    assert "menubar = tk.Menu(self)" in code
    assert "self.config(menu=menubar)" in code

def test_window_defaults_when_missing():
    """Old schemas without window object still generate valid code."""
    project = {
        "theme": "",
        "pages": [{"name": "Main", "components": []}]
    }
    code = generate_tkinter_code(project)
    assert "self.geometry('800x600')" in code
    assert "self.title('Radipy Generated UI')" in code
```

Run to confirm FAIL:
```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/backend && python3 -m pytest tests/test_generator.py -k "window" -v
```

**Step 2: Update generate_tkinter_code in core.py**

Replace the hardcoded lines (around line 44-50):

```python
# BEFORE
lines.append("        self.title('Radipy Generated UI')")
lines.append("        self.geometry('800x600')")

# AFTER — read from window object with fallbacks
win = project_json.get("window", {})
w_width = win.get("width", 800)
w_height = win.get("height", 600)
w_title = win.get("title", "Radipy Generated UI")
w_minw = win.get("minWidth", 0)
w_minh = win.get("minHeight", 0)
w_resx = win.get("resizableX", True)
w_resy = win.get("resizableY", True)
w_bg = win.get("bg", "")
w_override = win.get("overrideredirect", False)
w_menubar = win.get("showMenuBar", False)

lines.append(f"        self.title('{w_title}')")
lines.append(f"        self.geometry('{w_width}x{w_height}')")
if w_minw or w_minh:
    lines.append(f"        self.minsize({w_minw}, {w_minh})")
lines.append(f"        self.resizable({w_resx}, {w_resy})")
if w_bg:
    lines.append(f"        self.configure(bg='{w_bg}')")
if w_override:
    lines.append(f"        self.overrideredirect(True)")
if w_menubar:
    lines.append(f"        menubar = tk.Menu(self)")
    lines.append(f"        self.config(menu=menubar)")
```

**Step 3: Run tests**

```bash
python3 -m pytest tests/test_generator.py -v
```

Expected: All PASS including the 4 new window tests.

**Step 4: Commit**

```bash
git add backend/generator/core.py backend/tests/test_generator.py
git commit -m "feat: generate window props (title, geometry, minsize, resizable, bg, overrideredirect, menubar)"
```

---

## Task 5: PanedWindow Canvas Preview with Droppable Panes

**Files:**
- Modify: `frontend/src/App.jsx` (renderPreview for PanedWindow + handleDropOnCanvas)

**Step 1: Update renderPreview for ttk.PanedWindow**

Find the `renderPreview` function and update the `ttk.PanedWindow` case.

Currently it renders a static split. Replace with a dynamic version that renders actual pane drop zones.
The `renderPreview` function receives the full `comp` object (not just `comp.props`), so we can access `comp.panes`.

```jsx
case 'ttk.PanedWindow': {
  const orient = comp.props?.orient || 'horizontal';
  const panes = comp.panes || [];
  const paneCount = comp.props?.paneCount || 2;
  const isHorizontal = orient === 'horizontal';

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex",
      flexDirection: isHorizontal ? "row" : "column",
      background: "#252526",
      border: "1px solid #4a4a4a",
      overflow: "hidden",
      position: "relative"
    }}>
      {Array.from({ length: paneCount }, (_, i) => {
        const pane = panes[i] || { id: `pane_${i}`, components: [] };
        return (
          <React.Fragment key={i}>
            <div
              data-paneid={pane.id}
              style={{
                flex: 1,
                position: "relative",
                border: "1px dashed #555",
                minWidth: 0,
                minHeight: 0,
                overflow: "hidden"
              }}
            >
              {/* Pane label */}
              <span style={{
                position: "absolute", top: 2, left: 4,
                fontSize: "9px", color: "#555", pointerEvents: "none"
              }}>
                Pane {i}
              </span>
              {/* Render child components */}
              {pane.components && pane.components.map(child => (
                <div
                  key={child.id}
                  style={{
                    position: "absolute",
                    left: child.layout.x,
                    top: child.layout.y,
                    width: child.layout.width,
                    height: child.layout.height,
                    pointerEvents: "none"
                  }}
                >
                  {renderPreview(child)}
                </div>
              ))}
            </div>
            {/* Sash divider (not after last pane) */}
            {i < paneCount - 1 && (
              <div style={{
                [isHorizontal ? 'width' : 'height']: `${comp.props?.sashwidth || 4}px`,
                background: "#666",
                cursor: isHorizontal ? "col-resize" : "row-resize",
                flexShrink: 0
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
```

**Step 2: Update handleDropOnCanvas to detect PanedWindow pane drops**

In `handleDropOnCanvas`, in the `data.source === 'sidebar'` branch, BEFORE the existing code that adds to `page.components`, add a pane detection helper:

```jsx
// Helper: find which PanedWindow pane the drop falls into
const findTargetPane = (dropX, dropY) => {
  const comps = schema.pages[activePage]?.components || [];
  for (const comp of comps) {
    if (comp.type !== 'ttk.PanedWindow' || !comp.panes) continue;
    const { x, y, width, height } = comp.layout;
    if (dropX < x || dropX > x + width || dropY < y || dropY > y + height) continue;
    // Inside this PanedWindow — find which pane
    const isHorizontal = (comp.props?.orient || 'horizontal') === 'horizontal';
    const paneCount = comp.panes.length;
    const paneSize = isHorizontal ? width / paneCount : height / paneCount;
    const offset = isHorizontal ? (dropX - x) : (dropY - y);
    const paneIdx = Math.min(Math.floor(offset / paneSize), paneCount - 1);
    const pane = comp.panes[paneIdx];
    // Relative coordinates within pane
    const relX = isHorizontal
      ? Math.max(0, snapToGrid(dropX - x - paneIdx * paneSize, gridEnabled))
      : Math.max(0, snapToGrid(dropX - x, gridEnabled));
    const relY = isHorizontal
      ? Math.max(0, snapToGrid(dropY - y, gridEnabled))
      : Math.max(0, snapToGrid(dropY - y - paneIdx * paneSize, gridEnabled));
    return { panedId: comp.id, paneId: pane.id, paneIdx, relX, relY };
  }
  return null;
};
```

Then in the `data.source === 'sidebar'` branch, modify the drop logic:

```jsx
if (data.source === 'sidebar') {
  const x = Math.max(0, snapToGrid(Math.round(e.clientX - canvasRect.left), gridEnabled));
  const y = Math.max(0, snapToGrid(Math.round(e.clientY - canvasRect.top), gridEnabled));

  const targetPane = findTargetPane(x, y);

  const newComp = {
    type: data.widget.type,
    id: generateId(data.widget.type.replace("ttk.", "").replace("MapView", "Map").replace("MatplotlibChart", "Chart")),
    props: { ...data.widget.defaultProps },
    layout: {
      x: targetPane ? targetPane.relX : x,
      y: targetPane ? targetPane.relY : y,
      ...data.widget.defaultLayout
    },
    ...(targetPane ? { parentId: targetPane.paneId } : {})
  };

  // Add PanedWindow panes if this is a PanedWindow being dropped
  if (newComp.type === 'ttk.PanedWindow') {
    const count = newComp.props.paneCount || 2;
    newComp.panes = Array.from({ length: count }, (_, i) => ({
      id: `${newComp.id}_pane_${i}`,
      components: []
    }));
  }

  setSchemaWithHistory(prev => {
    const newPages = [...prev.pages];
    if (targetPane) {
      // Add to pane
      const panedComp = newPages[activePage].components.find(c => c.id === targetPane.panedId);
      if (panedComp) {
        const pane = panedComp.panes.find(p => p.id === targetPane.paneId);
        if (pane) pane.components.push(newComp);
      }
    } else {
      // Add to page top-level
      newPages[activePage].components.push(newComp);
    }
    return { ...prev, pages: newPages };
  });
  setSelectedId(newComp.id);
  setDragPreview(null);
}
```

**Step 3: Run tests**

```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/frontend && npm run test:run
```

Expected: All 17 tests PASS.

**Step 4: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: PanedWindow droppable panes with child component rendering"
```

---

## Task 6: PanedWindow Inspector Props + paneCount change

**Files:**
- Modify: `frontend/src/App.jsx` (inspector panel for PanedWindow)

**Step 1: In the component inspector, handle paneCount changes**

When the user changes `paneCount` in the inspector for a PanedWindow, the `panes` array must be resized. Find `updateComponentProps` and add special handling. Instead of modifying `updateComponentProps` directly, intercept the change in the inspector JSX.

In the inspector properties section, for the `paneCount` key of a `ttk.PanedWindow`, replace the generic text input with a number input that also updates `panes`:

Find where props are rendered (the `Object.keys(selectedComp.props).map(key => {...})` block). Add a special case at the top:

```jsx
// At start of the props map, before the generic input
if (selectedComp.type === 'ttk.PanedWindow' && key === 'paneCount') {
  return (
    <div key={key} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      <span style={{ fontSize: "10px", color: "#ccc" }}>paneCount:</span>
      <select
        value={selectedComp.props.paneCount || 2}
        onChange={e => {
          const newCount = parseInt(e.target.value);
          setSchemaWithHistory(prev => {
            const newPages = [...prev.pages];
            const comp = newPages[activePage].components.find(c => c.id === selectedId);
            if (comp) {
              comp.props.paneCount = newCount;
              // Resize panes array, preserve existing pane components
              const existingPanes = comp.panes || [];
              comp.panes = Array.from({ length: newCount }, (_, i) =>
                existingPanes[i] || { id: `${comp.id}_pane_${i}`, components: [] }
              );
            }
            return { ...prev, pages: newPages };
          });
        }}
        style={{ background: "#3c3c3c", border: "1px solid #555", color: "white", padding: "3px" }}
      >
        <option value={2}>2</option>
        <option value={3}>3</option>
      </select>
    </div>
  );
}
```

**Step 2: Filter out internal-only props from inspector**

In the `base_props` filter logic and in the inspector, ensure `paneCount` is shown but `panes` (the internal array) is not. In the inspector `Object.keys(selectedComp.props)` loop, skip keys that are internal:

The `panes` array is NOT in `comp.props` — it's a top-level field on the component — so it won't appear in the inspector automatically. Good, no change needed.

**Step 3: Run tests**

```bash
npm run test:run
```

Expected: All 17 tests PASS.

**Step 4: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: PanedWindow paneCount inspector with panes resize"
```

---

## Task 7: Backend — PanedWindow Code Generation

**Files:**
- Modify: `backend/generator/core.py`
- Test: `backend/tests/test_generator.py`

**Step 1: Write failing tests**

Add to `backend/tests/test_generator.py`:

```python
def test_panedwindow_generates_frames_and_add():
    project = {
        "theme": "",
        "pages": [{
            "name": "Main",
            "components": [{
                "type": "ttk.PanedWindow",
                "id": "paned_1",
                "props": {"orient": "horizontal", "paneCount": 2, "sashwidth": 4},
                "layout": {"x": 0, "y": 0, "width": 400, "height": 300},
                "panes": [
                    {"id": "paned_1_pane_0", "components": []},
                    {"id": "paned_1_pane_1", "components": []}
                ]
            }]
        }]
    }
    code = generate_tkinter_code(project)
    assert "self.paned_1 = ttk.PanedWindow" in code
    assert "self._frame_paned_1_pane_0 = ttk.Frame(self.paned_1)" in code
    assert "self.paned_1.add(self._frame_paned_1_pane_0" in code
    assert "self._frame_paned_1_pane_1 = ttk.Frame(self.paned_1)" in code
    assert "self.paned_1.add(self._frame_paned_1_pane_1" in code

def test_panedwindow_nested_widgets():
    project = {
        "theme": "",
        "pages": [{
            "name": "Main",
            "components": [{
                "type": "ttk.PanedWindow",
                "id": "paned_1",
                "props": {"orient": "horizontal", "paneCount": 2, "sashwidth": 4},
                "layout": {"x": 0, "y": 0, "width": 400, "height": 300},
                "panes": [
                    {"id": "paned_1_pane_0", "components": [
                        {"type": "Button", "id": "btn_1",
                         "parentId": "paned_1_pane_0",
                         "props": {"text": "Click"},
                         "layout": {"x": 10, "y": 10, "width": 80, "height": 30}}
                    ]},
                    {"id": "paned_1_pane_1", "components": []}
                ]
            }]
        }]
    }
    code = generate_tkinter_code(project)
    assert "self.btn_1 = tk.Button(self._frame_paned_1_pane_0" in code
    assert "self.btn_1.place(x=10, y=10" in code
```

Run to confirm FAIL:
```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/backend && python3 -m pytest tests/test_generator.py -k "panedwindow" -v
```

**Step 2: Add PanedWindow case to generate_tkinter_code**

In `core.py`, find the `for comp in page.get("components", []):` loop. Add a dedicated branch for `ttk.PanedWindow` BEFORE the generic `else` branch:

```python
elif comp_type == "ttk.PanedWindow":
    orient = props.get("orient", "horizontal")
    sashwidth = props.get("sashwidth", 4)
    lines.append(f"        {comp_id} = ttk.PanedWindow({parent}, orient='{orient}', sashwidth={sashwidth})")
    lines.append(f"        {comp_id}.place({place_params})")
    lines.append("")

    # Generate frames for each pane
    panes = comp.get("panes", [])
    for pane in panes:
        pane_id = pane.get("id", "")
        frame_var = f"self._{pane_id.replace('-', '_')}"
        # Use ttk.Frame if theme, else tk.Frame
        frame_cls = "ttk.Frame" if theme else "tk.Frame"
        lines.append(f"        {frame_var} = {frame_cls}({comp_id})")
        lines.append(f"        {comp_id}.add({frame_var}, weight=1)")
        lines.append("")

        # Generate child components inside this pane
        for child in pane.get("components", []):
            child_type = child.get("type")
            child_id = f"self.{child.get('id')}"
            child_props = child.get("props", {})
            child_layout = child.get("layout", {})
            child_base_props = {k: v for k, v in child_props.items()
                                if k not in ["tabs", "iconName", "color", "size", "commandEvent", "paneCount"]}
            if "commandEvent" in child_props and child_props["commandEvent"].strip():
                cmd_fn = child_props["commandEvent"].strip()
                commands.add(cmd_fn)
                child_base_props["command"] = f"self.{cmd_fn}"
            child_kwargs = ", ".join(
                f"{k}={v}" if k == "command" else
                f"{k}='{v}'" if isinstance(v, str) else f"{k}={v}"
                for k, v in child_base_props.items()
            )
            if theme:
                child_cls = child_type.split(".")[1] if child_type.startswith("ttk.") else child_type
                lines.append(f"        {child_id} = ttk.{child_cls}({frame_var}, {child_kwargs})")
            else:
                if child_type.startswith("ttk."):
                    child_cls = child_type.split(".")[1]
                    lines.append(f"        {child_id} = ttk.{child_cls}({frame_var}, {child_kwargs})")
                else:
                    lines.append(f"        {child_id} = tk.{child_type}({frame_var}, {child_kwargs})")
            cx = child_layout.get("x", 0)
            cy = child_layout.get("y", 0)
            cw = child_layout.get("width")
            ch = child_layout.get("height")
            cp = f"x={cx}, y={cy}"
            if cw: cp += f", width={cw}"
            if ch: cp += f", height={ch}"
            lines.append(f"        {child_id}.place({cp})")
            lines.append("")

    continue  # Skip the generic place() call at end of loop
```

**Important:** The `place_params` variable is computed before the `if/elif` chain in the existing code. For PanedWindow, we call `.place()` directly inside the branch and `continue` to skip the generic `.place()` at the end of the loop. You need to move the `place_params` computation ABOVE the if/elif chain so it's available in the PanedWindow branch.

The loop currently ends with:
```python
lines.append(f"        {comp_id}.place({place_params})")
lines.append("")
```

Add `continue` after the PanedWindow branch so these lines are skipped.

**Step 3: Filter `paneCount` from base_props**

In the existing `base_props` filter (line 79), add `"paneCount"` to the exclusion list:

```python
# BEFORE
base_props = {k: v for k, v in props.items() if k not in ["tabs", "iconName", "color", "size", "commandEvent"]}

# AFTER
base_props = {k: v for k, v in props.items() if k not in ["tabs", "iconName", "color", "size", "commandEvent", "paneCount"]}
```

**Step 4: Run all backend tests**

```bash
python3 -m pytest tests/ -v
```

Expected: All 59 + new tests PASS.

**Step 5: Commit**

```bash
git add backend/generator/core.py backend/tests/test_generator.py
git commit -m "feat: generate PanedWindow with frames, panes, and nested widgets"
```

---

## Task 8: Final Integration Test

**Files:**
- Test: `frontend/src/__tests__/App.test.jsx`
- Run: both test suites

**Step 1: Add a few more frontend tests**

Add to `frontend/src/__tests__/App.test.jsx`:

```jsx
describe('Canvas', () => {
  test('canvas resize handle renders', () => {
    localStorage.clear();
    render(<App />);
    expect(document.querySelector('[data-testid="canvas-resize-handle"]')).toBeInTheDocument();
  });
});
```

**Step 2: Run full frontend suite**

```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/frontend && npm run test:run
```

Expected: 18+ tests, all PASS.

**Step 3: Run full backend suite**

```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/backend && python3 -m pytest -v
```

Expected: All PASS.

**Step 4: Final commit**

```bash
git add .
git commit -m "feat: radipy v0.3.0 — resizable canvas, window properties, PanedWindow containers"
```

---

## Summary

| Task | Changes | Files |
|---|---|---|
| 1 | INITIAL_SCHEMA + localStorage migration + PanedWindow defaultProps | App.jsx |
| 2 | Dynamic canvas size + startCanvasResize | App.jsx |
| 3 | Window inspector panel (all props) | App.jsx |
| 4 | Backend window props codegen | core.py |
| 5 | PanedWindow droppable panes + drop detection | App.jsx |
| 6 | PanedWindow paneCount inspector + panes resize | App.jsx |
| 7 | Backend PanedWindow codegen (frames + children) | core.py |
| 8 | Integration tests | both |
