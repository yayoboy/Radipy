from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError
from typing import Dict, Any, List, Optional
import json
import os
import logging

from generator.core import generate_tkinter_code, generate_requirements, generate_run_instructions
from validator.schemas import ProjectSchema, validate_project

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Radipy Backend API")

# CORS Configuration from environment
ALLOWED_ORIGINS = os.getenv("CORS_ORIGINS", "*")
if ALLOWED_ORIGINS != "*":
    ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS.split(",")]

# Setup CORS to allow the React frontend to communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateRequest(BaseModel):
    theme: Optional[str] = ""
    pages: List[Dict[str, Any]]

@app.get("/")
def read_root():
    logger.info("Root endpoint called")
    return {"message": "Welcome to Radipy API! Use POST /generate to create Tkinter code."}

@app.post("/generate")
def generate_code(request: GenerateRequest):
    """
    Takes the JSON schema of the UI and returns the generated Python Tkinter code.
    Validates input against schema before generation.
    """
    try:
        project_data = request.model_dump()
        is_valid, error_msg, validated = validate_project(project_data)

        if not is_valid:
            logger.warning(f"Validation failed: {error_msg}")
            raise HTTPException(status_code=400, detail=f"Validation error: {error_msg}")

        logger.info(f"Generating code for {len(request.pages)} page(s)")

        code = generate_tkinter_code(project_data)
        logger.info("Code generation successful")
        return {"code": code}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Code generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@app.post("/generate/requirements")
def get_requirements(request: GenerateRequest):
    """Returns the requirements.txt content for the project dependencies."""
    try:
        project_data = request.model_dump()
        is_valid, error_msg, validated = validate_project(project_data)

        if not is_valid:
            logger.warning(f"Validation failed: {error_msg}")
            raise HTTPException(status_code=400, detail=f"Validation error: {error_msg}")

        requirements = generate_requirements(project_data)
        logger.info("Requirements generation successful")
        return {"requirements": requirements}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Requirements generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@app.post("/generate/instructions")
def get_instructions(request: GenerateRequest):
    """Returns run instructions for the generated code."""
    try:
        project_data = request.model_dump()
        is_valid, error_msg, validated = validate_project(project_data)

        if not is_valid:
            logger.warning(f"Validation failed: {error_msg}")
            raise HTTPException(status_code=400, detail=f"Validation error: {error_msg}")

        instructions = generate_run_instructions(project_data)
        logger.info("Instructions generation successful")
        return {"instructions": instructions}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Instructions generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@app.post("/generate/all")
def generate_all(request: GenerateRequest):
    """Returns code, requirements, and instructions in a single response."""
    try:
        project_data = request.model_dump()
        is_valid, error_msg, validated = validate_project(project_data)

        if not is_valid:
            logger.warning(f"Validation failed: {error_msg}")
            raise HTTPException(status_code=400, detail=f"Validation error: {error_msg}")

        logger.info(f"Generating all artifacts for {len(request.pages)} page(s)")

        code = generate_tkinter_code(project_data)
        requirements = generate_requirements(project_data)
        instructions = generate_run_instructions(project_data)

        logger.info("All artifacts generated successfully")
        return {
            "code": code,
            "requirements": requirements,
            "instructions": instructions
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
