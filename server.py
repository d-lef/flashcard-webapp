"""Flashcard Web App — static file server using FastAPI + Uvicorn."""

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

import uvicorn

APP_DIR = Path(__file__).parent
PORT = 8081

app = FastAPI(title="Flashcard App")

# Serve index.html at root
@app.get("/")
async def index():
    return FileResponse(APP_DIR / "index.html")

# Serve all other static files
app.mount("/", StaticFiles(directory=APP_DIR), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)
