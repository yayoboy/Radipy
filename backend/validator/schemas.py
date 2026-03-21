"""
Validation schemas for Radipy API input validation.
Uses Pydantic for request validation and JSON Schema for component validation.
"""
from pydantic import BaseModel, Field, field_validator
from typing import Dict, Any, List, Optional, Literal
import json


# Valid widget types
WIDGET_TYPES = Literal[
    "Button", "Label", "Entry", "Text", "Frame", "Checkbutton",
    "Radiobutton", "Listbox", "Scrollbar", "Scale", "Spinbox",
    "Message", "Canvas", "Menu", "PanedWindow",
    "ttk.Progressbar", "ttk.Combobox", "ttk.Notebook", "ttk.Treeview",
    "ttk.Separator", "ttk.Scale", "ttk.Spinbox", "ttk.Labelframe",
    "ttk.DateEntry", "ttk.Meter",
    "MapView", "MatplotlibChart", "Icon"
]

# Valid ttkbootstrap themes
THEMES = Literal[
    "cosmo", "flatly", "journal", "lumen", "paper", "sandstone",
    "darkly", "cyborg", "superhero", ""
]


class LayoutSchema(BaseModel):
    """Layout/positioning schema for components."""
    x: int = Field(ge=0, default=0, description="X position")
    y: int = Field(ge=0, default=0, description="Y position")
    width: Optional[int] = Field(ge=20, default=None, description="Component width")
    height: Optional[int] = Field(ge=20, default=None, description="Component height")


class ComponentSchema(BaseModel):
    """Schema for a single UI component."""
    type: str = Field(description="Widget type")
    id: str = Field(min_length=1, description="Unique component identifier")
    props: Dict[str, Any] = Field(default_factory=dict, description="Component properties")
    layout: LayoutSchema = Field(description="Component positioning")

    @field_validator('type')
    @classmethod
    def validate_type(cls, v: str) -> str:
        """Validate widget type is supported."""
        valid_types = [
            "Button", "Label", "Entry", "Text", "Frame", "Checkbutton",
            "Radiobutton", "Listbox", "Scrollbar", "Scale", "Spinbox",
            "Message", "Canvas", "Menu", "PanedWindow",
            "ttk.Progressbar", "ttk.Combobox", "ttk.Notebook", "ttk.Treeview",
            "ttk.Separator", "ttk.Scale", "ttk.Spinbox", "ttk.Labelframe",
            "ttk.DateEntry", "ttk.Meter",
            "MapView", "MatplotlibChart", "Icon"
        ]
        if v not in valid_types:
            raise ValueError(f"Invalid widget type: {v}. Valid types: {', '.join(valid_types)}")
        return v

    @field_validator('id')
    @classmethod
    def validate_id(cls, v: str) -> str:
        """Validate ID is a valid Python identifier."""
        if not v[0].isalpha() and v[0] != '_':
            raise ValueError(f"ID must start with letter or underscore: {v}")
        if not all(c.isalnum() or c == '_' for c in v):
            raise ValueError(f"ID must contain only alphanumeric characters or underscore: {v}")
        return v


class PageSchema(BaseModel):
    """Schema for a page/tab in the project."""
    name: str = Field(min_length=1, max_length=50, description="Page name")
    components: List[ComponentSchema] = Field(default_factory=list, description="Page components")

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Sanitize page name."""
        return v.strip()


class ProjectSchema(BaseModel):
    """Schema for the entire project."""
    theme: Optional[str] = Field(default="", description="ttkbootstrap theme name")
    pages: List[PageSchema] = Field(min_length=1, description="Project pages")

    @field_validator('theme')
    @classmethod
    def validate_theme(cls, v: Optional[str]) -> str:
        """Validate theme name if provided."""
        if v is None:
            return ""
        valid_themes = [
            "cosmo", "flatly", "journal", "lumen", "paper", "sandstone",
            "darkly", "cyborg", "superhero", ""
        ]
        if v and v not in valid_themes:
            raise ValueError(f"Invalid theme: {v}. Valid themes: {', '.join(valid_themes)}")
        return v

    @field_validator('pages')
    @classmethod
    def validate_pages(cls, v: List[PageSchema]) -> List[PageSchema]:
        """Ensure at least one page exists."""
        if not v:
            raise ValueError("Project must have at least one page")
        return v


def validate_project(data: Dict[str, Any]) -> tuple[bool, Optional[str], Optional[ProjectSchema]]:
    """
    Validate a project JSON.
    
    Args:
        data: Project dictionary to validate
        
    Returns:
        Tuple of (is_valid, error_message, validated_schema)
    """
    try:
        validated = ProjectSchema(**data)
        return True, None, validated
    except Exception as e:
        return False, str(e), None


def validate_json_schema(json_str: str) -> tuple[bool, Optional[str], Optional[Dict]]:
    """
    Validate JSON string format.
    
    Args:
        json_str: JSON string to validate
        
    Returns:
        Tuple of (is_valid, error_message, parsed_data)
    """
    try:
        data = json.loads(json_str)
        return True, None, data
    except json.JSONDecodeError as e:
        return False, f"Invalid JSON: {str(e)}", None
