import sys
import os

# Add the backend directory to sys.path so that 'app' module imports resolve correctly
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

# Import the FastAPI application instance
from app.main import app
