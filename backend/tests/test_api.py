"""
Tests for FastAPI endpoints.
"""
import pytest


class TestAPIEndpoints:
    """Test suite for API endpoints."""

    def test_root_endpoint(self, client):
        """Test the root endpoint returns welcome message."""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Welcome" in data["message"]

    def test_generate_endpoint_success(self, client, sample_project):
        """Test successful code generation."""
        response = client.post("/generate", json={"pages": sample_project["pages"]})
        
        assert response.status_code == 200
        data = response.json()
        assert "code" in data
        assert len(data["code"]) > 0
        
        # Check generated code structure
        code = data["code"]
        assert "class App" in code
        assert "def setup_ui" in code

    def test_generate_with_theme(self, client, sample_project):
        """Test code generation includes theme when provided."""
        response = client.post("/generate", json=sample_project)
        
        assert response.status_code == 200
        code = response.json()["code"]
        
        assert "ttkbootstrap" in code
        assert "themename='darkly'" in code

    def test_generate_empty_pages(self, client):
        """Test handling of empty pages list - should return 400 due to validation."""
        response = client.post("/generate", json={"pages": []})
        
        # Now returns 400 due to validation (project must have at least 1 page)
        assert response.status_code == 400

    def test_generate_minimal_project(self, client, minimal_project):
        """Test generation with minimal project."""
        response = client.post("/generate", json=minimal_project)
        
        assert response.status_code == 200
        code = response.json()["code"]
        
        # Should use classic Tkinter (no theme)
        assert "import tkinter as tk" in code
        assert "ttkbootstrap" not in code

    def test_generate_multi_page(self, client, multi_page_project):
        """Test generation with multiple pages."""
        response = client.post("/generate", json=multi_page_project)
        
        assert response.status_code == 200
        code = response.json()["code"]
        
        # Should generate Notebook for tabs
        assert "Notebook" in code
        assert "frame_page_" in code

    def test_generate_missing_pages_key(self, client):
        """Test error handling when pages key is missing."""
        response = client.post("/generate", json={})
        
        # FastAPI should return 422 for validation error
        assert response.status_code == 422

    def test_generate_invalid_json(self, client):
        """Test error handling for invalid JSON structure."""
        response = client.post(
            "/generate",
            json={"pages": "not an array"}
        )
        
        assert response.status_code == 422

    def test_generate_with_various_widgets(self, client):
        """Test generation with different widget types."""
        project = {
            "pages": [{
                "name": "Test",
                "components": [
                    {
                        "type": "Button",
                        "id": "btn1",
                        "props": {"text": "Click"},
                        "layout": {"x": 10, "y": 10, "width": 80, "height": 30}
                    },
                    {
                        "type": "Label",
                        "id": "lbl1",
                        "props": {"text": "Label"},
                        "layout": {"x": 100, "y": 10, "width": 60, "height": 20}
                    },
                    {
                        "type": "Entry",
                        "id": "entry1",
                        "props": {"text": ""},
                        "layout": {"x": 10, "y": 50, "width": 150, "height": 25}
                    }
                ]
            }]
        }
        
        response = client.post("/generate", json=project)
        assert response.status_code == 200
        code = response.json()["code"]
        
        assert "tk.Button" in code
        assert "tk.Label" in code
        assert "tk.Entry" in code


class TestHTTPMethods:
    """Test HTTP method handling."""

    def test_generate_get_not_allowed(self, client):
        """Test that GET method is not allowed on /generate."""
        response = client.get("/generate")
        assert response.status_code == 405

    def test_generate_put_not_allowed(self, client):
        """Test that PUT method is not allowed on /generate."""
        response = client.put("/generate", json={"pages": []})
        assert response.status_code == 405

    def test_root_post_not_allowed(self, client):
        """Test that POST is not allowed on root."""
        response = client.post("/", json={})
        assert response.status_code == 405


class TestResponseFormat:
    """Test response format and headers."""

    def test_response_is_json(self, client, sample_project):
        """Test that response is valid JSON."""
        response = client.post("/generate", json={"pages": sample_project["pages"]})
        
        assert response.headers["content-type"] == "application/json"
        
        # Should not raise exception
        data = response.json()
        assert isinstance(data, dict)

    def test_generated_code_is_string(self, client, sample_project):
        """Test that generated code is a string."""
        response = client.post("/generate", json={"pages": sample_project["pages"]})
        data = response.json()
        
        assert isinstance(data["code"], str)

    def test_code_contains_expected_sections(self, client, sample_project):
        """Test that generated code has expected sections."""
        response = client.post("/generate", json=sample_project)
        code = response.json()["code"]
        
        # Check for essential code sections
        assert "import" in code
        assert "class App" in code
        assert "def __init__" in code
        assert "def setup_ui" in code
        assert "app.mainloop()" in code


class TestRequirementsEndpoint:
    """Test suite for /generate/requirements endpoint."""

    def test_requirements_with_theme(self, client, sample_project):
        """Test requirements generation with theme."""
        response = client.post("/generate/requirements", json=sample_project)

        assert response.status_code == 200
        data = response.json()
        assert "requirements" in data
        assert "ttkbootstrap" in data["requirements"]

    def test_requirements_without_theme(self, client, minimal_project):
        """Test requirements without theme."""
        response = client.post("/generate/requirements", json=minimal_project)

        assert response.status_code == 200
        data = response.json()
        assert "requirements" in data
        assert "No additional dependencies" in data["requirements"]

    def test_requirements_with_map(self, client):
        """Test requirements with MapView."""
        project = {
            "theme": "",
            "pages": [{
                "name": "Map",
                "components": [{
                    "type": "MapView",
                    "id": "map1",
                    "props": {"address": "Rome"},
                    "layout": {"x": 0, "y": 0, "width": 300, "height": 200}
                }]
            }]
        }
        response = client.post("/generate/requirements", json=project)

        assert response.status_code == 200
        data = response.json()
        assert "tkintermapview" in data["requirements"]

    def test_requirements_with_chart(self, client):
        """Test requirements with MatplotlibChart."""
        project = {
            "theme": "",
            "pages": [{
                "name": "Chart",
                "components": [{
                    "type": "MatplotlibChart",
                    "id": "chart1",
                    "props": {"title": "Test"},
                    "layout": {"x": 0, "y": 0, "width": 400, "height": 300}
                }]
            }]
        }
        response = client.post("/generate/requirements", json=project)

        assert response.status_code == 200
        data = response.json()
        assert "matplotlib" in data["requirements"]


class TestInstructionsEndpoint:
    """Test suite for /generate/instructions endpoint."""

    def test_instructions_success(self, client, sample_project):
        """Test instructions generation."""
        response = client.post("/generate/instructions", json=sample_project)

        assert response.status_code == 200
        data = response.json()
        assert "instructions" in data
        assert "RUN INSTRUCTIONS" in data["instructions"]

    def test_instructions_no_deps(self, client, minimal_project):
        """Test instructions for project without dependencies."""
        response = client.post("/generate/instructions", json=minimal_project)

        assert response.status_code == 200
        data = response.json()
        assert "instructions" in data
        assert "No dependencies required" in data["instructions"]


class TestGenerateAllEndpoint:
    """Test suite for /generate/all endpoint."""

    def test_generate_all_success(self, client, sample_project):
        """Test that /generate/all returns all artifacts."""
        response = client.post("/generate/all", json=sample_project)

        assert response.status_code == 200
        data = response.json()
        assert "code" in data
        assert "requirements" in data
        assert "instructions" in data

        assert len(data["code"]) > 0
        assert "ttkbootstrap" in data["requirements"]
        assert "RUN INSTRUCTIONS" in data["instructions"]

    def test_generate_all_minimal(self, client, minimal_project):
        """Test generate all with minimal project."""
        response = client.post("/generate/all", json=minimal_project)

        assert response.status_code == 200
        data = response.json()
        assert "code" in data
        assert "requirements" in data
        assert "instructions" in data

        assert "import tkinter as tk" in data["code"]
