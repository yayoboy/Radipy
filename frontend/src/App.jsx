import React, { useState, useRef, useEffect } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Costanti e configurazioni UI
const WIDGET_TYPES = [
  { type: 'Button', desc: "Pulsante standard cliccabile", defaultProps: { text: "Button", bootstyle: "primary", commandEvent: "on_btn_click" }, defaultLayout: { width: 100, height: 35 } },
  { type: 'Label', desc: "Testo descrittivo semplice", defaultProps: { text: "Label Text" }, defaultLayout: { width: 100, height: 25 } },
  { type: 'Entry', desc: "Campo di input testo a linea singola", defaultProps: { text: "" }, defaultLayout: { width: 150, height: 25 } },
  { type: 'Text', desc: "Area di testo multi-linea espandibile", defaultProps: { text: "" }, defaultLayout: { width: 200, height: 100 } },
  { type: 'Checkbutton', desc: "Casella di controllo (Vero/Falso)", defaultProps: { text: "Check Me", commandEvent: "" }, defaultLayout: { width: 100, height: 25 } },
  { type: 'ttk.Progressbar', desc: "Barra di caricamento orizzontale", defaultProps: { value: 50, bootstyle: "success" }, defaultLayout: { width: 150, height: 20 } },
  { type: 'Icon', desc: "Icona Material Design scalabile e colorabile", defaultProps: { iconName: "home", color: "#ffffff", size: 24 }, defaultLayout: { width: 30, height: 30 } },
  { type: 'ttk.Combobox', desc: "Menù a tendina dropdown", defaultProps: { values: "Opt1,Opt2" }, defaultLayout: { width: 120, height: 25 } },
  { type: 'ttk.Scale', desc: "Slider numerico trascinabile", defaultProps: { value: 50, from_: 0, to: 100, commandEvent: "" }, defaultLayout: { width: 150, height: 20 } },
  { type: 'ttk.Spinbox', desc: "Input numerico controllato da frecce direzionali", defaultProps: { from_: 0, to: 100 }, defaultLayout: { width: 80, height: 25 } },
  { type: 'ttk.DateEntry', desc: "Popup calendario per selezione date", defaultProps: { bootstyle: "primary" }, defaultLayout: { width: 120, height: 25 } },
  { type: 'ttk.Meter', desc: "Indicatore statistico circolare (Progress Ring)", defaultProps: { amountused: 45, bootstyle: "info" }, defaultLayout: { width: 120, height: 120 } },
  { type: 'ttk.Treeview', desc: "Tabella o Albero per grossi moli di dati strutturati", defaultProps: { columns: "Col1,Col2" }, defaultLayout: { width: 250, height: 150 } },
  { type: 'Listbox', desc: "Lista testuale verticale a scorrimento", defaultProps: { bg: "white" }, defaultLayout: { width: 150, height: 100 } },
  { type: 'ttk.Labelframe', desc: "Contenitore visivo (Frame) adornato da bordo e titolo testuale", defaultProps: { text: "Group Title" }, defaultLayout: { width: 200, height: 150 } },
  { type: 'ttk.Separator', desc: "Linea divisoria tra layout visivi", defaultProps: { orient: "horizontal" }, defaultLayout: { width: 150, height: 5 } },
  { type: 'ttk.PanedWindow', desc: "Layout split a due o più pannelli ridimensionabili", defaultProps: { orient: "horizontal", paneCount: 2, sashwidth: 4 }, defaultLayout: { width: 400, height: 300 } },
  { type: 'ttk.Notebook', desc: "Contenitore a schede selezionabili e droppabili", defaultProps: { tabCount: 2, tabHeight: 28 }, defaultLayout: { width: 400, height: 300 } },
  { type: 'MapView', desc: "Mappa interattiva Google Maps embedded", defaultProps: { address: "Rome, Italy", zoom: 10 }, defaultLayout: { width: 300, height: 250 } },
  { type: 'MatplotlibChart', desc: "Area riservata a rendering di Grafici Scientifici via Matplotlib", defaultProps: { chartType: "line", title: "My Chart" }, defaultLayout: { width: 400, height: 300 } },
  { type: 'Canvas', desc: "Primitive Canvas libero di Tkinter per forme custom", defaultProps: { bg: "white" }, defaultLayout: { width: 200, height: 200 } }
];

const THEMES = ["cosmo", "flatly", "journal", "lumen", "paper", "sandstone", "darkly", "cyborg", "superhero"];
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

const GRID_SIZE = 20;
const snapToGrid = (val, enabled) => enabled ? Math.round(val / GRID_SIZE) * GRID_SIZE : val;

function App() {
  const [schema, setSchema] = useState(() => {
    const saved = localStorage.getItem("radipy_project");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.window) {
          parsed.window = { ...INITIAL_SCHEMA.window };
        }
        return parsed;
      } catch(e) {}
    }
    return INITIAL_SCHEMA;
  });
  
  const [activePage, setActivePage] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [generatedCode, setGeneratedCode] = useState("");
  const [generatedRequirements, setGeneratedRequirements] = useState("");
  const [generatedInstructions, setGeneratedInstructions] = useState("");
  const [sidebarTab, setSidebarTab] = useState("components"); // 'components' | 'layers'
  const [selectedSidebarMenu, setSelectedSidebarMenu] = useState(null);
  
  const canvasRef = useRef(null);
  const history = useRef([]);
  const historyIndex = useRef(-1);
  const [historyStep, setHistoryStep] = useState(0); // triggers re-renders for button state
  const [isResizing, setIsResizing] = useState(false);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [activeNotebookTab, setActiveNotebookTab] = useState({}); // { [notebookId]: tabIdx }
  const [sizeDraft, setSizeDraft] = useState({ w: null, h: null });
  const [dragPreview, setDragPreview] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Persistence
  useEffect(() => {
    localStorage.setItem("radipy_project", JSON.stringify(schema));
  }, [schema]);

  const pushHistory = (newSchema) => {
    history.current = history.current.slice(0, historyIndex.current + 1);
    history.current.push(JSON.parse(JSON.stringify(newSchema)));
    if (history.current.length > 50) history.current.shift();
    historyIndex.current = history.current.length - 1;
  };

  const setSchemaWithHistory = (updater) => {
    setSchema(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      pushHistory(next);
      setHistoryStep(h => h + 1);
      return next;
    });
  };

  const undo = () => {
    if (historyIndex.current <= 0) return;
    historyIndex.current -= 1;
    const prev = JSON.parse(JSON.stringify(history.current[historyIndex.current]));
    setSchema(prev);
    setHistoryStep(h => h - 1);
  };

  const redo = () => {
    if (historyIndex.current >= history.current.length - 1) return;
    historyIndex.current += 1;
    const next = JSON.parse(JSON.stringify(history.current[historyIndex.current]));
    setSchema(next);
    setHistoryStep(h => h + 1);
  };

  // History seed on mount
  useEffect(() => {
    history.current = [JSON.parse(JSON.stringify(schema))];
    historyIndex.current = 0;
    setHistoryStep(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateId = (type) => `${type}_${Math.random().toString(36).substr(2, 6)}`;

  // ---- Drag & Drop & Resize Handlers ----
  const handleDragStartFromSidebar = (e, widget) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ source: 'sidebar', widget }));
    e.dataTransfer.effectAllowed = "copy";
    setDragPreview(widget);
  };

  const handleDragEndFromSidebar = () => {
    setDragPreview(null);
  };

  const handleDragStartFromCanvas = (e, comp) => {
    if (isResizing) {
      e.preventDefault(); // Prevent native drag while resizing
      return;
    }
    const rect = e.target.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    e.dataTransfer.setData("application/json", JSON.stringify({ source: 'canvas', id: comp.id, offsetX, offsetY }));
  };

  const handleDropOnCanvas = (e) => {
    e.preventDefault();
    if (isResizing) return;
    const dataStr = e.dataTransfer.getData("application/json");
    if(!dataStr) return;

    const data = JSON.parse(dataStr);
    const canvasRect = canvasRef.current.getBoundingClientRect();

    // Helper: find which PanedWindow pane the drop falls into
    const findTargetPane = (dropX, dropY) => {
      const comps = schema.pages[activePage]?.components || [];
      for (const comp of comps) {
        if (comp.type !== 'ttk.PanedWindow' || !comp.panes || comp.panes.length === 0) continue;
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

    if (data.source === 'sidebar') {
      const x = Math.max(0, snapToGrid(Math.round(e.clientX - canvasRect.left), gridEnabled));
      const y = Math.max(0, snapToGrid(Math.round(e.clientY - canvasRect.top), gridEnabled));

      const targetPane = findTargetPane(x, y);

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

      const targetNotebookTab = !targetPane ? findTargetNotebookTab(x, y) : null;

      const newComp = {
        type: data.widget.type,
        id: generateId(data.widget.type.replace("ttk.", "").replace("MapView", "Map").replace("MatplotlibChart", "Chart")),
        props: { ...data.widget.defaultProps },
        layout: {
          x: targetPane ? targetPane.relX : targetNotebookTab ? targetNotebookTab.relX : x,
          y: targetPane ? targetPane.relY : targetNotebookTab ? targetNotebookTab.relY : y,
          ...data.widget.defaultLayout
        },
        ...(targetPane ? { parentId: targetPane.paneId } : targetNotebookTab ? { parentId: targetNotebookTab.tabId } : {})
      };

      // Add PanedWindow panes if this is a PanedWindow being dropped
      if (newComp.type === 'ttk.PanedWindow') {
        const count = newComp.props.paneCount || 2;
        newComp.panes = Array.from({ length: count }, (_, i) => ({
          id: `${newComp.id}_pane_${i}`,
          components: []
        }));
      }

      // Add Notebook tabs if this is a Notebook being dropped
      if (newComp.type === 'ttk.Notebook') {
        const count = newComp.props.tabCount || 2;
        newComp.tabs = Array.from({ length: count }, (_, i) => ({
          id: `${newComp.id}_tab_${i}`,
          label: `Tab ${i + 1}`,
          components: []
        }));
      }

      if (targetPane) {
        // existing pane logic (keep as-is)
        setSchemaWithHistory(prev => {
          const newPages = prev.pages.map((page, pi) => {
            if (pi !== activePage) return page;
            return {
              ...page,
              components: page.components.map(c => {
                if (c.id !== targetPane.panedId) return c;
                return {
                  ...c,
                  panes: c.panes.map(p =>
                    p.id !== targetPane.paneId
                      ? p
                      : { ...p, components: [...p.components, newComp] }
                  )
                };
              })
            };
          });
          return { ...prev, pages: newPages };
        });
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
        // existing top-level logic (keep as-is)
        setSchemaWithHistory(prev => {
          const newPages = prev.pages.map((page, pi) => {
            if (pi !== activePage) return page;
            return { ...page, components: [...page.components, newComp] };
          });
          return { ...prev, pages: newPages };
        });
      }
      setSelectedId(newComp.id);
      setDragPreview(null);
    }
    else if (data.source === 'canvas') {
      const x = Math.max(0, snapToGrid(Math.round(e.clientX - canvasRect.left - data.offsetX), gridEnabled));
      const y = Math.max(0, snapToGrid(Math.round(e.clientY - canvasRect.top - data.offsetY), gridEnabled));
updateComponentLayout(data.id, { x, y });
    }
  };

  // ---- Dati ----

  const handleDragOver = (e) => {
    e.preventDefault();
    if (dragPreview) {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (canvasRect) {
        setMousePos({
          x: snapToGrid(e.clientX - canvasRect.left, gridEnabled),
          y: snapToGrid(e.clientY - canvasRect.top, gridEnabled)
        });
      }
    }
  };

  // Custom JS logic for the Bottom-Right Resize Handle
  const startResize = (e, id) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setSelectedId(id);

    const comp = schema.pages[activePage].components.find(c => c.id === id);
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = comp.layout.width;
    const startHeight = comp.layout.height;

    // Track final dimensions so stopDrag can commit them
    let finalWidth = startWidth;
    let finalHeight = startHeight;

    const doDrag = (dragEvent) => {
      finalWidth = snapToGrid(Math.max(20, startWidth + (dragEvent.clientX - startX)), gridEnabled);
      finalHeight = snapToGrid(Math.max(20, startHeight + (dragEvent.clientY - startY)), gridEnabled);
      // Use direct setSchema for live feedback (no history entry)
      setSchema(prev => ({
        ...prev,
        pages: prev.pages.map((page, pi) => {
          if (pi !== activePage) return page;
          return {
            ...page,
            components: page.components.map(c =>
              c.id !== id ? c : { ...c, layout: { ...c.layout, width: finalWidth, height: finalHeight } }
            )
          };
        })
      }));
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
      setIsResizing(false);
      // Commit the final resize as ONE history entry
      setSchemaWithHistory(prev => ({
        ...prev,
        pages: prev.pages.map((page, pi) => {
          if (pi !== activePage) return page;
          return {
            ...page,
            components: page.components.map(c =>
              c.id !== id ? c : { ...c, layout: { ...c.layout, width: finalWidth, height: finalHeight } }
            )
          };
        })
      }));
    };

document.addEventListener('mousemove', doDrag);
  document.addEventListener('mouseup', stopDrag);
};

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
      finalWidth = Math.max(100, snapToGrid(startWidth + (dragEvent.clientX - startX), gridEnabled));
      finalHeight = Math.max(100, snapToGrid(startHeight + (dragEvent.clientY - startY), gridEnabled));
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
      setSizeDraft({ w: null, h: null });
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

// ---- Dati ----
const updateComponentProps = (id, key, value) => {
    setSchemaWithHistory(prev => ({
      ...prev,
      pages: prev.pages.map((page, pi) => {
        if (pi !== activePage) return page;
        return {
          ...page,
          components: page.components.map(c =>
            c.id !== id ? c : { ...c, props: { ...c.props, [key]: value } }
          )
        };
      })
    }));
  };

  const updateComponentLayout = (id, updates) => {
    setSchemaWithHistory(prev => ({
      ...prev,
      pages: prev.pages.map((page, pi) => {
        if (pi !== activePage) return page;
        // Try top-level first
        let found = false;
        const newComponents = page.components.map(c => {
          if (c.id === id) { found = true; return { ...c, layout: { ...c.layout, ...updates } }; }
          // Try inside pane children
          if (c.panes) {
            const newPanes = c.panes.map(pane => {
              const paneFound = pane.components.some(ch => ch.id === id);
              if (!paneFound) return pane;
              found = true;
              return {
                ...pane,
                components: pane.components.map(ch =>
                  ch.id !== id ? ch : { ...ch, layout: { ...ch.layout, ...updates } }
                )
              };
            });
            if (newPanes !== c.panes) return { ...c, panes: newPanes };
          }
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
          return c;
        });
        if (!found) return page;
        return { ...page, components: newComponents };
      })
    }));
  };

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

  // ---- Tabs ----
  const addPage = () => {
    setSchemaWithHistory(prev => {
      const newPages = [...prev.pages, { name: `Tab ${prev.pages.length + 1}`, components: [] }];
      return { ...prev, pages: newPages };
    });
    setActivePage(schema.pages.length);
  };

  const deletePage = (index) => {
    if (schema.pages.length <= 1) return alert("You must have at least one tab.");
    setSchemaWithHistory(prev => {
      const newPages = prev.pages.filter((_, i) => i !== index);
      return { ...prev, pages: newPages };
    });
    setActivePage(Math.max(0, index - 1));
  };

  // ---- API Call ----
  const handleExport = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || "";
      const response = await fetch(`${API_URL}/generate/all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schema)
      });
      const data = await response.json();
      if(data.code) {
        setGeneratedCode(data.code);
        setGeneratedRequirements(data.requirements || "");
        setGeneratedInstructions(data.instructions || "");
      }
      else alert("Error generating code: " + data.error);
    } catch (err) {
      console.error(err);
      alert("Failed to connect to backend API.");
    }
  };

  const clearProject = () => {
    if(confirm("Are you sure you want to clear the entire project?")) {
setSchemaWithHistory(INITIAL_SCHEMA);
    setGeneratedCode("");
    setGeneratedRequirements("");
    setGeneratedInstructions("");
    setSelectedId(null);
      setActivePage(0);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const isInputFocused = ['input', 'textarea', 'select'].includes(tag);

      if (e.key === 'Escape') {
        setSelectedId(null);
        return;
      }

      if (isInputFocused) return;

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
          const newId = generateId(comp.type.replace('ttk.', '').replace('MapView', 'Map').replace('MatplotlibChart', 'Chart'));
          const newComp = {
            ...JSON.parse(JSON.stringify(comp)),
            id: newId,
            layout: { ...comp.layout, x: comp.layout.x + 20, y: comp.layout.y + 20 }
          };
          setSchemaWithHistory(prev => {
            const newPages = [...prev.pages];
            newPages[activePage] = {
              ...newPages[activePage],
              components: [...newPages[activePage].components, newComp]
            };
            return { ...prev, pages: newPages };
          });
          setSelectedId(newId);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, activePage, schema]);

  const currentComponents = schema.pages[activePage]?.components || [];

  const findComponentById = (id, comps) => {
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
  };

  const selectedComp = findComponentById(selectedId, currentComponents);

  // Generatore Preview HTML realistica
  const renderPreview = (comp) => {
    const p = comp.props;
    switch(comp.type) {
      case 'Button': return <button disabled style={{width:"100%", height:"100%", background: p.bg||"#007bff", color: p.fg||"white", border:"none", borderRadius:"4px", cursor:"pointer"}}>{p.text}</button>;
      case 'Label': return <span style={{display:"flex", alignItems:"center", justifyContent:"center", width:"100%", height:"100%", color: p.fg||"#e0e0e0"}}>{p.text}</span>;
      case 'Entry': return <input type="text" readOnly placeholder={p.text||"Type..."} style={{width:"100%", height:"100%", padding:"5px", boxSizing:"border-box", border:"1px solid #444", borderRadius:"3px", background:"#fff", color:"#000"}} />;
      case 'Text': return <textarea readOnly value={p.text} style={{width:"100%", height:"100%", padding:"5px", boxSizing:"border-box", resize:"none", border:"1px solid #444", borderRadius:"3px", background:"#fff", color:"#000"}} />;
      case 'Checkbutton': return <div style={{display:"flex", alignItems:"center", gap:"5px", width:"100%", height:"100%", color: p.fg||"#e0e0e0", justifyContent:"center"}}><input type="checkbox" readOnly checked/> {p.text}</div>;
      case 'ttk.Progressbar': return <progress value={p.value} max="100" style={{width:"100%", height:"100%"}} />;
      case 'ttk.Combobox': return <select disabled style={{width:"100%", height:"100%", border:"1px solid #444", borderRadius:"3px"}}><option>{(p.values||"").split(',')[0]||"Select"}</option></select>;
      case 'ttk.Scale': return <input type="range" min={p.from_} max={p.to} value={p.value} readOnly style={{width:"100%"}} />;
      case 'ttk.Spinbox': return <input type="number" readOnly value={p.from_} style={{width:"100%", height:"100%", padding:"5px", boxSizing:"border-box"}} />;
      case 'ttk.DateEntry': return <input type="date" readOnly style={{width:"100%", height:"100%", padding:"5px", boxSizing:"border-box"}} />;
      case 'ttk.Treeview': return <div style={{width:"100%", height:"100%", background:"#fff", border:"1px solid #aaa", color:"#000", fontSize:"10px", padding:"5px"}}>Columns: {p.columns}</div>;
      case 'Listbox': return <div style={{width:"100%", height:"100%", background:"#fff", border:"1px solid #aaa", color:"#000", fontSize:"10px", padding:"5px"}}>Item 1<br/>Item 2</div>;
      case 'ttk.Labelframe': return <fieldset style={{width:"100%", height:"100%", border:"1px solid #aaa", boxSizing:"border-box", background:"transparent"}}><legend style={{color:"#dcdcaa", fontSize:"11px", padding:"0 5px"}}>{p.text}</legend></fieldset>;
      case 'ttk.Separator': return <hr style={{width:"100%", borderColor:"#555", margin:0}}/>;
      case 'ttk.PanedWindow': {
        const orient = comp.props?.orient || 'horizontal';
        const panes = comp.panes || [];
        const paneCount = (comp.panes && comp.panes.length > 0) ? comp.panes.length : (comp.props?.paneCount || 2);
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
                <React.Fragment key={pane.id || i}>
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
      case 'ttk.Notebook': {
        const tabs = comp.tabs || [];
        const tabHeight = comp.props?.tabHeight || 28;
        const rawIdx = activeNotebookTab[comp.id] ?? 0;
        const activeTabIdx = tabs.length > 0 ? Math.min(rawIdx, tabs.length - 1) : 0;
        const tabCount = (tabs.length > 0) ? tabs.length : (comp.props?.tabCount || 2);

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
              {Array.from({ length: tabCount }, (_, i) => {
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
                Tab {activeTabIdx + 1}
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
      case 'MapView': return <div style={{width:"100%", height:"100%", background:"#e5e3df", display:"flex", alignItems:"center", justifyContent:"center", color:"#555"}}>🗺️ {p.address}</div>;
      case 'MatplotlibChart': return <div style={{width:"100%", height:"100%", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", color:"#555"}}>📈 {p.title}</div>;
      case 'Icon': return <span className="material-icons" style={{fontSize: p.size || 24, color: p.color || "#ffffff", display:"flex", alignItems:"center", justifyContent:"center", width:"100%", height:"100%"}}>{p.iconName || "home"}</span>;
      default: return <div style={{display:"flex", alignItems:"center", justifyContent:"center", width:"100%", height:"100%", color: p.fg||"#fff"}}>{p.text !== undefined ? p.text : `[${comp.type}]`}</div>;
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#1e1e1e", color: "#e0e0e0" }}>
      
{/* GLOBAL DATALIST FOR ICONS - All Material Design Icons */}
<datalist id="material-icons-list">
{/* Navigation */}
<option value="home" /><option value="arrow_back" /><option value="arrow_forward" />
<option value="arrow_upward" /><option value="arrow_downward" /><option value="menu" />
<option value="close" /><option value="fullscreen" /><option value="fullscreen_exit" />
<option value="more_vert" /><option value="more_horiz" /><option value="refresh" />
<option value="search" /><option value="apps" /><option value="keyboard_arrow_up" />
<option value="keyboard_arrow_down" /><option value="keyboard_arrow_left" />
<option value="keyboard_arrow_right" /><option value="unfold_more" /><option value="unfold_less" />

{/* Action */}
<option value="add" /><option value="add_circle" /><option value="remove" />
<option value="remove_circle" /><option value="check" /><option value="check_circle" />
<option value="cancel" /><option value="edit" /><option value="delete" />
<option value="delete_forever" /><option value="save" /><option value="content_copy" />
<option value="content_cut" /><option value="content_paste" /><option value="undo" />
<option value="redo" /><option value="share" /><option value="send" />
<option value="mail" /><option value="reply" /><option value="reply_all" />
<option value="forward" /><option value="print" /><option value="download" />
<option value="upload" /><option value="cloud_upload" /><option value="cloud_download" />

{/* Alert */}
<option value="info" /><option value="info_outline" /><option value="warning" />
<option value="warning_amber" /><option value="error" /><option value="error_outline" />
<option value="help" /><option value="help_outline" /><option value="notification_important" />
<option value="notifications" /><option value="notifications_active" /><option value="notifications_off" />

{/* Communication */}
<option value="phone" /><option value="phone_android" /><option value="email" />
<option value="chat" /><option value="chat_bubble" /><option value="forum" />
<option value="comment" /><option value="feedback" /><option value="message" />

{/* Content */}
<option value="link" /><option value="link_off" /><option value="attachment" />
<option value="file_copy" /><option value="folder" /><option value="folder_open" />
<option value="create_new_folder" /><option value="description" /><option value="article" />
<option value="note" /><option value="event_note" /><option value="list" />
<option value="view_list" /><option value="view_module" /><option value="grid_view" />

{/* Device */}
<option value="smartphone" /><option value="tablet" /><option value="laptop" />
<option value="computer" /><option value="tv" /><option value="watch" />
<option value="camera" /><option value="camera_alt" /><option value="photo_camera" />
<option value="videocam" /><option value="mic" /><option value="volume_up" />
<option value="volume_down" /><option value="volume_off" /><option value="brightness_high" />
<option value="brightness_low" /><option value="wifi" /><option value="wifi_off" />
<option value="battery_full" /><option value="battery_std" /><option value="battery_alert" />

{/* Editor */}
<option value="format_bold" /><option value="format_italic" /><option value="format_underlined" />
<option value="format_strikethrough" /><option value="format_align_left" />
<option value="format_align_center" /><option value="format_align_right" />
<option value="format_align_justify" /><option value="format_list_bulleted" />
<option value="format_list_numbered" /><option value="format_indent_increase" />
<option value="format_indent_decrease" /><option value="text_fields" />

{/* File */}
<option value="save" /><option value="save_as" /><option value="folder_open" />
<option value="upload_file" /><option value="download" /><option value="drive_file_move" />

{/* Hardware */}
<option value="mouse" /><option value="keyboard" /><option value="keyboard_hide" />
<option value="headset" /><option value="speaker" /><option value="print" />
<option value="router" /><option value="memory" /><option value="sd_storage" />

{/* Image */}
<option value="image" /><option value="photo" /><option value="photo_library" />
<option value="add_photo_alternate" /><option value="collections" /><option value="slideshow" />
<option value="crop" /><option value="crop_free" /><option value="rotate_right" />
<option value="rotate_left" /><option value="flip" /><option value="tune" />
<option value="filter" /><option value="color_lens" /><option value="palette" />

{/* Maps */}
<option value="map" /><option value="place" /><option value="directions" />
<option value="directions_car" /><option value="directions_walk" /><option value="directions_bike" />
<option value="directions_boat" /><option value="directions_bus" /><option value="directions_railway" />
<option value="flight" /><option value="local_airport" /><option value="local_taxi" />
<option value="local_shipping" /><option value="local_gas_station" /><option value="traffic" />
<option value="navigation" /><option value="near_me" /><option value="my_location" />
<option value="location_on" /><option value="location_off" /><option value="explore" />

{/* Navigation */}
<option value="apps" /><option value="arrow_back" /><option value="arrow_back_ios" />
<option value="arrow_forward" /><option value="arrow_forward_ios" /><option value="arrow_upward" />
<option value="arrow_downward" /><option value="expand_less" /><option value="expand_more" />
<option value="chevron_left" /><option value="chevron_right" /><option value="first_page" />
<option value="last_page" /><option value="home" /><option value="menu" />
<option value="close" /><option value="more_vert" /><option value="more_horiz" />

{/* Social */}
<option value="person" /><option value="people" /><option value="group" />
<option value="group_add" /><option value="person_add" /><option value="person_remove" />
<option value="contacts" /><option value="favorite" /><option value="favorite_border" />
<option value="star" /><option value="star_border" /><option value="star_half" />
<option value="thumb_up" /><option value="thumb_down" /><option value="thumb_up_alt" />
<option value="thumb_down_alt" /><option value="share" /><option value="ios_share" />

{/* Toggle */}
<option value="toggle_on" /><option value="toggle_off" /><option value="check_box" />
<option value="check_box_outline_blank" /><option value="indeterminate_check_box" />
<option value="radio_button_checked" /><option value="radio_button_unchecked" />
<option value="switch_camera" /><option value="switch_video" />

{/* Objects */}
<option value="phone" /><option value="watch" /><option value="lightbulb" />
<option value="lock" /><option value="lock_open" /><option value="lock_clock" />
<option value="key" /><option value="vpn_key" /><option value="shopping_cart" />
<option value="shopping_bag" /><option value="local_mall" /><option value="credit_card" />
<option value="payments" /><option value="account_balance" /><option value="account_balance_wallet" />
<option value="savings" /><option value="monetization_on" /><option value="sell" />
<option value="local_offer" /><option value="confirmation_number" /><option value="card_giftcard" />

{/* Action Icons */}
<option value="settings" /><option value="settings_applications" /><option value="build" />
<option value="engineering" /><option value="admin_panel_settings" /><option value="manage_accounts" />
<option value="dashboard" /><option value="dashboard_customize" /><option value="speed" />
<option value="analytics" /><option value="bar_chart" /><option value="show_chart" />
<option value="timeline" /><option value="query_stats" /><option value="trending_up" />
<option value="trending_down" /><option value="pie_chart" /><option value="insights" />

{/* Media */}
<option value="play_arrow" /><option value="play_circle" /><option value="pause" />
<option value="pause_circle" /><option value="stop" /><option value="stop_circle" />
<option value="skip_next" /><option value="skip_previous" /><option value="fast_forward" />
<option value="fast_rewind" /><option value="replay" /><option value="shuffle" />
<option value="repeat" /><option value="volume_mute" /><option value="music_note" />
<option value="music_off" /><option value="queue_music" /><option value="playlist_play" />

{/* Places */}
<option value="house" /><option value="apartment" /><option value="business" />
<option value="store" /><option value="storefront" /><option value="restaurant" />
<option value="local_cafe" /><option value="local_bar" /><option value="local_pizza" />
<option value="local_hospital" /><option value="local_pharmacy" /><option value="local_school" />
<option value="local_library" /><option value="local_post_office" /><option value="local_police" />
<option value="local_fire_department" /><option value="park" /><option value="beach_access" />
<option value="pool" /><option value="fitness_center" /><option value="sports_basketball" />
<option value="sports_soccer" /><option value="sports_football" /><option value="sports_baseball" />
<option value="casino" /><option value="nightlife" /><option value="museum" />

{/* Weather */}
<option value="wb_sunny" /><option value="wb_cloudy" /><option value="cloud" />
<option value="cloud_queue" /><option value="water_drop" /><option value="air" />
<option value="thunderstorm" /><option value="grain" /><option value="foggy" />
<option value="severe_cold" /><option value="ac_unit" /><option value="device_thermostat" />

{/* Misc */}
<option value="visibility" /><option value="visibility_off" /><option value="help_center" />
<option value="bug_report" /><option value="flag" /><option value="outlined_flag" />
<option value="emoji_events" /><option value="emoji_events" /><option value="celebration" />
<option value="emoji_people" /><option value="pets" /><option value="eco" />
<option value="science" /><option value="school" /><option value="work" />
<option value="history" /><option value="schedule" /><option value="update" />
<option value="calendar_today" /><option value="calendar_month" /><option value="date_range" />
<option value="timer" /><option value="hourglass_top" /><option value="hourglass_bottom" />
<option value="alarm" /><option value="access_time" /><option value="schedule" />
<option value="extension" /><option value="extension_off" /><option value="widgets" />
<option value="layers" /><option value="backup" /><option value="restore" />
<option value="sync" /><option value="sync_problem" /><option value="sync_disabled" />
<option value="open_in_new" /><option value="open_in_full" /><option value="fullscreen" />
<option value="launch" /><option value="power_settings_new" /><option value="logout" />
<option value="login" /><option value="app_registration" /><option value="verified" />
<option value="verified_user" /><option value="shield" /><option value="security" />
<option value="fingerprint" /><option value="face" /><option value="badge" />
</datalist>
      
      {/* HEADER */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", backgroundColor: "#252526", borderBottom: "1px solid #333", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "20px", color: "#61dafb" }}>✨ Radipy GUI Builder (PRO)</h2>
          
          <div style={{ display: "flex", alignItems: "center", gap: "10px", backgroundColor: "#333", padding: "5px 10px", borderRadius: "4px" }}>
            <span style={{ fontSize: "12px", color: "#aaa" }}>ttk Theme:</span>
            <select
              value={schema.theme || ""}
              onChange={e => setSchemaWithHistory(prev => ({...prev, theme: e.target.value}))}
              style={{ background: "#1e1e1e", color: "white", border: "1px solid #555", borderRadius: "3px", padding: "2px" }}
            >
              <option value="">None (Tk Classic)</option>
              {THEMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
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
        </div>
        
        <div style={{display: "flex", gap: "10px"}}>
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
              {historyIndex.current}/{Math.max(0, history.current.length - 1)}
            </span>
          </div>
          <button onClick={clearProject} style={{ padding: "8px 16px", fontWeight: "bold", backgroundColor: "#3c3c3c", color: "white", border: "none", cursor: "pointer", borderRadius: "4px" }}>
            Clear All
          </button>
          <button onClick={handleExport} style={{ padding: "8px 16px", fontWeight: "bold", backgroundColor: "#007acc", color: "white", border: "none", cursor: "pointer", borderRadius: "4px" }}>
            Generate OOP Code
          </button>
        </div>
      </header>

      {/* WORKSPACE */}
      <main style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        
        {/* LEFT SIDEBAR (Components / Layers) */}
        <aside style={{ width: "250px", backgroundColor: "#2d2d2d", borderRight: "1px solid #3c3c3c", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", borderBottom: "1px solid #3c3c3c" }}>
            <button onClick={()=>setSidebarTab("components")} style={{ flex: 1, padding: "10px", background: sidebarTab==="components"?"#1e1e1e":"transparent", color: sidebarTab==="components"?"#61dafb":"#aaa", border: "none", cursor: "pointer", fontSize: "12px", textTransform:"uppercase" }}>Widgets</button>
            <button onClick={()=>setSidebarTab("layers")} style={{ flex: 1, padding: "10px", background: sidebarTab==="layers"?"#1e1e1e":"transparent", color: sidebarTab==="layers"?"#61dafb":"#aaa", border: "none", cursor: "pointer", fontSize: "12px", textTransform:"uppercase" }}>Layers</button>
          </div>
          
          <div style={{ padding: "15px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "10px"}}>
            {sidebarTab === "components" ? (
              WIDGET_TYPES.map(w => (
                <div 
                  key={w.type} draggable onDragStart={(e) => handleDragStartFromSidebar(e, w)} onDragEnd={handleDragEndFromSidebar} title={w.desc} onClick={() => setSelectedSidebarMenu(w)}
                  style={{ backgroundColor: selectedSidebarMenu?.type === w.type ? "#505050" : "#3c3c3c", padding: "10px", borderRadius: "6px", cursor: "grab", border: selectedSidebarMenu?.type === w.type ? "1px solid #61dafb" : "1px solid #4a4a4a", fontSize: "13px", display: "flex", alignItems: "center", gap: "10px", transition: "all 0.2s" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = selectedSidebarMenu?.type === w.type ? "#505050" : "#4a4a4a"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedSidebarMenu?.type === w.type ? "#505050" : "#3c3c3c"}
                >
                  <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#569cd6" }}></div>
                  {w.type}
                </div>
              ))
            ) : (
              // Layer Tree
              <div>
                <span style={{ fontSize: "11px", color: "#858585" }}>DOCUMENT TREE</span>
                <div style={{ marginLeft: "10px", marginTop: "10px", display: "flex", flexDirection: "column", gap: "5px" }}>
                  {schema.pages.map((p, idx) => (
                    <div key={idx}>
                      <div style={{ color: "#dcdcaa", fontSize: "12px", marginBottom: "5px" }}>📄 {p.name}</div>
                      <div style={{ marginLeft: "15px", display: "flex", flexDirection: "column", gap: "5px" }}>
                        {p.components.map(c => (
                          <div 
                            key={c.id} 
                            onClick={()=> { setActivePage(idx); setSelectedId(c.id); }}
                            style={{ fontSize: "11px", color: selectedId === c.id ? "#61dafb" : "#ce9178", cursor: "pointer", padding: "2px", backgroundColor: selectedId === c.id ? "#3c3c3c" : "transparent" }}
                          >
                            ↳ {c.id} ({c.type})
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* INFO FOOTER FOR THE SELECTED SIDEBAR COMPONENT */}
          {sidebarTab === "components" && selectedSidebarMenu && (
            <div style={{ padding: "15px", borderTop: "1px solid #3c3c3c", backgroundColor: "#252526", minHeight: "100px" }}>
              <h4 style={{ margin: "0 0 8px 0", color: "#4ec9b0", fontSize: "13px" }}>{selectedSidebarMenu.type}</h4>
              <p style={{ margin: 0, fontSize: "11px", color: "#aaa", lineHeight: "1.4" }}>{selectedSidebarMenu.desc}</p>
            </div>
          )}
        </aside>

        {/* CENTER CANVASES (TABS) */}
        <section style={{ flex: 1, backgroundColor: "#1e1e1e", display: "flex", flexDirection: "column" }}>
          
          <div style={{ display: "flex", backgroundColor: "#2d2d2d", borderBottom: "1px solid #3c3c3c" }}>
            {schema.pages.map((page, idx) => (
              <div 
                key={idx} 
                style={{ padding: "10px 15px", cursor: "pointer", borderRight: "1px solid #3c3c3c", display: "flex", alignItems: "center", gap: "10px", backgroundColor: activePage === idx ? "#1e1e1e" : "#2d2d2d", color: activePage === idx ? "#61dafb" : "#858585"}}
                onClick={() => setActivePage(idx)}
              >
                <input 
                  value={page.name} 
                  onChange={e => {
                    setSchemaWithHistory(prev => ({
                      ...prev,
                      pages: prev.pages.map((p, i) => i !== idx ? p : { ...p, name: e.target.value })
                    }));
                  }}
                  style={{ background: "transparent", border: "none", color: "inherit", width: "70px", fontSize: "13px", outline: "none" }}
                />
                <button onClick={(e) => { e.stopPropagation(); deletePage(idx); }} style={{ background: "transparent", color: "inherit", border: "none", cursor: "pointer", fontSize: "12px"}}>✕</button>
              </div>
            ))}
            <button onClick={addPage} style={{ background: "transparent", color: "#aaa", border: "none", cursor: "pointer", padding: "0 15px", fontSize: "18px" }}>+</button>
          </div>

          <div style={{ flex: 1, padding: "20px", overflow: "auto", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
            <div 
              ref={canvasRef} onDrop={handleDropOnCanvas} onDragOver={handleDragOver}
              style={{ width: `${schema.window?.width ?? 800}px`, height: `${schema.window?.height ?? 600}px`, backgroundColor: "#2d2d2d", position: "relative", border: "1px solid #3c3c3c", boxShadow: "0 10px 30px rgba(0,0,0,0.5)", backgroundImage: gridEnabled
                  ? "linear-gradient(#3c3c3c 1px, transparent 1px), linear-gradient(90deg, #3c3c3c 1px, transparent 1px)"
                  : "none",
                backgroundSize: "20px 20px" }}
            >
{currentComponents.map(comp => (
          <div
            key={comp.id} draggable={!isResizing} onDragStart={(e) => handleDragStartFromCanvas(e, comp)} onClick={(e) => {
              e.stopPropagation();
              setSelectedId(comp.id);
              // For Notebook: detect which tab was clicked in the tab bar
              if (comp.type === 'ttk.Notebook' && comp.tabs?.length > 0) {
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
            style={{ position: "absolute", left: comp.layout.x, top: comp.layout.y, width: comp.layout.width, height: comp.layout.height, border: selectedId === comp.id ? "2px solid #569cd6" : "1px dashed transparent", cursor: isResizing ? "nwse-resize" : "move", userSelect: "none", boxSizing: "border-box" }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = selectedId === comp.id ? "#569cd6" : "#4a4a4a"}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = selectedId === comp.id ? "#569cd6" : "transparent"}
          >
            <div style={{width: "100%", height: "100%", pointerEvents: "none"}}>
              {renderPreview(comp)}
            </div>
            {selectedId === comp.id && (
              <div
                onMouseDown={(e) => startResize(e, comp.id)}
                style={{ position: "absolute", right: "-4px", bottom: "-4px", width: "8px", height: "8px", backgroundColor: "#569cd6", cursor: "se-resize", borderRadius: "50%", zIndex: 100 }}
              />
            )}
          </div>
        ))}
        
        {dragPreview && (
          <div
            style={{
              position: "absolute",
              left: mousePos.x - (dragPreview.defaultLayout.width || 100) / 2,
              top: mousePos.y - (dragPreview.defaultLayout.height || 30) / 2,
              width: dragPreview.defaultLayout.width || 100,
              height: dragPreview.defaultLayout.height || 30,
              opacity: 0.7,
              pointerEvents: "none",
              border: "2px dashed #61dafb",
              borderRadius: "4px",
              backgroundColor: "rgba(97, 218, 251, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
              color: "#61dafb",
              zIndex: 1000,
              boxShadow: "0 4px 12px rgba(97, 218, 251, 0.3)"
            }}
          >
            <div style={{ width: "100%", height: "100%", padding: "4px", overflow: "hidden" }}>
              {renderPreview({ type: dragPreview.type, props: dragPreview.defaultProps, layout: dragPreview.defaultLayout })}
            </div>
          </div>
        )}
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
            </div>
          </div>
        </section>

        {/* RIGHT SIDEBAR - INSPECTOR */}
        <aside style={{ width: "300px", display: "flex", flexDirection: "column", borderLeft: "1px solid #3c3c3c" }}>
          
          <div style={{ flex: 1, backgroundColor: "#252526", padding: "15px", overflowY: "auto", borderBottom: "1px solid #3c3c3c" }}>
            <h3 style={{ margin: "0 0 15px 0", fontSize: "14px", color: "#dcdcaa", textTransform: "uppercase" }}>Inspector</h3>
            
            {!selectedComp ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <strong style={{ fontSize: "12px", color: "#c586c0" }}>Window Properties</strong>
                <div style={{ height: "1px", backgroundColor: "#3c3c3c" }} />

                <span style={{ fontSize: "11px", color: "#858585" }}>Size (w × h)</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px" }}>
                  <div>
                    <span style={{ fontSize: "10px" }}>W:</span>
                    <input
                      type="number"
                      min={100}
                      value={sizeDraft.w ?? (schema.window?.width ?? 800)}
                      onChange={e => setSizeDraft(prev => ({ ...prev, w: e.target.value }))}
                      onBlur={e => {
                        const val = Math.max(100, parseInt(e.target.value) || 100);
                        setSchemaWithHistory(prev => ({ ...prev, window: { ...prev.window, width: val } }));
                        setSizeDraft(prev => ({ ...prev, w: null }));
                      }}
                      style={{ width: "100%", background: "#3c3c3c", border: "1px solid #555", color: "white", padding: "3px" }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: "10px" }}>H:</span>
                    <input
                      type="number"
                      min={100}
                      value={sizeDraft.h ?? (schema.window?.height ?? 600)}
                      onChange={e => setSizeDraft(prev => ({ ...prev, h: e.target.value }))}
                      onBlur={e => {
                        const val = Math.max(100, parseInt(e.target.value) || 100);
                        setSchemaWithHistory(prev => ({ ...prev, window: { ...prev.window, height: val } }));
                        setSizeDraft(prev => ({ ...prev, h: null }));
                      }}
                      style={{ width: "100%", background: "#3c3c3c", border: "1px solid #555", color: "white", padding: "3px" }}
                    />
                  </div>
                </div>

                <span style={{ fontSize: "10px", color: "#ccc" }}>title:</span>
                <input type="text" value={schema.window?.title ?? ""}
                  onChange={e => setSchemaWithHistory(prev => ({ ...prev, window: { ...prev.window, title: e.target.value } }))}
                  style={{ width: "100%", background: "#3c3c3c", border: "1px solid #555", color: "white", padding: "3px" }} />

                <span style={{ fontSize: "11px", color: "#858585" }}>Min Size (w × h)</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px" }}>
                  <div>
                    <span style={{ fontSize: "10px" }}>W:</span>
                    <input type="number" value={schema.window?.minWidth ?? 0}
                      onChange={e => setSchemaWithHistory(prev => ({ ...prev, window: { ...prev.window, minWidth: Math.max(0, parseInt(e.target.value)||0) } }))}
                      style={{ width: "100%", background: "#3c3c3c", border: "1px solid #555", color: "white", padding: "3px" }} />
                  </div>
                  <div>
                    <span style={{ fontSize: "10px" }}>H:</span>
                    <input type="number" value={schema.window?.minHeight ?? 0}
                      onChange={e => setSchemaWithHistory(prev => ({ ...prev, window: { ...prev.window, minHeight: Math.max(0, parseInt(e.target.value)||0) } }))}
                      style={{ width: "100%", background: "#3c3c3c", border: "1px solid #555", color: "white", padding: "3px" }} />
                  </div>
                </div>

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

                <span style={{ fontSize: "10px", color: "#ccc" }}>bg (background):</span>
                <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                  <input type="color" value={schema.window?.bg || "#000000"}
                    onChange={e => setSchemaWithHistory(prev => ({ ...prev, window: { ...prev.window, bg: e.target.value } }))}
                    style={{ width: "40px", cursor: "pointer", padding: "0", border: "none", background: "transparent" }} />
                  <input type="text" value={schema.window?.bg ?? ""}
                    onChange={e => setSchemaWithHistory(prev => ({ ...prev, window: { ...prev.window, bg: e.target.value } }))}
                    style={{ flex: 1, background: "#3c3c3c", border: "1px solid #555", color: "white", padding: "3px" }} />
                </div>

                <label style={{ fontSize: "11px", color: "#569cd6", display: "flex", alignItems: "center", gap: "6px" }}>
                  <input type="checkbox" checked={schema.window?.overrideredirect ?? false}
                    onChange={e => setSchemaWithHistory(prev => ({ ...prev, window: { ...prev.window, overrideredirect: e.target.checked } }))} />
                  Override Redirect (no title bar)
                </label>

                <label style={{ fontSize: "11px", color: "#569cd6", display: "flex", alignItems: "center", gap: "6px" }}>
                  <input type="checkbox" checked={schema.window?.showMenuBar ?? false}
                    onChange={e => setSchemaWithHistory(prev => ({ ...prev, window: { ...prev.window, showMenuBar: e.target.checked } }))} />
                  Show Menu Bar
                </label>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "12px", color: "#4ec9b0"}}>{selectedComp.id}</strong>
                  <button onClick={() => deleteComponent(selectedComp.id)} style={{ backgroundColor: "#f44336", color: "white", border: "none", borderRadius: "3px", cursor: "pointer", fontSize: "10px", padding: "2px 5px"}}>DEL</button>
                </div>
                <div style={{ height: "1px", backgroundColor: "#3c3c3c", margin: "5px 0" }}></div>
                
                <span style={{ fontSize: "11px", color: "#858585" }}>Layout (x, y, w, h)</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px" }}>
                  <div><span style={{fontSize:"10px"}}>X:</span> <input type="number" value={selectedComp.layout.x} onChange={e => updateComponentLayout(selectedComp.id, {x: Math.max(0, snapToGrid(parseInt(e.target.value)||0, gridEnabled))})} style={{width: "100%", background: "#3c3c3c", border: "1px solid #555", color: "white", padding: "3px"}}/></div>
                  <div><span style={{fontSize:"10px"}}>Y:</span> <input type="number" value={selectedComp.layout.y} onChange={e => updateComponentLayout(selectedComp.id, {y: Math.max(0, snapToGrid(parseInt(e.target.value)||0, gridEnabled))})} style={{width: "100%", background: "#3c3c3c", border: "1px solid #555", color: "white", padding: "3px"}}/></div>
                  <div><span style={{fontSize:"10px"}}>W:</span> <input type="number" value={selectedComp.layout.width} onChange={e => updateComponentLayout(selectedComp.id, {width: Math.max(20, snapToGrid(parseInt(e.target.value)||0, gridEnabled))})} style={{width: "100%", background: "#3c3c3c", border: "1px solid #555", color: "white", padding: "3px"}}/></div>
                  <div><span style={{fontSize:"10px"}}>H:</span> <input type="number" value={selectedComp.layout.height} onChange={e => updateComponentLayout(selectedComp.id, {height: Math.max(20, snapToGrid(parseInt(e.target.value)||0, gridEnabled))})} style={{width: "100%", background: "#3c3c3c", border: "1px solid #555", color: "white", padding: "3px"}}/></div>
                </div>

                <div style={{ height: "1px", backgroundColor: "#3c3c3c", margin: "5px 0" }}></div>

                <span style={{ fontSize: "11px", color: "#858585" }}>Properties & Events</span>
                {Object.keys(selectedComp.props).map(key => {
                  if (selectedComp.type === 'ttk.PanedWindow' && key === 'paneCount') {
                    return (
                      <div key={key} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ fontSize: "10px", color: "#ccc" }}>paneCount:</span>
                        <select
                          value={selectedComp.props.paneCount || 2}
                          onChange={e => {
                            const newCount = parseInt(e.target.value);
                            setSchemaWithHistory(prev => {
                              const newPages = prev.pages.map((page, pi) => {
                                if (pi !== activePage) return page;
                                return {
                                  ...page,
                                  components: page.components.map(c => {
                                    if (c.id !== selectedId) return c;
                                    const existingPanes = c.panes || [];
                                    return {
                                      ...c,
                                      props: { ...c.props, paneCount: newCount },
                                      panes: Array.from({ length: newCount }, (_, i) =>
                                        existingPanes[i] || { id: `${c.id}_pane_${i}`, components: [] }
                                      )
                                    };
                                  })
                                };
                              });
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
                  if (selectedComp.type === 'ttk.Notebook' && key === 'tabCount') {
                    return (
                      <div key={key} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ fontSize: "10px", color: "#ccc" }}>tabCount:</span>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={selectedComp.props.tabCount || 2}
                          onChange={e => {
                            const newCount = Math.max(1, parseInt(e.target.value) || 1);
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
                          style={{ width: "100%", background: "#3c3c3c", border: "1px solid #555", color: "white", padding: "3px" }}
                        />
                      </div>
                    );
                  }
                  if (selectedComp.type === 'ttk.Notebook' && key === 'tabHeight') {
                    return (
                      <div key={key} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ fontSize: "10px", color: "#ccc" }}>tabHeight:</span>
                        <input
                          type="number"
                          min={18}
                          value={selectedComp.props.tabHeight || 28}
                          onChange={e => updateComponentProps(selectedComp.id, 'tabHeight', Math.max(18, parseInt(e.target.value)||28))}
                          style={{ width: "100%", background: "#3c3c3c", border: "1px solid #555", color: "white", padding: "3px" }}
                        />
                      </div>
                    );
                  }
                  const isColor = ["bg", "fg", "color"].includes(key);
                  return (
                    <div key={key} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{fontSize:"10px", textTransform: "capitalize", color: key === "commandEvent" ? "#569cd6" : "#ccc"}}>{key}:</span>
                      {key === "iconName" ? (
                        <div style={{display: "flex", gap: "5px"}}>
                           <input type="text" list="material-icons-list" value={selectedComp.props[key]||""} onChange={e => updateComponentProps(selectedComp.id, key, e.target.value)} placeholder="e.g. settings" style={{flex: 1, background: "#3c3c3c", border: "1px solid #555", color: "white", padding: "3px"}} />
                        </div>
                      ) : isColor ? (
                        <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                          <input type="color" value={selectedComp.props[key]} onChange={e => updateComponentProps(selectedComp.id, key, e.target.value)} style={{width: "40px", cursor: "pointer", padding: "0", border: "none", background: "transparent"}} />
                          <input type="text" value={selectedComp.props[key]} onChange={e => updateComponentProps(selectedComp.id, key, e.target.value)} style={{flex: 1, background: "#3c3c3c", border: "1px solid #555", color: "white", padding: "3px"}}/>
                        </div>
                      ) : (
                        <input type="text" value={selectedComp.props[key]} onChange={e => updateComponentProps(selectedComp.id, key, e.target.value)} style={{width: "100%", background: "#3c3c3c", border: "1px solid #555", color: "white", padding: "3px"}}/>
                      )}
                    </div>
                  );
                })}
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
              </div>
            )}
          </div>

{/* CODE OUTPUT */}
      <div style={{ flex: 1, backgroundColor: "#1e1e1e", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <h3 style={{ margin: "15px 15px 5px 15px", fontSize: "14px", color: "#c586c0", textTransform: "uppercase" }}>Generated Artifacts</h3>
        
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", padding: "0 15px 15px 15px", overflow: "auto" }}>
          <div style={{ flex: 2, backgroundColor: "#252526", borderRadius: "4px", border: "1px solid #3c3c3c", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 10px", borderBottom: "1px solid #3c3c3c", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "#569cd6", fontWeight: "bold" }}>📄 generated_app.py</span>
              <button onClick={() => navigator.clipboard.writeText(generatedCode)} style={{ fontSize: "10px", padding: "2px 8px", background: "#3c3c3c", border: "none", color: "#aaa", borderRadius: "3px", cursor: "pointer" }}>Copy</button>
            </div>
            <div style={{ flex: 1, overflow: "auto" }}>
              <SyntaxHighlighter
                language="python"
                style={vscDarkPlus}
                customStyle={{ margin: 0, background: "transparent", fontSize: "11px", lineHeight: "1.4", minHeight: "100%" }}
                showLineNumbers={!!generatedCode}
              >
                {generatedCode || "# Click 'Generate OOP Code' to see the Object-Oriented App Class..."}
              </SyntaxHighlighter>
            </div>
          </div>

          <div style={{ flex: 1, backgroundColor: "#252526", borderRadius: "4px", border: "1px solid #3c3c3c", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 10px", borderBottom: "1px solid #3c3c3c", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "#4ec9b0", fontWeight: "bold" }}>📦 requirements.txt</span>
              <button onClick={() => navigator.clipboard.writeText(generatedRequirements)} style={{ fontSize: "10px", padding: "2px 8px", background: "#3c3c3c", border: "none", color: "#aaa", borderRadius: "3px", cursor: "pointer" }}>Copy</button>
            </div>
            <pre style={{ flex: 1, margin: 0, padding: "10px", fontSize: "10px", color: "#6a9955", overflow: "auto", whiteSpace: "pre-wrap", lineHeight: "1.3" }}>
              {generatedRequirements || "# Dependencies will appear here..."}
            </pre>
          </div>

          <div style={{ flex: 1, backgroundColor: "#252526", borderRadius: "4px", border: "1px solid #3c3c3c", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 10px", borderBottom: "1px solid #3c3c3c" }}>
              <span style={{ fontSize: "11px", color: "#dcdcaa", fontWeight: "bold" }}>📋 Run Instructions</span>
            </div>
            <pre style={{ flex: 1, margin: 0, padding: "10px", fontSize: "10px", color: "#9cdcfe", overflow: "auto", whiteSpace: "pre-wrap", lineHeight: "1.3" }}>
              {generatedInstructions || "# Run instructions will appear here..."}
            </pre>
          </div>
        </div>
      </div>
          
        </aside>
      </main>
    </div>
  );
}

export default App;
