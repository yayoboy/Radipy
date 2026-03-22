# Notebook Tab Click Fix + Child Widget Drag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two bugs in `ttk.Notebook`: (1) tab clicks require clicking far to the right of the visual tab; (2) child widgets dropped into Notebook tabs cannot be moved.

**Architecture:** All changes are in `frontend/src/App.jsx`. Task 1 fixes the `◀` button width and the onClick tab-detection formula. Task 2 adds `draggingChild` state and a `startChildDrag` function (mousedown/mousemove/mouseup pattern, identical to `startResize`) plus an `onMouseDown` on the Notebook canvas div.

**Tech Stack:** React 18, Vite, Vitest + React Testing Library

---

## Task 1: Fix tab click — ◀ button width + click formula

**Files:**
- Modify: `frontend/src/App.jsx` (renderPreview Notebook ◀ button ~line 844, onClick handler ~lines 1126–1130)

**Context:**

The `◀` scroll button in `renderPreview` has no fixed width — it relies on padding. The outer click handler at lines 1126–1130 uses `rect.width / tabCount` which assumes equally-spaced tabs, but tabs are ~80px wide (`AVG_TAB_W`). This makes Tab 2 require a click far to the right of where it appears.

The fix is two-part:
1. Give the `◀` button `width: "20px"` so the constant `ARROW_W = 20` is reliable
2. Replace the click formula with the same AVG_TAB_W logic used by the IIFE renderer

- [ ] **Step 1: Run baseline tests**

```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/frontend && npm run test:run
```
Expected: 21 tests PASS.

- [ ] **Step 2: Fix the ◀ button width**

In `frontend/src/App.jsx`, find the `◀` button in the Notebook tab bar IIFE (around line 842–845):
```jsx
<button
  onClick={e => { e.stopPropagation(); setTabScrollOffset(prev => ({ ...prev, [comp.id]: Math.max(0, scrollOffset - 1) })); }}
  style={{ background: "#3c3c3c", border: "none", color: "#aaa", cursor: "pointer", padding: "0 4px", flexShrink: 0, fontSize: "12px" }}
>◀</button>
```

Add `width: "20px"` to the style:
```jsx
<button
  onClick={e => { e.stopPropagation(); setTabScrollOffset(prev => ({ ...prev, [comp.id]: Math.max(0, scrollOffset - 1) })); }}
  style={{ background: "#3c3c3c", border: "none", color: "#aaa", cursor: "pointer", padding: "0 4px", flexShrink: 0, fontSize: "12px", width: "20px" }}
>◀</button>
```

- [ ] **Step 3: Replace the tab click formula**

Find the tab-bar click handler inside the Notebook `onClick` (around lines 1126–1130):
```js
if (relY <= tabHeight) {
  const tabCount = comp.tabs.length;
  const tabWidth = rect.width / tabCount;
  const tabIdx = Math.min(Math.floor(relX / tabWidth), tabCount - 1);
  setActiveNotebookTab(prev => ({ ...prev, [comp.id]: tabIdx }));
}
```

Replace the entire `if (relY <= tabHeight) { ... }` block with:
```js
if (relY <= tabHeight && (comp.props?.tabSide || 'top') === 'top') {
  const AVG_TAB_W = 80;
  const ARROW_W = 20;
  const tabCount = comp.tabs.length;
  const visibleCount = Math.max(1, Math.floor((rect.width - (tabCount > 3 ? 40 : 0)) / AVG_TAB_W));
  const scrollOffset = Math.min(tabScrollOffset[comp.id] ?? 0, Math.max(0, tabCount - visibleCount));
  const canScrollLeft = scrollOffset > 0;
  const canScrollRight = scrollOffset + visibleCount < tabCount;
  const arrowOffset = canScrollLeft ? ARROW_W : 0;
  const adjustedX = relX - arrowOffset;
  if (canScrollLeft && adjustedX < 0) {
    setTabScrollOffset(prev => ({ ...prev, [comp.id]: Math.max(0, scrollOffset - 1) }));
    return;
  }
  const visibleTabIdx = Math.floor(adjustedX / AVG_TAB_W);
  if (canScrollRight && visibleTabIdx >= visibleCount) {
    setTabScrollOffset(prev => ({ ...prev, [comp.id]: scrollOffset + 1 }));
    return;
  }
  const tabIdx = Math.min(scrollOffset + Math.max(0, visibleTabIdx), tabCount - 1);
  setActiveNotebookTab(prev => ({ ...prev, [comp.id]: tabIdx }));
}
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/frontend && npm run test:run
```
Expected: all 21 PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy && git add frontend/src/App.jsx && git commit -m "fix: Notebook tab click uses AVG_TAB_W formula matching renderer, handles scroll arrows"
```

---

## Task 2: Child widget drag inside Notebook tabs

**Files:**
- Modify: `frontend/src/App.jsx` (state ~line 122, new function after `startResize`, canvas loop ~line 1116)

**Context:**

Child widgets inside Notebook tabs have `pointerEvents: "none"` so all events go to the outer Notebook container. The Notebook is `draggable` via HTML5 drag which moves the whole container. There is no way to drag individual children.

The fix adds:
1. `draggingChild` state
2. `startChildDrag(e, notebookComp, childComp)` — same pattern as `startResize`: close over `let finalX, finalY`, `setSchema` for live updates, `setSchemaWithHistory` on commit
3. `onMouseDown` on the canvas Notebook div — hit-tests children in the content area and calls `startChildDrag`

- [ ] **Step 1: Add `draggingChild` state**

Find `const [tabScrollOffset, setTabScrollOffset] = useState({});` (line ~121).
After it, add:
```jsx
const [draggingChild, setDraggingChild] = useState(null); // { id, notebookId }
```

- [ ] **Step 2: Add `startChildDrag` function**

Find the `startResize` function (line ~373). After it (after line ~428), add this new function:

```jsx
const startChildDrag = (e, notebookComp, childComp) => {
  e.stopPropagation();
  e.preventDefault();

  const startClientX = e.clientX;
  const startClientY = e.clientY;
  const startLayoutX = childComp.layout.x;
  const startLayoutY = childComp.layout.y;
  const notebookId = notebookComp.id;
  const childId = childComp.id;
  let finalX = startLayoutX;
  let finalY = startLayoutY;

  setDraggingChild({ id: childId, notebookId });

  const doDrag = (dragEvent) => {
    const dx = dragEvent.clientX - startClientX;
    const dy = dragEvent.clientY - startClientY;
    finalX = snapToGrid(Math.max(0, startLayoutX + dx), gridEnabled);
    finalY = snapToGrid(Math.max(0, startLayoutY + dy), gridEnabled);
    setSchema(prev => ({
      ...prev,
      pages: prev.pages.map((page, pi) => {
        if (pi !== activePage) return page;
        return {
          ...page,
          components: page.components.map(c => {
            if (c.id !== notebookId || !c.tabs) return c;
            return {
              ...c,
              tabs: c.tabs.map(tab => ({
                ...tab,
                components: (tab.components || []).map(ch =>
                  ch.id !== childId ? ch : { ...ch, layout: { ...ch.layout, x: finalX, y: finalY } }
                )
              }))
            };
          })
        };
      })
    }));
  };

  const stopDrag = () => {
    document.removeEventListener('mousemove', doDrag);
    document.removeEventListener('mouseup', stopDrag);
    setDraggingChild(null);
    setSchemaWithHistory(prev => ({
      ...prev,
      pages: prev.pages.map((page, pi) => {
        if (pi !== activePage) return page;
        return {
          ...page,
          components: page.components.map(c => {
            if (c.id !== notebookId || !c.tabs) return c;
            return {
              ...c,
              tabs: c.tabs.map(tab => ({
                ...tab,
                components: (tab.components || []).map(ch =>
                  ch.id !== childId ? ch : { ...ch, layout: { ...ch.layout, x: finalX, y: finalY } }
                )
              }))
            };
          })
        };
      })
    }));
  };

  document.addEventListener('mousemove', doDrag);
  document.addEventListener('mouseup', stopDrag);
};
```

- [ ] **Step 3: Add `onMouseDown` to the Notebook canvas div**

In the `currentComponents.map(comp => (...))` loop, find the outer canvas div (around line 1116):
```jsx
<div
  key={comp.id} draggable={!isResizing} onDragStart={...} onClick={...}
  style={{ ... }}
  onMouseEnter={...}
  onMouseLeave={...}
>
```

Add `onMouseDown` after `onClick` (before `style`):
```jsx
onMouseDown={(e) => {
  if (comp.type !== 'ttk.Notebook') return;
  const rect = e.currentTarget.getBoundingClientRect();
  const relX = e.clientX - rect.left;
  const relY = e.clientY - rect.top;
  const tabHeight = comp.props?.tabHeight || 28;
  if ((comp.props?.tabSide || 'top') !== 'top') return;
  if (relY <= tabHeight) return;
  const activeTabIdx = activeNotebookTab[comp.id] ?? 0;
  const tabChildren = comp.tabs?.[activeTabIdx]?.components || [];
  const contentX = relX;
  const contentY = relY - tabHeight;
  const hit = [...tabChildren].reverse().find(child =>
    contentX >= child.layout.x && contentX <= child.layout.x + child.layout.width &&
    contentY >= child.layout.y && contentY <= child.layout.y + child.layout.height
  );
  if (hit) {
    setSelectedId(hit.id);
    startChildDrag(e, comp, hit);
  }
}}
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/frontend && npm run test:run
```
Expected: all 21 PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy && git add frontend/src/App.jsx && git commit -m "feat: drag child widgets inside Notebook tabs with mousedown/mousemove/mouseup"
```

---

## Task 3: Final test run + push

- [ ] **Step 1: Full frontend suite**

```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/frontend && npm run test:run
```
Expected: 21 PASS.

- [ ] **Step 2: Full backend suite**

```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy/backend && python3 -m pytest tests/ 2>&1 | tail -3
```
Expected: 72 PASS.

- [ ] **Step 3: Push**

```bash
cd /Users/yayoboy/Desktop/GitHub/Radipy && git push origin master
```
