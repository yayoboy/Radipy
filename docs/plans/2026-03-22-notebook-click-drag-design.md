# Notebook Tab Click Fix + Child Widget Drag Design

**Date:** 2026-03-22

---

## Bug 1 — Tab click offset (horizontal tabs only)

**Root cause:** The outer click handler (canvas div, line ~1128) calculates the clicked tab as:
```js
const tabWidth = rect.width / tabCount;
const tabIdx = Math.min(Math.floor(relX / tabWidth), tabCount - 1);
```
This distributes tabs equally across the full Notebook width. But the rendered tab bar uses content-based widths (~80px each, `AVG_TAB_W`). With a 400px Notebook and 2 tabs, the formula assumes 200px per tab, but Tab 2 is visually at x≈80px. The user must click at x≥200 to trigger Tab 2.

Additionally, the ◀ scroll arrow takes ~20px at the left when `scrollOffset > 0`, shifting tab positions right — ignored by the current formula.

**Scope:** Fix applies only to `tabSide === 'top'` (horizontal tabs). Vertical tab click logic is deferred.

**Fix:** Replace the click handler's tab-index formula with the same logic as the IIFE renderer.

The `◀` button in `renderPreview` must be given `width: "20px"` (fixed) so the constant `ARROW_W = 20` matches reality.

```js
// Inside onClick, when relY <= tabHeight and tabSide !== 'left':
const AVG_TAB_W = 80;
const ARROW_W = 20; // matches fixed width on ◀ button
const visibleCount = Math.max(1, Math.floor((rect.width - (tabCount > 3 ? 40 : 0)) / AVG_TAB_W));
const scrollOffset = Math.min(tabScrollOffset[comp.id] ?? 0, Math.max(0, tabCount - visibleCount));
const canScrollLeft = scrollOffset > 0;
const canScrollRight = scrollOffset + visibleCount < tabCount;
const arrowOffset = canScrollLeft ? ARROW_W : 0;
const adjustedX = relX - arrowOffset;

if (canScrollLeft && adjustedX < 0) {
  // clicked on ◀ arrow
  setTabScrollOffset(prev => ({ ...prev, [comp.id]: Math.max(0, scrollOffset - 1) }));
  return;
}

const visibleTabIdx = Math.floor(adjustedX / AVG_TAB_W);
if (canScrollRight && visibleTabIdx >= visibleCount) {
  // clicked beyond last visible tab (where ▶ arrow is, via marginLeft:auto)
  setTabScrollOffset(prev => ({ ...prev, [comp.id]: scrollOffset + 1 }));
  return;
}

const tabIdx = Math.min(scrollOffset + Math.max(0, visibleTabIdx), tabCount - 1);
setActiveNotebookTab(prev => ({ ...prev, [comp.id]: tabIdx }));
```

Note: the `▶` button uses `marginLeft: "auto"` so it floats to the far right. Detecting a ▶ click is done by checking `visibleTabIdx >= visibleCount` (i.e., click landed beyond the last visible tab).

---

## Bug 2 — Child widgets not draggable after drop into Notebook

**Root cause:** All child widgets inside Notebook tabs have `pointerEvents: "none"`. Clicks fall through to the Notebook container. The HTML5 `draggable + onDragStart` on the container moves the whole Notebook. No mechanism exists to drag individual children.

**Fix:** Add `onMouseDown` to the Notebook container that starts a custom mousedown/mousemove/mouseup drag for child widgets, using the same `let finalX, finalY` + `setSchema` (live) + `setSchemaWithHistory` (commit) pattern as `startResize`.

### New state
```jsx
const [draggingChild, setDraggingChild] = useState(null);
// shape: { id: string, notebookId: string } — used to suppress HTML5 drag below
```

### `startChildDrag(e, notebookComp, childComp)` function

```js
const startChildDrag = (e, notebookComp, childComp) => {
  e.stopPropagation();
  e.preventDefault(); // prevents HTML5 drag from starting (no need to change `draggable` prop)

  const startClientX = e.clientX;
  const startClientY = e.clientY;
  const startLayoutX = childComp.layout.x;
  const startLayoutY = childComp.layout.y;
  const notebookId = notebookComp.id;
  const childId = childComp.id;
  // Track final position for history commit (same pattern as startResize)
  let finalX = startLayoutX;
  let finalY = startLayoutY;

  setDraggingChild({ id: childId, notebookId });

  const doDrag = (dragEvent) => {
    const dx = dragEvent.clientX - startClientX;
    const dy = dragEvent.clientY - startClientY;
    finalX = snapToGrid(Math.max(0, startLayoutX + dx), gridEnabled);
    finalY = snapToGrid(Math.max(0, startLayoutY + dy), gridEnabled);
    // Live update (no history entry)
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
                components: tab.components.map(ch =>
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
    // Commit final position to history using captured finalX/finalY
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
                components: tab.components.map(ch =>
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

### `onMouseDown` on the Notebook container div

Add alongside the existing `onClick` on the canvas component div:

```jsx
onMouseDown={(e) => {
  if (comp.type !== 'ttk.Notebook') return;
  const rect = e.currentTarget.getBoundingClientRect();
  const relX = e.clientX - rect.left;
  const relY = e.clientY - rect.top;
  const tabHeight = comp.props?.tabHeight || 28;
  const tabSide = comp.props?.tabSide || 'top';
  // Only handle horizontal tabs (vertical tab child drag deferred)
  if (tabSide !== 'top') return;
  // Must be in content area (below tab bar)
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

Note: `e.preventDefault()` inside `startChildDrag` suppresses the HTML5 drag. The `draggable` prop on the container does NOT need to change.

Note: `startResize` on the resize handle also uses `onMouseDown` with `e.stopPropagation()` — since the resize handle is a child element, its `stopPropagation` fires first (before the container `onMouseDown`), so they do not conflict.

---

## Cleanup on unmount

In the `useEffect` that handles keyboard shortcuts (or a new dedicated `useEffect`), return a cleanup that removes any orphaned drag listeners if the component unmounts mid-drag. In practice this is uncommon but the `setDraggingChild(null)` inside `stopDrag` handles it if `mouseup` fires. No additional `useEffect` is strictly required for this implementation.

---

## Implementation Order

1. Fix `◀` button in `renderPreview` — add `width: "20px"` to its style
2. Fix tab click formula in the Notebook `onClick` handler (horizontal case)
3. Add `draggingChild` state
4. Add `startChildDrag` function
5. Add `onMouseDown` to the Notebook container div in the canvas loop
6. Tests + commit
