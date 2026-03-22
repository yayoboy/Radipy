/**
 * Basic tests for Radipy App component
 */
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import App from '../App';

describe('App Component - Basic', () => {
  describe('Initial Render', () => {
    test('renders header with title', () => {
      render(<App />);
      expect(screen.getByText(/Radipy GUI Builder/i)).toBeInTheDocument();
    });

    test('renders theme selector', () => {
      render(<App />);
      expect(screen.getByText(/ttk Theme:/i)).toBeInTheDocument();
    });

    test('renders widgets sidebar tab', () => {
      render(<App />);
      expect(screen.getByRole('button', { name: /Widgets/i })).toBeInTheDocument();
    });

    test('renders layers sidebar tab', () => {
      render(<App />);
      expect(screen.getByRole('button', { name: /Layers/i })).toBeInTheDocument();
    });

    test('renders inspector panel', () => {
      render(<App />);
      expect(screen.getByText(/Inspector/i)).toBeInTheDocument();
    });

    test('renders generated code panel', () => {
      render(<App />);
      expect(screen.getByText(/Generated Artifacts/i)).toBeInTheDocument();
    });

    test('displays widget types in sidebar', () => {
      render(<App />);
      expect(screen.getByText('Button')).toBeInTheDocument();
      expect(screen.getByText('Label')).toBeInTheDocument();
      expect(screen.getByText('Entry')).toBeInTheDocument();
    });

    test('displays advanced widgets', () => {
      render(<App />);
      expect(screen.getByText('MapView')).toBeInTheDocument();
      expect(screen.getByText('MatplotlibChart')).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    test('starts with one default tab', () => {
      render(<App />);
      const tabInput = screen.getByDisplayValue('Tab 1');
      expect(tabInput).toBeInTheDocument();
    });

    test('has default theme darkly selected', () => {
      render(<App />);
      const themeSelect = screen.getByRole('combobox');
      expect(themeSelect).toHaveValue('darkly');
    });
  });

  describe('Grid Snapping', () => {
    test('renders grid toggle button', () => {
      render(<App />);
      expect(screen.getByTitle(/grid snapping/i)).toBeInTheDocument();
    });

    test('grid button toggles grid label', async () => {
      render(<App />);
      const btn = screen.getByTitle('Grid Snapping');
      expect(btn.textContent).toMatch(/Grid: ON/);
      await act(async () => { fireEvent.click(btn); });
      expect(btn.textContent).toMatch(/Grid: OFF/);
    });
  });

  describe('Syntax Highlighting', () => {
    test('renders generated_app.py label in code panel', () => {
      render(<App />);
      expect(screen.getByText(/generated_app\.py/i)).toBeInTheDocument();
    });
  });

  describe('Undo/Redo', () => {
    test('renders undo button', () => {
      render(<App />);
      expect(screen.getByTitle(/undo \(ctrl\+z\)/i)).toBeInTheDocument();
    });

    test('renders redo button', () => {
      render(<App />);
      expect(screen.getByTitle(/redo \(ctrl\+y\)/i)).toBeInTheDocument();
    });

    test('undo button is disabled initially', () => {
      render(<App />);
      expect(screen.getByTitle(/undo \(ctrl\+z\)/i)).toBeDisabled();
    });

    test('redo button is disabled initially', () => {
      render(<App />);
      expect(screen.getByTitle(/redo \(ctrl\+y\)/i)).toBeDisabled();
    });
  });

  describe('Window Properties', () => {
    test('window inspector shows when nothing selected', () => {
      localStorage.clear();
      render(<App />);
      expect(screen.getByText(/window properties/i)).toBeInTheDocument();
    });
  });

  describe('Canvas', () => {
    test('canvas resize handle renders', () => {
      localStorage.clear();
      render(<App />);
      expect(document.querySelector('[data-testid="canvas-resize-handle"]')).toBeInTheDocument();
    });
  });
});
