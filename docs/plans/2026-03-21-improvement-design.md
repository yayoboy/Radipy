# Radipy Improvement Design Document

**Date**: 2026-03-21  
**Author**: Sisyphus  
**Status**: Draft  
**Target**: Commercial Product Launch

---

## Executive Summary

This document outlines a comprehensive 8-week improvement plan for Radipy, transforming it from an MVP GUI builder into a commercial-ready product. The approach is **Hybrid**: combining stabilization, UX features, deployment infrastructure, and commercial launch elements in a prioritized sequence.

---

## Current State Analysis

### Strengths
- ✅ Core functionality working (drag-drop, code generation)
- ✅ Clean architecture (FastAPI + React)
- ✅ 51 backend tests passing (96% coverage)
- ✅ Docker configuration ready
- ✅ Comprehensive README

### Gaps
- ❌ Frontend tests broken (localStorage mock issues)
- ⚠️ CSS still inline in App.jsx
- ❌ No TypeScript type safety
- ❌ No CI/CD pipeline
- ❌ No undo/redo functionality
- ❌ No templates library
- ❌ No deployment configuration
- ❌ No monetization strategy

---

## Improvement Approaches Considered

### Option A: Foundation First
- **Focus**: Quality and stability
- **Duration**: 4 weeks
- **Risk**: Low stakeholder satisfaction (no visible changes)

### Option B: Feature Sprint
- **Focus**: User-visible features
- **Duration**: 4 weeks
- **Risk**: Technical debt accumulation

### Option C: Commercial Ready
- **Focus**: Infrastructure and billing
- **Duration**: 4 weeks
- **Risk**: High initial investment

### Option D: Hybrid (Recommended)
- **Focus**: Balanced approach
- **Duration**: 8 weeks
- **Risk**: Managed complexity, steady progress

---

## Detailed Design: Hybrid Approach

### Phase 1: Stabilization (Week 1-2)

#### 1.1 Fix Frontend Tests

**Problem**: Vitest tests fail due to localStorage mock issues.

**Solution**: 
```javascript
// frontend/src/setupTests.js
import '@testing-library/jest-dom';
import { vi } from 'vitest';

const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});
```

**Files to Modify**:
- `frontend/src/setupTests.js`
- `frontend/vite.config.js`
- `frontend/src/__tests__/App.test.jsx`

**Success Criteria**: `npm run test:run` → 10/10 passing

---

#### 1.2 TypeScript Migration

**Objective**: Convert React frontend to TypeScript for type safety.

**Type Definitions**:
```typescript
// types/widget.ts
export type WidgetType = 
  | 'Button' | 'Label' | 'Entry' | 'Text' 
  | 'ttk.Progressbar' | 'ttk.Combobox' 
  | 'MapView' | 'MatplotlibChart';

export interface WidgetProps {
  text?: string;
  bootstyle?: string;
  commandEvent?: string;
  value?: number;
  [key: string]: any;
}

export interface Layout {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface Component {
  type: WidgetType;
  id: string;
  props: WidgetProps;
  layout: Layout;
}

// types/schema.ts
export interface Page {
  name: string;
  components: Component[];
}

export interface ProjectSchema {
  theme: string;
  pages: Page[];
}
```

**Component Structure**:
```
frontend/src/
├── types/
│   ├── widget.ts
│   ├── schema.ts
│   └── api.ts
├── components/
│   ├── Canvas.tsx
│   ├── Sidebar.tsx
│   ├── Inspector.tsx
│   └── Header.tsx
├── hooks/
│   ├── useSchema.ts
│   ├── useDragDrop.ts
│   └── useLocalStorage.ts
└── App.tsx
```

**Dependencies**:
```json
{
  "typescript": "^5.3.0",
  "@types/react": "^18.2.0",
  "@types/react-dom": "^18.2.0"
}
```

---

#### 1.3 CSS Modules Extraction

**Problem**: App.jsx has 476 lines with inline CSS.

**Solution**: Extract to CSS modules.

**File Structure**:
```
styles/
├── variables.css
├── components/
│   ├── Button.module.css
│   ├── Sidebar.module.css
│   ├── Canvas.module.css
│   └── Inspector.module.css
└── global.css
```

**variables.css**:
```css
:root {
  --bg-primary: #1e1e1e;
  --bg-secondary: #252526;
  --bg-tertiary: #2d2d2d;
  --accent-primary: #61dafb;
  --text-primary: #e0e0e0;
}
```

---

#### 1.4 CI/CD Pipeline

**GitHub Actions Workflow**:
```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r backend/requirements.txt
      - run: cd backend && pytest --cov=. --cov-report=xml
      - uses: codecov/codecov-action@v4

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: cd frontend && npm ci
      - run: cd frontend && npm run test:run

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
      - run: pip install ruff && ruff check backend/
      - uses: actions/setup-node@v4
      - run: cd frontend && npm ci && npm run lint
```

---

### Phase 2: UX Features (Week 3-4)

#### 2.1 Undo/Redo System

**Implementation**:
```typescript
// hooks/useUndoRedo.ts
import { useState, useCallback } from 'react';
import { ProjectSchema } from '../types/schema';

interface UndoRedoState {
  history: ProjectSchema[];
  currentIndex: number;
}

export function useUndoRedo(initialState: ProjectSchema, maxHistory = 50) {
  const [state, setState] = useState<UndoRedoState>({
    history: [initialState],
    currentIndex: 0,
  });

  const pushState = useCallback((newSchema: ProjectSchema) => {
    setState(prev => {
      const newHistory = prev.history.slice(0, prev.currentIndex + 1);
      newHistory.push(newSchema);
      if (newHistory.length > maxHistory) {
        newHistory.shift();
        return { history: newHistory, currentIndex: newHistory.length - 1 };
      }
      return { history: newHistory, currentIndex: newHistory.length - 1 };
    });
  }, [maxHistory]);

  const undo = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentIndex: Math.max(0, prev.currentIndex - 1),
    }));
  }, []);

  const redo = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentIndex: Math.min(prev.history.length - 1, prev.currentIndex + 1),
    }));
  }, []);

  return {
    schema: state.history[state.currentIndex],
    pushState,
    undo,
    redo,
    canUndo: state.currentIndex > 0,
    canRedo: state.currentIndex < state.history.length - 1,
  };
}
```

**Keyboard Integration**:
```typescript
// hooks/useKeyboardShortcuts.ts
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault();
      e.shiftKey ? redo() : undo();
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [undo, redo]);
```

---

#### 2.2 Templates Library

**Template Structure**:
```json
// templates/login.json
{
  "name": "Login Form",
  "description": "Simple login form with email and password",
  "schema": {
    "theme": "cosmo",
    "pages": [{
      "name": "Login",
      "components": [
        {
          "type": "Label",
          "id": "lbl_title",
          "props": { "text": "Welcome Back" },
          "layout": { "x": 150, "y": 50, "width": 200, "height": 30 }
        },
        {
          "type": "Entry",
          "id": "entry_email",
          "props": { "text": "" },
          "layout": { "x": 100, "y": 120, "width": 200, "height": 25 }
        },
        {
          "type": "Entry",
          "id": "entry_password",
          "props": { "text": "", "show": "*" },
          "layout": { "x": 100, "y": 160, "width": 200, "height": 25 }
        },
        {
          "type": "Button",
          "id": "btn_login",
          "props": { "text": "Login", "bootstyle": "primary", "commandEvent": "on_login" },
          "layout": { "x": 150, "y": 210, "width": 100, "height": 35 }
        }
      ]
    }]
  }
}
```

**Templates List**:
1. Login Form
2. Dashboard
3. Settings Panel
4. File Browser
5. Calculator
6. Data Entry Form
7. Calculator Scientific
8. Calendar App

---

#### 2.3 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + S` | Save project |
| `Ctrl/Cmd + G` | Generate code |
| `Ctrl/Cmd + N` | New project |
| `Delete` | Delete component |
| `Arrow keys` | Move component |
| `Ctrl/Cmd + D` | Duplicate component |
| `Escape` | Deselect |

---

### Phase 3: Deploy & Infrastructure (Week 5-6)

#### 3.1 Frontend Deployment (Vercel)

**vercel.json**:
```json
{
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "http://localhost:8000/$1" }
  ]
}
```

---

#### 3.2 Backend Deployment (Railway)

**railway.toml**:
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "uvicorn main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/"
healthcheckTimeout = 300
restartPolicyType = "on_failure"
```

---

#### 3.3 Supabase Integration

**Database Schema**:
```sql
-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  schema JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own projects" 
  ON projects FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" 
  ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" 
  ON projects FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" 
  ON projects FOR DELETE USING (auth.uid() = user_id);
```

---

### Phase 4: Commercial Launch (Week 7-8)

#### 4.1 Pricing Tiers

| Tier | Price | Features |
|------|-------|----------|
| **Free** | €0 | 3 projects, basic widgets, community support |
| **Pro** | €9/mo | Unlimited projects, all widgets, templates, priority support |
| **Team** | €29/mo | Everything in Pro + collaboration, version history, dedicated support |

---

#### 4.2 Landing Page Structure

```
┌─────────────────────────────────────────┐
│           NAVIGATION BAR                 │
├─────────────────────────────────────────┤
│                                         │
│   Build Python GUIs                     │
│   in Minutes, Not Hours                 │
│                                         │
│   [Start Free] [Watch Demo]             │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│         INTERACTIVE DEMO GIF            │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│   ✅ Drag & Drop    ✅ Export to .py    │
│   ✅ 20+ Widgets    ✅ ttkbootstrap     │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│         PRICING COMPARISON               │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│   [Start Building For Free]             │
│                                         │
└─────────────────────────────────────────┘
```

---

#### 4.3 Onboarding Flow

```
┌────────────────┐
│  1. Welcome    │ → "Choose a template or start from scratch"
├────────────────┤
│  2. Tutorial   │ → 3-step interactive overlay
├────────────────┤
│  3. First GUI  │ → Auto-create sample project
├────────────────┤
│  4. Success    │ → "🎉 You built your first GUI!"
└────────────────┘
```

---

## Final Architecture

```
Radipy/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── backend/
│   ├── tests/
│   │   ├── test_generator.py
│   │   ├── test_api.py
│   │   └── test_validator.py
│   ├── validator/
│   │   └── schemas.py
│   ├── generator/
│   │   └── core.py
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── types/
│   │   │   ├── widget.ts
│   │   │   └── schema.ts
│   │   ├── components/
│   │   │   ├── Canvas.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Inspector.tsx
│   │   │   └── Header.tsx
│   │   ├── hooks/
│   │   │   ├── useUndoRedo.ts
│   │   │   ├── useKeyboardShortcuts.ts
│   │   │   └── useLocalStorage.ts
│   │   ├── templates/
│   │   │   ├── login.json
│   │   │   ├── dashboard.json
│   │   │   └── form.json
│   │   ├── styles/
│   │   │   ├── variables.css
│   │   │   └── global.css
│   │   └── App.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── docs/
│   ├── getting-started.md
│   ├── user-guide/
│   └── api/
├── docker-compose.yml
├── vercel.json
├── railway.toml
└── README.md
```

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Backend Test Coverage | 96% | >90% |
| Frontend Test Coverage | 0% | >80% |
| Lighthouse Score | N/A | >90 |
| Build Time | N/A | <2 min |
| Deploy Time | N/A | <5 min |
| Time to First Widget | ~2 min | <30 sec |
| Weekly Active Users | 0 | 100+ |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| TypeScript migration breaks existing code | Incremental migration, maintain JS fallback |
| Performance degradation with undo/redo | Limit history to 50 states, use immutable updates |
| Deployment complexity | Use managed services (Vercel, Railway) |
| Low adoption | Free tier, templates, good onboarding |

---

## Conclusion

This 8-week hybrid plan transforms Radipy from MVP to commercial product:

1. **Week 1-2**: Solid foundation (tests, TypeScript, CI/CD)
2. **Week 3-4**: User-loved features (undo/redo, templates)
3. **Week 5-6**: Production infrastructure (deploy, auth, storage)
4. **Week 7-8**: Commercial launch (landing, onboarding, docs)

**Estimated Effort**: 160-200 hours total

---

*Document Version: 1.0*  
*Last Updated: 2026-03-21*
