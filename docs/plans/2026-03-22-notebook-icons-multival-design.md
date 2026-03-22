# Notebook Enhancements + Icon Picker + Multi-Value Editor Design

**Date:** 2026-03-22

---

## Bug Fix 1 — `updateComponentProps` per widget annidati

`updateComponentProps` (line ~421) fa solo `.map()` su `page.components` top-level.
Estendere con lo stesso pattern di `updateComponentLayout`: cercare in `c.tabs[*].components` e `c.panes[*].components`.

---

## Bug Fix 2 — Highlight visivo widget selezionati dentro Notebook

In `renderPreview` per `ttk.Notebook` (case 'ttk.Notebook'), i div dei widget figli non hanno bordo condizionale.
Aggiungere: `border: child.id === selectedId ? "2px solid #569cd6" : "1px dashed transparent"`.
`selectedId` è accessibile per closure (renderPreview è definito dentro App).

---

## Bug Fix 3 — Generate OOP Code: proxy mancante

`fetch("/generate/all")` in dev va alla porta 5173 (Vite), non al backend (8000). Nessun `.env` e nessun proxy.
Fix: aggiungere in `vite.config.js`:
```js
server: {
  proxy: {
    '/generate': 'http://localhost:8000'
  }
}
```

---

## Feature 1 — Multi-value editor (+ / -)

**Widget interessati:** `ttk.Combobox` (prop `values`) e `ttk.Treeview` (prop `columns`).

**Schema interno:** il valore rimane una stringa CSV (es. `"Opt1,Opt2,Opt3"`) — compatibile con il backend esistente.

**UI nell'inspector:** quando `key === "values"` su Combobox, o `key === "columns"` su Treeview, mostrare:
```
[Opt1]  [×]
[Opt2]  [×]
[Opt3]  [×]
[__________] [+]
```
- Ogni riga = un valore con bottone × per rimuovere
- Campo input in fondo + bottone + per aggiungere
- onChange: ricalcola la stringa CSV e chiama `updateComponentProps`

**Implementazione:** special case unificato con un helper `renderMultiValueEditor(key)` usato da entrambi.

---

## Feature 2 — Icon picker dropdown visuale

**Attuale:** `<input type="text" list="material-icons-list">` — autocomplete testuale nativo, nessuna preview.

**Nuovo:** dropdown custom:
- Bottone trigger che mostra l'icona corrente (`<span className="material-icons">`) + nome
- Al click: apre un pannello con campo di ricerca + griglia scrollabile di icone Material
- Click sull'icona → chiude dropdown, aggiorna `iconName`
- La datalist esistente rimane (solo come sorgente dei nomi icone)
- Stato locale: `iconPickerOpen: { [compId]: bool }` oppure semplice `useState(false)` dentro il blocco inspector

**Implementazione:** un piccolo componente inline (non file separato) dentro il blocco `key === "iconName"`.

---

## Feature 3 — Notebook: tab scroll arrows

**Problema:** con molte tab (es. 10+) il tab bar trabocca ma `overflow: hidden` le taglia senza scorrimento.

**Fix:**
- Aggiungere stato `tabScrollOffset: { [notebookId]: number }` (numero di tab da skippare a sinistra)
- Nel renderPreview per Notebook: se `tabs.length > visibleCount`, mostrare ← a sinistra e → a destra della tab bar
- Le frecce sono bottoni assoluti sovrapposti alla tab bar; click incrementa/decrementa `tabScrollOffset[comp.id]`
- I tab renderizzati partono da `scrollOffset`, mostrando solo quelli che ci stanno
- `visibleCount` stimato: `Math.floor(comp.layout.width / avgTabWidth)` con avgTabWidth = 80px

---

## Feature 4 — Notebook verticale (`tabSide`)

**Schema:** aggiungere `tabSide: 'top' | 'left'` a `defaultProps` di `ttk.Notebook` (default `'top'`).

**Inspector:** special case per `tabSide` → `<select>` con opzioni `top` / `left`.

**Canvas renderPreview:**
- `tabSide === 'top'` (default): layout attuale (flex-column, tab bar in alto)
- `tabSide === 'left'`: flex-direction `row`, tab bar a sinistra con `flexDirection: column`; il testo delle tab ruotato 90° con `writingMode: 'vertical-lr'`, `transform: 'rotate(180deg)'` (testo dal basso verso l'alto, come tkinter)

**Backend codegen:** quando `tabSide === 'left'`, emettere prima della creazione del Notebook:
```python
style.configure('TNotebook', tabposition='wn')
```

**`tabHeight` when left:** quando `tabSide === 'left'`, `tabHeight` diventa la larghezza della tab bar laterale (non l'altezza).

---

## Ordine di implementazione

1. Bug Fix 1: `updateComponentProps` nested
2. Bug Fix 2: highlight figli Notebook
3. Bug Fix 3: vite.config proxy
4. Feature 1: multi-value editor (Combobox + Treeview)
5. Feature 2: icon picker dropdown
6. Feature 3: tab scroll arrows
7. Feature 4: Notebook `tabSide` (vertical)
8. Backend codegen: `tabSide` + `tabScrollOffset` esclusione
9. Test + commit
