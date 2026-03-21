"""
Pytest configuration and fixtures for Radipy backend tests.
"""
import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def sample_project():
    """Sample project JSON for testing."""
    return {
        "theme": "darkly",
        "pages": [
            {
                "name": "Main Page",
                "components": [
                    {
                        "type": "Button",
                        "id": "btn_submit",
                        "props": {
                            "text": "Submit",
                            "bootstyle": "primary",
                            "commandEvent": "on_submit"
                        },
                        "layout": {"x": 100, "y": 50, "width": 100, "height": 35}
                    },
                    {
                        "type": "Label",
                        "id": "lbl_title",
                        "props": {"text": "Welcome"},
                        "layout": {"x": 50, "y": 20, "width": 200, "height": 25}
                    }
                ]
            }
        ]
    }


@pytest.fixture
def minimal_project():
    """Minimal project with single component."""
    return {
        "theme": "",
        "pages": [
            {
                "name": "Page 1",
                "components": [
                    {
                        "type": "Label",
                        "id": "label_1",
                        "props": {"text": "Hello"},
                        "layout": {"x": 10, "y": 10, "width": 100, "height": 25}
                    }
                ]
            }
        ]
    }


@pytest.fixture
def multi_page_project():
    """Project with multiple pages/tabs."""
    return {
        "theme": "cosmo",
        "pages": [
            {
                "name": "Home",
                "components": [
                    {
                        "type": "Label",
                        "id": "lbl_home",
                        "props": {"text": "Home Page"},
                        "layout": {"x": 0, "y": 0, "width": 100, "height": 25}
                    }
                ]
            },
            {
                "name": "Settings",
                "components": [
                    {
                        "type": "Entry",
                        "id": "entry_setting",
                        "props": {"text": ""},
                        "layout": {"x": 50, "y": 50, "width": 150, "height": 25}
                    }
                ]
            }
        ]
    }
