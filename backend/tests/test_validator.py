"""
Tests for validation schemas.
"""
import pytest
from validator.schemas import (
    LayoutSchema, ComponentSchema, PageSchema, ProjectSchema,
    validate_project, validate_json_schema
)


class TestLayoutSchema:
    """Test layout validation."""

    def test_valid_layout(self):
        """Test valid layout data."""
        layout = LayoutSchema(x=100, y=50, width=200, height=100)
        assert layout.x == 100
        assert layout.y == 50
        assert layout.width == 200
        assert layout.height == 100

    def test_layout_defaults(self):
        """Test layout with default values."""
        layout = LayoutSchema(x=0, y=0)
        assert layout.width is None
        assert layout.height is None

    def test_layout_negative_position(self):
        """Test that negative positions are rejected."""
        with pytest.raises(Exception):
            LayoutSchema(x=-10, y=0)

    def test_layout_small_dimensions(self):
        """Test minimum dimension validation."""
        with pytest.raises(Exception):
            LayoutSchema(x=0, y=0, width=10)


class TestComponentSchema:
    """Test component validation."""

    def test_valid_button(self):
        """Test valid Button component."""
        comp = ComponentSchema(
            type="Button",
            id="btn_submit",
            props={"text": "Click Me"},
            layout={"x": 100, "y": 50, "width": 100, "height": 35}
        )
        assert comp.type == "Button"
        assert comp.id == "btn_submit"

    def test_valid_ttk_widget(self):
        """Test valid ttk widget."""
        comp = ComponentSchema(
            type="ttk.Progressbar",
            id="progress_1",
            props={"value": 50},
            layout={"x": 0, "y": 0, "width": 150, "height": 20}
        )
        assert comp.type == "ttk.Progressbar"

    def test_invalid_widget_type(self):
        """Test rejection of invalid widget type."""
        with pytest.raises(Exception):
            ComponentSchema(
                type="InvalidWidget",
                id="test",
                props={},
                layout={"x": 0, "y": 0}
            )

    def test_invalid_id_starting_with_number(self):
        """Test that IDs starting with numbers are rejected."""
        with pytest.raises(Exception):
            ComponentSchema(
                type="Label",
                id="123_invalid",
                props={},
                layout={"x": 0, "y": 0}
            )

    def test_valid_id_with_underscore(self):
        """Test IDs with underscores are valid."""
        comp = ComponentSchema(
            type="Label",
            id="_private_label",
            props={"text": "Test"},
            layout={"x": 0, "y": 0}
        )
        assert comp.id == "_private_label"


class TestPageSchema:
    """Test page validation."""

    def test_valid_page(self):
        """Test valid page data."""
        page = PageSchema(
            name="Main Page",
            components=[
                ComponentSchema(
                    type="Label",
                    id="lbl_1",
                    props={"text": "Hello"},
                    layout={"x": 0, "y": 0}
                )
            ]
        )
        assert page.name == "Main Page"
        assert len(page.components) == 1

    def test_empty_page(self):
        """Test page with no components."""
        page = PageSchema(name="Empty", components=[])
        assert len(page.components) == 0

    def test_page_name_sanitization(self):
        """Test that page names are stripped."""
        page = PageSchema(name="  Test Page  ", components=[])
        assert page.name == "Test Page"


class TestProjectSchema:
    """Test project validation."""

    def test_valid_project(self):
        """Test valid project."""
        project = ProjectSchema(
            theme="darkly",
            pages=[
                PageSchema(
                    name="Page 1",
                    components=[
                        ComponentSchema(
                            type="Button",
                            id="btn_1",
                            props={"text": "Click"},
                            layout={"x": 0, "y": 0}
                        )
                    ]
                )
            ]
        )
        assert project.theme == "darkly"
        assert len(project.pages) == 1

    def test_project_without_theme(self):
        """Test project with empty theme."""
        project = ProjectSchema(
            theme="",
            pages=[PageSchema(name="Main", components=[])]
        )
        assert project.theme == ""

    def test_invalid_theme(self):
        """Test rejection of invalid theme."""
        with pytest.raises(Exception):
            ProjectSchema(
                theme="invalid_theme",
                pages=[PageSchema(name="Main", components=[])]
            )

    def test_project_with_no_pages(self):
        """Test rejection of project with no pages."""
        with pytest.raises(Exception):
            ProjectSchema(theme="", pages=[])


class TestValidateProject:
    """Test validate_project function."""

    def test_valid_project_dict(self):
        """Test validation of valid project dictionary."""
        data = {
            "theme": "cosmo",
            "pages": [
                {
                    "name": "Main",
                    "components": [
                        {
                            "type": "Label",
                            "id": "lbl_1",
                            "props": {"text": "Hello"},
                            "layout": {"x": 0, "y": 0}
                        }
                    ]
                }
            ]
        }
        is_valid, error, validated = validate_project(data)
        assert is_valid is True
        assert error is None
        assert validated is not None

    def test_invalid_project_dict(self):
        """Test validation of invalid project."""
        data = {
            "theme": "invalid",
            "pages": []
        }
        is_valid, error, validated = validate_project(data)
        assert is_valid is False
        assert error is not None
        assert validated is None


class TestValidateJsonSchema:
    """Test JSON string validation."""

    def test_valid_json_string(self):
        """Test validation of valid JSON string."""
        json_str = '{"theme": "darkly", "pages": [{"name": "Test", "components": []}]}'
        is_valid, error, data = validate_json_schema(json_str)
        assert is_valid is True
        assert data is not None
        assert data["theme"] == "darkly"

    def test_invalid_json_string(self):
        """Test validation of invalid JSON string."""
        json_str = '{invalid json}'
        is_valid, error, data = validate_json_schema(json_str)
        assert is_valid is False
        assert error is not None
        assert data is None
