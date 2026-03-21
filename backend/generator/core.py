import json


def generate_tkinter_code(project_json):
    """
    Generate OOP Tkinter Python code from a JSON project definition.
    """
    if isinstance(project_json, str):
        project_json = json.loads(project_json)

    lines = []

    theme = project_json.get("theme")
    if theme:
        lines.append("import tkinter as tk")
        lines.append("import ttkbootstrap as ttk")
        lines.append("from ttkbootstrap.constants import *")
        lines.append("from ttkbootstrap.widgets import DateEntry, Meter")
    else:
        lines.append("import tkinter as tk")
        lines.append("from tkinter import ttk")

    pages = project_json.get("pages", [])

    has_map = any(comp.get("type") == "MapView" for page in pages for comp in page.get("components", []))
    has_chart = any(comp.get("type") == "MatplotlibChart" for page in pages for comp in page.get("components", []))

    if has_map:
        lines.append("")
        lines.append("# Required: pip install tkintermapview")
        lines.append("import tkintermapview")
    if has_chart:
        lines.append("")
        lines.append("# Required: pip install matplotlib")
        lines.append("import matplotlib.pyplot as plt")
        lines.append("from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg")

    lines.append("")

    base_class = "ttk.Window" if theme else "tk.Tk"
    lines.append(f"class App({base_class}):")
    lines.append("    def __init__(self):")

    if theme:
        lines.append(f"        super().__init__(themename='{theme}')")
    else:
        lines.append("        super().__init__()")

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

    w_title_escaped = w_title.replace("'", "\\'")
    w_bg_escaped = w_bg.replace("'", "\\'") if w_bg else w_bg
    lines.append(f"        self.title('{w_title_escaped}')")
    lines.append(f"        self.geometry('{w_width}x{w_height}')")
    if w_minw or w_minh:
        lines.append(f"        self.minsize({w_minw}, {w_minh})")
    lines.append(f"        self.resizable({w_resx}, {w_resy})")
    if w_bg:
        lines.append(f"        self.configure(bg='{w_bg_escaped}')")
    if w_override:
        lines.append("        self.overrideredirect(True)")
    if w_menubar:
        lines.append("        menubar = tk.Menu(self)")
        lines.append("        self.config(menu=menubar)")
    lines.append("        self.setup_ui()")
    lines.append("")
    lines.append("    def setup_ui(self):")

    commands = set()

    if len(pages) > 1:
        lines.append("        # --- Notebook Setup ---")
        lines.append("        self.notebook = ttk.Notebook(self)")
        lines.append("        self.notebook.pack(fill='both', expand=True)")
        lines.append("")

    for i, page in enumerate(pages):
        page_name = page.get("name", f"Page {i+1}")
        lines.append(f"        # --- Page: {page_name} ---")

        parent = "self"
        if len(pages) > 1:
            parent = f"self.frame_page_{i}"
            lines.append(f"        {parent} = ttk.Frame(self.notebook)")
            lines.append(f"        self.notebook.add({parent}, text='{page_name}')")
            lines.append("")

        for comp in page.get("components", []):
            comp_type = comp.get("type")
            comp_id = f"self.{comp.get('id')}"
            props = comp.get("props", {})
            layout = comp.get("layout", {})

            base_props = {k: v for k, v in props.items() if k not in ["tabs", "iconName", "color", "size", "commandEvent", "paneCount"]}

            if "commandEvent" in props and props["commandEvent"].strip():
                cmd_fn = props["commandEvent"].strip()
                commands.add(cmd_fn)
                base_props["command"] = f"self.{cmd_fn}"

            if "values" in base_props and isinstance(base_props["values"], str):
                vals = [x.strip() for x in base_props["values"].split(",")]
                base_props["values"] = tuple(vals)
            if "columns" in base_props and isinstance(base_props["columns"], str):
                vals = [x.strip() for x in base_props["columns"].split(",")]
                base_props["columns"] = tuple(vals)

            kwargs_list = []
            for k, v in base_props.items():
                if k == "command":
                    kwargs_list.append(f"{k}={v}")
                elif isinstance(v, str):
                    kwargs_list.append(f"{k}='{v}'")
                else:
                    kwargs_list.append(f"{k}={v}")
            kwargs_str = ", ".join(kwargs_list)

            x = layout.get("x", 0)
            y = layout.get("y", 0)
            width = layout.get("width")
            height = layout.get("height")

            place_params = f"x={x}, y={y}"
            if width is not None:
                place_params += f", width={width}"
            if height is not None:
                place_params += f", height={height}"

            if comp_type == "ttk.Notebook":
                lines.append(f"        {comp_id} = ttk.Notebook({parent}, {kwargs_str})")
                tabs_list = props.get("tabs", "Tab 1").split(",")
                for t_idx, tab_name in enumerate(tabs_list):
                    frame_id = f"{comp_id}_f{t_idx}"
                    if theme:
                        lines.append(f"        {frame_id} = ttk.Frame({comp_id})")
                    else:
                        lines.append(f"        {frame_id} = tk.Frame({comp_id})")
                    lines.append(f"        {comp_id}.add({frame_id}, text='{tab_name.strip()}')")

            elif comp_type == "Icon":
                icon_name = props.get("iconName", "home")
                lines.append(f"        # TODO: Usa PhotoImage per l'icona Material '{icon_name}' (.png)")
                lines.append(f"        {comp_id} = tk.Label({parent}, text='[{icon_name} icon]')")

            elif comp_type == "MapView":
                address = props.get("address", "Rome, Italy")
                zoom = props.get("zoom", 10)
                lines.append(f"        {comp_id} = tkintermapview.TkinterMapView({parent}, {kwargs_str})")
                lines.append(f"        {comp_id}.set_address('{address}')")
                lines.append(f"        {comp_id}.set_zoom({zoom})")

            elif comp_type == "MatplotlibChart":
                chart_title = props.get("title", "My Chart")
                lines.append(f"        # {comp_id} Matplotlib Setup")
                lines.append(f"        self.fig_{comp.get('id')}, self.ax_{comp.get('id')} = plt.subplots(figsize=(4, 3))")
                lines.append(f"        self.ax_{comp.get('id')}.plot([1, 2, 3], [10, 20, 15], marker='o')  # Example Data")
                lines.append(f"        self.ax_{comp.get('id')}.set_title('{chart_title}')")
                lines.append(f"        self.canvas_{comp.get('id')} = FigureCanvasTkAgg(self.fig_{comp.get('id')}, master={parent})")
                lines.append(f"        {comp_id} = self.canvas_{comp.get('id')}.get_tk_widget()")

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
                    frame_var = f"self._frame_{pane_id.replace('-', '_')}"
                    # Always use ttk.Frame for PanedWindow panes
                    frame_cls = "ttk.Frame"
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
                        if cw is not None: cp += f", width={cw}"
                        if ch is not None: cp += f", height={ch}"
                        lines.append(f"        {child_id}.place({cp})")
                        lines.append("")

                continue  # Skip the generic place() call at end of loop

            else:
                if theme:
                    widget_class = comp_type.split(".")[1] if comp_type.startswith("ttk.") else comp_type
                    lines.append(f"        {comp_id} = ttk.{widget_class}({parent}, {kwargs_str})")
                else:
                    if comp_type.startswith("ttk."):
                        widget_class = comp_type.split(".")[1]
                        lines.append(f"        {comp_id} = ttk.{widget_class}({parent}, {kwargs_str})")
                    else:
                        lines.append(f"        {comp_id} = tk.{comp_type}({parent}, {kwargs_str})")

            lines.append(f"        {comp_id}.place({place_params})")
            lines.append("")

    if commands:
        lines.append("        # --- Event Handlers ---")
        for cmd in commands:
            lines.append(f"    def {cmd}(self):")
            lines.append(f"        print('Event {cmd} triggered!')")
            lines.append("        pass")
            lines.append("")

    lines.append("")
    lines.append("if __name__ == '__main__':")
    lines.append("    app = App()")
    lines.append("    app.mainloop()")
    lines.append("")

    return "\n".join(lines)


def generate_requirements(project_json):
    """Generate a requirements.txt content based on the project dependencies."""
    if isinstance(project_json, str):
        project_json = json.loads(project_json)

    requirements = []

    theme = project_json.get("theme")
    if theme:
        requirements.append("ttkbootstrap>=1.10.0")

    pages = project_json.get("pages", [])

    has_map = any(
        comp.get("type") == "MapView"
        for page in pages
        for comp in page.get("components", [])
    )
    if has_map:
        requirements.append("tkintermapview>=1.6.0")

    has_chart = any(
        comp.get("type") == "MatplotlibChart"
        for page in pages
        for comp in page.get("components", [])
    )
    if has_chart:
        requirements.append("matplotlib>=3.5.0")

    return "\n".join(requirements) if requirements else "# No additional dependencies required\n# Tkinter is included with Python standard library"


def generate_run_instructions(project_json):
    """Generate run instructions for the generated code."""
    if isinstance(project_json, str):
        project_json = json.loads(project_json)

    instructions = []
    instructions.append("=" * 50)
    instructions.append("RUN INSTRUCTIONS")
    instructions.append("=" * 50)
    instructions.append("")

    theme = project_json.get("theme")
    pages = project_json.get("pages", [])

    has_deps = theme or any(
        comp.get("type") in ["MapView", "MatplotlibChart"]
        for page in pages
        for comp in page.get("components", [])
    )

    if has_deps:
        instructions.append("1. Install dependencies:")
        instructions.append("    pip install -r requirements.txt")
        instructions.append("")
        instructions.append("2. Run the application:")
        instructions.append("    python generated_app.py")
    else:
        instructions.append("No dependencies required!")
        instructions.append("")
        instructions.append("Run directly with:")
        instructions.append("    python generated_app.py")

    instructions.append("")
    instructions.append("=" * 50)

    return "\n".join(instructions)
