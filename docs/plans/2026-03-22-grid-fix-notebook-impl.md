# Grid Fix + ttk.Notebook Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the grid visibility toggle and canvas min-size constraint, then add ttk.Notebook as a real interactive container with selectable, droppable tabs.

**Architecture:** Two bug fixes in App.jsx (one CSS line, two parseInt calls). The Notebook feature follows the exact same pattern as ttk.PanedWindow: `tabs` array on the component (not in `props`), `findTargetNotebookTab` helper for drop routing, `activeNotebookTab` React state for tab selection, and a backend codegen branch that emits ttk.Frame + `.add(frame, text='...')` per tab. `updateComponentLayout` and `deleteComponent` are extended to search inside `tabs[*].components` just as they already search `panes[*].components`.

**Tech Stack:** React 18, Vitest + React Testing Library, FastAPI + pytest

---

## Task 1: Bug Fix — Grid visibility + min-size

**Files:**
- Modify: `frontend/src/App.jsx`
- Test: `frontend/src/__tests__/App.test.jsx`

**Step 1: Write failing tests**

Add to `frontend/src/__tests__/App.test.jsx` inside `describe('App Component - Basic')`:

```jsx
describe('Grid', () => {
  test('grid button toggles grid label ON/OFF', () => {
    render(<App />);
    const btn = screen.getByTitle('Grid Snapping');
    expect(btn).toHaveTextContent('Grid: ON');
    btn.click();
    expect(btn).toHaveTextContent('Grid: OFF');
  });
});
```

Run:
```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/frontend && npm run test:run
```
Expected: this test FAILs (the button text check should actually pass since the state works — but the visual test is enough to confirm the toggle works).

Actually, this test will pass already. The bug is visual (backgroundImage always on). Since we can't test CSS `backgroundImage` in jsdom easily, we'll skip a dedicated visual test and just verify the fix is in place via code review.

**Step 2: Fix canvas backgroundImage (line 957)**

Find the canvas `<div>` with the hardcoded `backgroundImage`. Change:
```jsx
// BEFORE (line ~957)
backgroundImage: "linear-gradient(#3c3c3c 1px, transparent 1px), linear-gradient(90deg, #3c3c3c 1px, transparent 1px)", backgroundSize: "20px 20px"

// AFTER
backgroundImage: gridEnabled
  ? "linear-gradient(#3c3c3c 1px, transparent 1px), linear-gradient(90deg, #3c3c3c 1px, transparent 1px)"
  : "none",
backgroundSize: "20px 20px"
```

**Step 3: Fix min-size in startCanvasResize doDrag (lines 339-340)**

```jsx
// BEFORE
finalWidth = Math.max(400, snapToGrid(startWidth + (dragEvent.clientX - startX), gridEnabled));
finalHeight = Math.max(300, snapToGrid(startHeight + (dragEvent.clientY - startY), gridEnabled));

// AFTER
finalWidth = Math.max(100, snapToGrid(startWidth + (dragEvent.clientX - startX), gridEnabled));
finalHeight = Math.max(100, snapToGrid(startHeight + (dragEvent.clientY - startY), gridEnabled));
```

Also fix stopDrag (line ~352) if it also uses Math.max(400/300) — search and replace similarly.

**Step 4: Fix min-size in window inspector inputs (lines 1042, 1048)**

```jsx
// Width input onChange:
width: Math.max(100, parseInt(e.target.value)||100)

// Height input onChange:
height: Math.max(100, parseInt(e.target.value)||100)
```

**Step 5: Run tests**

```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/frontend && npm run test:run
```
Expected: all 18 tests PASS.

**Step 6: Commit**

```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/frontend && git add src/App.jsx src/__tests__/App.test.jsx && git commit -m "fix: grid visibility tied to gridEnabled toggle, canvas min-size 100x100"
```

---

## Task 2: Add ttk.Notebook to WIDGET_TYPES + inject tabs on drop

**Files:**
- Modify: `frontend/src/App.jsx` (WIDGET_TYPES line 6-27, handleDropOnCanvas sidebar branch, state declaration)

**Step 1: Write failing test**

Add to `frontend/src/__tests__/App.test.jsx`:

```jsx
describe('Notebook Widget', () => {
  test('ttk.Notebook appears in widget sidebar', () => {
    render(<App />);
    expect(screen.getByText('ttk.Notebook')).toBeInTheDocument();
  });
});
```

Run: `npm run test:run` — Expected: FAIL (widget not in sidebar yet).

**Step 2: Add to WIDGET_TYPES (after ttk.PanedWindow on line 23)**

```jsx
{ type: 'ttk.Notebook', desc: "Contenitore a schede selezionabili e droppabili", defaultProps: { tabCount: 2, tabHeight: 28 }, defaultLayout: { width: 400, height: 300 } },
```

**Step 3: Add activeNotebookTab state (after gridEnabled on line 78)**

```jsx
const [activeNotebookTab, setActiveNotebookTab] = useState({}); // { [notebookId]: tabIdx }
```

**Step 4: Inject tabs array when a Notebook is dropped (in handleDropOnCanvas, sidebar branch)**

After the existing PanedWindow injection block (lines 205-212), add:

```jsx
// Add Notebook tabs if this is a Notebook being dropped
if (newComp.type === 'ttk.Notebook') {
  const count = newComp.props.tabCount || 2;
  newComp.tabs = Array.from({ length: count }, (_, i) => ({
    id: `${newComp.id}_tab_${i}`,
    label: `Tab ${i + 1}`,
    components: []
  }));
}
```

**Step 5: Run tests**

```bash
npm run test:run
```
Expected: 19 tests PASS (the new Notebook sidebar test now passes).

**Step 6: Commit**

```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/frontend && git add src/App.jsx src/__tests__/App.test.jsx && git commit -m "feat: add ttk.Notebook to WIDGET_TYPES with tabs injection on drop"
```

---

## Task 3: Canvas Preview for ttk.Notebook + tab click selection

**Files:**
- Modify: `frontend/src/App.jsx` (renderPreview function + canvas comp onClick)

**Step 1: Write failing test**

Add to `frontend/src/__tests__/App.test.jsx`:

```jsx
test('window inspector shows when nothing selected', () => {
  // existing test — verify it still passes
});
```

(No new test needed here — the renderPreview is visually tested via integration. Instead we verify 19 tests still pass after the change.)

**Step 2: Add renderPreview case for ttk.Notebook**

Find the `renderPreview` function and the `switch/case` block. Add a case for `ttk.Notebook`:

```jsx
case 'ttk.Notebook': {
  const tabs = comp.tabs || [];
  const tabHeight = comp.props?.tabHeight || 28;
  const activeTabIdx = activeNotebookTab[comp.id] ?? 0;
  const paneCount = tabs.length || comp.props?.tabCount || 2;

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#252526",
      border: "1px solid #4a4a4a",
      display: "flex", flexDirection: "column",
      overflow: "hidden"
    }}>
      {/* Tab bar */}
      <div style={{
        display: "flex",
        height: `${tabHeight}px`,
        borderBottom: "1px solid #555",
        flexShrink: 0,
        overflow: "hidden"
      }}>
        {Array.from({ length: paneCount }, (_, i) => {
          const tab = tabs[i] || { label: `Tab ${i + 1}` };
          const isActive = i === activeTabIdx;
          return (
            <div key={i} style={{
              padding: "0 12px",
              display: "flex",
              alignItems: "center",
              fontSize: "11px",
              color: isActive ? "#ffffff" : "#888",
              background: isActive ? "#3c3c3c" : "transparent",
              borderRight: "1px solid #555",
              borderBottom: isActive ? "2px solid #569cd6" : "none",
              whiteSpace: "nowrap",
              flexShrink: 0
            }}>
              {tab.label || `Tab ${i + 1}`}
            </div>
          );
        })}
      </div>
      {/* Content area */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <span style={{
          position: "absolute", top: 2, left: 4,
          fontSize: "9px", color: "#555", pointerEvents: "none"
        }}>
          Tab {activeTabIdx}
        </span>
        {tabs[activeTabIdx]?.components?.map(child => (
          <div key={child.id} style={{
            position: "absolute",
            left: child.layout.x,
            top: child.layout.y,
            width: child.layout.width,
            height: child.layout.height,
            pointerEvents: "none"
          }}>
            {renderPreview(child)}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 3: Handle tab click in the canvas comp onClick handler**

Find the canvas component map (around line 961) where each comp has:
```jsx
onClick={(e) => { e.stopPropagation(); setSelectedId(comp.id); }}
```

Extend it to detect Notebook tab bar clicks:
```jsx
onClick={(e) => {
  e.stopPropagation();
  setSelectedId(comp.id);
  // For Notebook: detect which tab was clicked
  if (comp.type === 'ttk.Notebook' && comp.tabs) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const tabHeight = comp.props?.tabHeight || 28;
    if (relY <= tabHeight) {
      const relX = e.clientX - rect.left;
      const tabCount = comp.tabs.length;
      const tabWidth = rect.width / tabCount;
      const tabIdx = Math.min(Math.floor(relX / tabWidth), tabCount - 1);
      setActiveNotebookTab(prev => ({ ...prev, [comp.id]: tabIdx }));
    }
  }
}}
```

**Step 4: Run tests**

```bash
npm run test:run
```
Expected: all 19 tests PASS.

**Step 5: Commit**

```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/frontend && git add src/App.jsx && git commit -m "feat: Notebook canvas preview with tab bar, active tab content, and click-to-switch tabs"
```

---

## Task 4: Drop-into-Notebook-Tab logic

**Files:**
- Modify: `frontend/src/App.jsx` (handleDropOnCanvas, updateComponentLayout, deleteComponent)

**Step 1: Add findTargetNotebookTab helper in handleDropOnCanvas**

After `findTargetPane` (line ~185), add:

```jsx
// Helper: find which Notebook tab the drop falls into
const findTargetNotebookTab = (dropX, dropY) => {
  const comps = schema.pages[activePage]?.components || [];
  for (const comp of comps) {
    if (comp.type !== 'ttk.Notebook' || !comp.tabs || comp.tabs.length === 0) continue;
    const { x, y, width, height } = comp.layout;
    if (dropX < x || dropX > x + width || dropY < y || dropY > y + height) continue;
    const tabHeight = comp.props?.tabHeight || 28;
    // Must be in content area (below tab bar)
    if (dropY < y + tabHeight) continue;
    // Use currently active tab
    const tabIdx = activeNotebookTab[comp.id] ?? 0;
    const tab = comp.tabs[tabIdx];
    if (!tab) continue;
    const relX = Math.max(0, snapToGrid(dropX - x, gridEnabled));
    const relY = Math.max(0, snapToGrid(dropY - y - tabHeight, gridEnabled));
    return { notebookId: comp.id, tabId: tab.id, tabIdx, relX, relY };
  }
  return null;
};
```

**Step 2: Use findTargetNotebookTab in the sidebar drop branch**

After `const targetPane = findTargetPane(x, y);` (line ~191), add:

```jsx
const targetNotebookTab = !targetPane ? findTargetNotebookTab(x, y) : null;
```

Update the `newComp` layout to use notebook target if found:

```jsx
const newComp = {
  type: data.widget.type,
  id: generateId(...),
  props: { ...data.widget.defaultProps },
  layout: {
    x: targetPane ? targetPane.relX : targetNotebookTab ? targetNotebookTab.relX : x,
    y: targetPane ? targetPane.relY : targetNotebookTab ? targetNotebookTab.relY : y,
    ...data.widget.defaultLayout
  },
  ...(targetPane ? { parentId: targetPane.paneId } : targetNotebookTab ? { parentId: targetNotebookTab.tabId } : {})
};
```

After the existing PanedWindow + Notebook tabs injection blocks, add the `setSchemaWithHistory` case for notebook drop:

```jsx
if (targetPane) {
  // existing pane logic...
} else if (targetNotebookTab) {
  setSchemaWithHistory(prev => {
    const newPages = prev.pages.map((page, pi) => {
      if (pi !== activePage) return page;
      return {
        ...page,
        components: page.components.map(c => {
          if (c.id !== targetNotebookTab.notebookId) return c;
          return {
            ...c,
            tabs: c.tabs.map(t =>
              t.id !== targetNotebookTab.tabId
                ? t
                : { ...t, components: [...t.components, newComp] }
            )
          };
        })
      };
    });
    return { ...prev, pages: newPages };
  });
} else {
  // existing top-level page logic...
}
setSelectedId(newComp.id);
setDragPreview(null);
```

**Step 3: Extend updateComponentLayout to search inside tabs**

After the existing `if (c.panes)` block inside `updateComponentLayout`, add the same for tabs:

```jsx
// Try inside notebook tab children
if (c.tabs) {
  const newTabs = c.tabs.map(tab => {
    const tabFound = tab.components.some(ch => ch.id === id);
    if (!tabFound) return tab;
    found = true;
    return {
      ...tab,
      components: tab.components.map(ch =>
        ch.id !== id ? ch : { ...ch, layout: { ...ch.layout, ...updates } }
      )
    };
  });
  if (newTabs !== c.tabs) return { ...c, tabs: newTabs };
}
```

**Step 4: Extend deleteComponent to remove from tabs**

Update `deleteComponent` to also filter from tab components:

```jsx
const deleteComponent = (id) => {
  setSchemaWithHistory(prev => ({
    ...prev,
    pages: prev.pages.map((page, pi) => {
      if (pi !== activePage) return page;
      return {
        ...page,
        components: page.components
          .filter(c => c.id !== id)
          .map(c => {
            if (c.tabs) {
              return {
                ...c,
                tabs: c.tabs.map(t => ({
                  ...t,
                  components: t.components.filter(ch => ch.id !== id)
                }))
              };
            }
            return c;
          })
      };
    })
  }));
  if (selectedId === id) setSelectedId(null);
};
```

**Step 5: Run tests**

```bash
npm run test:run
```
Expected: all 19 tests PASS.

**Step 6: Commit**

```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/frontend && git add src/App.jsx && git commit -m "feat: drop-into-notebook-tab logic, updateComponentLayout and deleteComponent search tabs"
```

---

## Task 5: Notebook Inspector (tabCount, tabHeight, tab labels)

**Files:**
- Modify: `frontend/src/App.jsx` (inspector props section, around lines 1129-1185)

**Step 1: Add tabCount special case in props map**

In `Object.keys(selectedComp.props).map(key => {...})`, add BEFORE the PanedWindow paneCount check (or after it):

```jsx
if (selectedComp.type === 'ttk.Notebook' && key === 'tabCount') {
  return (
    <div key={key} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      <span style={{ fontSize: "10px", color: "#ccc" }}>tabCount:</span>
      <select
        value={selectedComp.props.tabCount || 2}
        onChange={e => {
          const newCount = parseInt(e.target.value);
          setSchemaWithHistory(prev => ({
            ...prev,
            pages: prev.pages.map((page, pi) => {
              if (pi !== activePage) return page;
              return {
                ...page,
                components: page.components.map(c => {
                  if (c.id !== selectedId) return c;
                  const existingTabs = c.tabs || [];
                  return {
                    ...c,
                    props: { ...c.props, tabCount: newCount },
                    tabs: Array.from({ length: newCount }, (_, i) =>
                      existingTabs[i] || { id: `${c.id}_tab_${i}`, label: `Tab ${i + 1}`, components: [] }
                    )
                  };
                })
              };
            })
          }));
        }}
        style={{ background: "#3c3c3c", border: "1px solid #555", color: "white", padding: "3px" }}
      >
        <option value={2}>2</option>
        <option value={3}>3</option>
        <option value={4}>4</option>
      </select>
    </div>
  );
}
```

**Step 2: Add tabHeight special case in props map**

```jsx
if (selectedComp.type === 'ttk.Notebook' && key === 'tabHeight') {
  return (
    <div key={key} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      <span style={{ fontSize: "10px", color: "#ccc" }}>tabHeight:</span>
      <input
        type="number"
        value={selectedComp.props.tabHeight || 28}
        onChange={e => updateComponentProps(selectedComp.id, 'tabHeight', Math.max(18, parseInt(e.target.value)||28))}
        style={{ width: "100%", background: "#3c3c3c", border: "1px solid #555", color: "white", padding: "3px" }}
      />
    </div>
  );
}
```

**Step 3: Add per-tab label editor below the props section**

After the closing `})}` of the `Object.keys(selectedComp.props).map(...)` block (around line 1185), add:

```jsx
{selectedComp.type === 'ttk.Notebook' && selectedComp.tabs && (
  <>
    <div style={{ height: "1px", backgroundColor: "#3c3c3c", margin: "5px 0" }} />
    <span style={{ fontSize: "11px", color: "#858585" }}>Tab Labels</span>
    {selectedComp.tabs.map((tab, i) => (
      <div key={tab.id} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <span style={{ fontSize: "10px", color: "#ccc" }}>Tab {i + 1}:</span>
        <input
          type="text"
          value={tab.label}
          onChange={e => {
            const newLabel = e.target.value;
            setSchemaWithHistory(prev => ({
              ...prev,
              pages: prev.pages.map((page, pi) => {
                if (pi !== activePage) return page;
                return {
                  ...page,
                  components: page.components.map(c => {
                    if (c.id !== selectedId) return c;
                    return {
                      ...c,
                      tabs: c.tabs.map((t, ti) =>
                        ti !== i ? t : { ...t, label: newLabel }
                      )
                    };
                  })
                };
              })
            }));
          }}
          style={{ width: "100%", background: "#3c3c3c", border: "1px solid #555", color: "white", padding: "3px" }}
        />
      </div>
    ))}
  </>
)}
```

**Step 4: Run tests**

```bash
npm run test:run
```
Expected: all 19 tests PASS.

**Step 5: Commit**

```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/frontend && git add src/App.jsx && git commit -m "feat: Notebook inspector with tabCount dropdown, tabHeight input, per-tab label editor"
```

---

## Task 6: Backend — Notebook Code Generation

**Files:**
- Modify: `backend/generator/core.py`
- Test: `backend/tests/test_generator.py`

**Step 1: Write failing tests**

Add to `backend/tests/test_generator.py`:

```python
def test_notebook_generates_frames_and_add():
    project = {
        "theme": "",
        "pages": [{
            "name": "Main",
            "components": [{
                "type": "ttk.Notebook",
                "id": "notebook_1",
                "props": {"tabCount": 2, "tabHeight": 28},
                "layout": {"x": 0, "y": 0, "width": 400, "height": 300},
                "tabs": [
                    {"id": "notebook_1_tab_0", "label": "Tab 1", "components": []},
                    {"id": "notebook_1_tab_1", "label": "Tab 2", "components": []}
                ]
            }]
        }]
    }
    code = generate_tkinter_code(project)
    assert "self.notebook_1 = ttk.Notebook" in code
    assert "self._tab_notebook_1_tab_0 = ttk.Frame(self.notebook_1)" in code
    assert "self.notebook_1.add(self._tab_notebook_1_tab_0, text='Tab 1')" in code
    assert "self._tab_notebook_1_tab_1 = ttk.Frame(self.notebook_1)" in code
    assert "self.notebook_1.add(self._tab_notebook_1_tab_1, text='Tab 2')" in code

def test_notebook_nested_widgets():
    project = {
        "theme": "",
        "pages": [{
            "name": "Main",
            "components": [{
                "type": "ttk.Notebook",
                "id": "notebook_1",
                "props": {"tabCount": 2, "tabHeight": 28},
                "layout": {"x": 0, "y": 0, "width": 400, "height": 300},
                "tabs": [
                    {"id": "notebook_1_tab_0", "label": "Tab 1", "components": [
                        {"type": "Button", "id": "btn_1",
                         "parentId": "notebook_1_tab_0",
                         "props": {"text": "Click"},
                         "layout": {"x": 10, "y": 10, "width": 80, "height": 30}}
                    ]},
                    {"id": "notebook_1_tab_1", "label": "Tab 2", "components": []}
                ]
            }]
        }]
    }
    code = generate_tkinter_code(project)
    assert "self.btn_1 = tk.Button(self._tab_notebook_1_tab_0" in code
    assert "self.btn_1.place(x=10, y=10" in code

def test_notebook_tab_height_style():
    project = {
        "theme": "",
        "pages": [{
            "name": "Main",
            "components": [{
                "type": "ttk.Notebook",
                "id": "notebook_1",
                "props": {"tabCount": 2, "tabHeight": 36},
                "layout": {"x": 0, "y": 0, "width": 400, "height": 300},
                "tabs": [
                    {"id": "notebook_1_tab_0", "label": "Tab 1", "components": []},
                    {"id": "notebook_1_tab_1", "label": "Tab 2", "components": []}
                ]
            }]
        }]
    }
    code = generate_tkinter_code(project)
    assert "style.configure('TNotebook.Tab'" in code
```

Run:
```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/backend && python3 -m pytest tests/test_generator.py -k "notebook" -v
```
Expected: FAIL (no Notebook branch yet).

**Step 2: Add Notebook branch to generate_tkinter_code**

In `backend/generator/core.py`, after the `elif comp_type == "ttk.PanedWindow":` block (around line 224), add BEFORE the generic `else:` branch:

```python
elif comp_type == "ttk.Notebook":
    tab_height = props.get("tabHeight", 28)
    padding_y = max(1, tab_height // 4)
    lines.append(f"        style = ttk.Style()")
    lines.append(f"        style.configure('TNotebook.Tab', padding=[10, {padding_y}])")
    lines.append(f"        {comp_id} = ttk.Notebook({parent})")
    lines.append(f"        {comp_id}.place({place_params})")
    lines.append("")

    tabs = comp.get("tabs", [])
    for tab in tabs:
        tab_id = tab.get("id", "")
        tab_label_raw = tab.get("label", "Tab")
        tab_label = tab_label_raw.replace("'", "\\'")
        tab_frame_var = f"self._tab_{tab_id.replace('-', '_')}"
        lines.append(f"        {tab_frame_var} = ttk.Frame({comp_id})")
        lines.append(f"        {comp_id}.add({tab_frame_var}, text='{tab_label}')")
        lines.append("")

        # Generate child widgets inside this tab
        for child in tab.get("components", []):
            child_type = child.get("type")
            child_id = f"self.{child.get('id')}"
            child_props = child.get("props", {})
            child_layout = child.get("layout", {})
            child_base_props = {k: v for k, v in child_props.items()
                                if k not in ["tabs", "iconName", "color", "size", "commandEvent", "paneCount", "tabCount", "tabHeight"]}
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
                lines.append(f"        {child_id} = ttk.{child_cls}({tab_frame_var}, {child_kwargs})")
            else:
                if child_type.startswith("ttk."):
                    child_cls = child_type.split(".")[1]
                    lines.append(f"        {child_id} = ttk.{child_cls}({tab_frame_var}, {child_kwargs})")
                else:
                    lines.append(f"        {child_id} = tk.{child_type}({tab_frame_var}, {child_kwargs})")
            cx = child_layout.get("x", 0)
            cy = child_layout.get("y", 0)
            cw = child_layout.get("width")
            ch = child_layout.get("height")
            cp = f"x={cx}, y={cy}"
            if cw is not None: cp += f", width={cw}"
            if ch is not None: cp += f", height={ch}"
            lines.append(f"        {child_id}.place({cp})")
            lines.append("")

    continue  # Skip generic place() call

```

Also add `"tabCount"` and `"tabHeight"` to the existing `base_props` exclusion filter (line ~104):
```python
base_props = {k: v for k, v in props.items() if k not in ["tabs", "iconName", "color", "size", "commandEvent", "paneCount", "tabCount", "tabHeight"]}
```

**Step 3: Run all backend tests**

```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/backend && python3 -m pytest tests/ -v
```
Expected: all pass (67 existing + 3 new Notebook tests).

**Step 4: Commit**

```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/backend && git add generator/core.py tests/test_generator.py && git commit -m "feat: generate ttk.Notebook with frames, tabs, nested widgets, and tabHeight style"
```

---

## Task 7: Final Integration Test

**Files:**
- Test: `frontend/src/__tests__/App.test.jsx`
- Run: both suites

**Step 1: Add Notebook sidebar visibility test (if not already done in Task 2)**

Verify in `App.test.jsx` that `ttk.Notebook` appears in the initial render. Should already exist from Task 2.

**Step 2: Run full frontend suite**

```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/frontend && npm run test:run
```
Expected: 19+ tests, all PASS.

**Step 3: Run full backend suite**

```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/backend && python3 -m pytest -v
```
Expected: all PASS.

**Step 4: Commit if any test fixes needed**

```bash
git add -A && git commit -m "test: final integration pass for grid fix + Notebook feature"
```
