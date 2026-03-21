"""
Tests for the code generator module.
"""
import pytest
from generator.core import generate_tkinter_code


class TestGenerateTkinterCode:
    """Test suite for generate_tkinter_code function."""

    def test_generate_with_theme(self, sample_project):
        """Test code generation with ttkbootstrap theme."""
        code = generate_tkinter_code(sample_project)
        
        # Check theme imports
        assert "import ttkbootstrap as ttk" in code
        assert "from ttkbootstrap.constants import *" in code
        
        # Check class definition with ttk.Window base
        assert "class App(ttk.Window):" in code
        assert "super().__init__(themename='darkly')" in code
        
        # Check component creation
        assert "self.btn_submit" in code
        assert "self.lbl_title" in code
        
        # Check event handler skeleton
        assert "def on_submit(self):" in code

    def test_generate_without_theme(self, minimal_project):
        """Test code generation without theme (classic Tkinter)."""
        code = generate_tkinter_code(minimal_project)
        
        # Check classic Tkinter imports
        assert "import tkinter as tk" in code
        assert "from tkinter import ttk" in code
        
        # Check class definition with tk.Tk base
        assert "class App(tk.Tk):" in code
        assert "super().__init__()" in code

    def test_multi_page_generates_notebook(self, multi_page_project):
        """Test that multi-page projects generate Notebook widget."""
        code = generate_tkinter_code(multi_page_project)
        
        # Check notebook setup
        assert "self.notebook = ttk.Notebook(self)" in code
        assert "self.notebook.pack(fill='both', expand=True)" in code
        
        # Check frames for each page
        assert "self.frame_page_0" in code
        assert "self.frame_page_1" in code
        
        # Check tabs added
        assert "self.notebook.add" in code

    def test_single_page_no_notebook(self, sample_project):
        """Test that single-page projects don't generate Notebook."""
        code = generate_tkinter_code(sample_project)
        
        # Should not have notebook for single page
        assert "self.notebook" not in code

    def test_component_layout_placement(self, sample_project):
        """Test that components use .place() with correct coordinates."""
        code = generate_tkinter_code(sample_project)
        
        # Check placement syntax
        assert ".place(" in code
        assert "x=100" in code
        assert "y=50" in code
        assert "width=100" in code
        assert "height=35" in code

    def test_button_with_command(self, sample_project):
        """Test button with command event binding."""
        code = generate_tkinter_code(sample_project)
        
        # Check command binding (not quoted)
        assert "command=self.on_submit" in code
        assert 'command="self.on_submit"' not in code

    def test_label_without_command(self, sample_project):
        """Test that Label doesn't have command binding."""
        code = generate_tkinter_code(sample_project)
        
        # Label should not have command
        lbl_lines = [line for line in code.split('\n') if 'lbl_title' in line]
        for line in lbl_lines:
            assert 'command=' not in line

    def test_main_block(self, sample_project):
        """Test that main execution block is generated."""
        code = generate_tkinter_code(sample_project)
        
        assert "if __name__ == '__main__':" in code
        assert "app = App()" in code
        assert "app.mainloop()" in code

    def test_empty_pages(self):
        """Test handling of empty pages list."""
        project = {"theme": "", "pages": []}
        code = generate_tkinter_code(project)
        
        # Should still generate valid class
        assert "class App(tk.Tk):" in code
        assert "def setup_ui(self):" in code

    def test_string_input(self, sample_project):
        """Test that function accepts JSON string input."""
        import json
        json_str = json.dumps(sample_project)
        code = generate_tkinter_code(json_str)
        
        # Should parse string and generate code
        assert "class App(ttk.Window):" in code

    def test_window_title_and_geometry(self, sample_project):
        """Test that window has title and geometry set."""
        code = generate_tkinter_code(sample_project)
        
        assert "self.title('Radipy Generated UI')" in code
        assert "self.geometry('800x600')" in code


class TestSpecialWidgets:
    """Test special widget generation."""

    def test_progressbar_widget(self):
        """Test ttk.Progressbar generation."""
        project = {
            "theme": "darkly",
            "pages": [{
                "name": "Page",
                "components": [{
                    "type": "ttk.Progressbar",
                    "id": "progress_1",
                    "props": {"value": 50, "bootstyle": "success"},
                    "layout": {"x": 10, "y": 10, "width": 150, "height": 20}
                }]
            }]
        }
        code = generate_tkinter_code(project)
        
        assert "ttk.Progressbar" in code
        assert "value=50" in code
        assert "bootstyle='success'" in code

    def test_combobox_values(self):
        """Test Combobox with values list."""
        project = {
            "theme": "",
            "pages": [{
                "name": "Page",
                "components": [{
                    "type": "ttk.Combobox",
                    "id": "combo_1",
                    "props": {"values": "Option A, Option B, Option C"},
                    "layout": {"x": 0, "y": 0, "width": 100, "height": 25}
                }]
            }]
        }
        code = generate_tkinter_code(project)
        
        # Values should be converted to tuple
        assert "('Option A', 'Option B', 'Option C')" in code

    def test_treeview_columns(self):
        """Test Treeview with columns."""
        project = {
            "theme": "",
            "pages": [{
                "name": "Page",
                "components": [{
                    "type": "ttk.Treeview",
                    "id": "tree_1",
                    "props": {"columns": "Col1, Col2"},
                    "layout": {"x": 0, "y": 0, "width": 200, "height": 150}
                }]
            }]
        }
        code = generate_tkinter_code(project)
        
        assert "('Col1', 'Col2')" in code


class TestExternalDependencies:
    """Test external dependency imports."""

    def test_mapview_import(self):
        """Test that MapView triggers tkintermapview import."""
        project = {
            "theme": "",
            "pages": [{
                "name": "Page",
                "components": [{
                    "type": "MapView",
                    "id": "map_1",
                    "props": {"address": "Rome, Italy", "zoom": 10},
                    "layout": {"x": 0, "y": 0, "width": 300, "height": 250}
                }]
            }]
        }
        code = generate_tkinter_code(project)
        
        assert "import tkintermapview" in code
        assert "tkintermapview.TkinterMapView" in code
        assert "set_address('Rome, Italy')" in code
        assert "set_zoom(10)" in code

    def test_matplotlib_import(self):
        """Test that MatplotlibChart triggers matplotlib imports."""
        project = {
            "theme": "",
            "pages": [{
                "name": "Page",
                "components": [{
                    "type": "MatplotlibChart",
                    "id": "chart_1",
                    "props": {"chartType": "line", "title": "My Chart"},
                    "layout": {"x": 0, "y": 0, "width": 400, "height": 300}
                }]
            }]
        }
        code = generate_tkinter_code(project)
        
        assert "import matplotlib.pyplot as plt" in code
        assert "from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg" in code
        assert "plt.subplots" in code
