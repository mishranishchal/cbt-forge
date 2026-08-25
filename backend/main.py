from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os

from api.attempts import router as attempts_router
from api.extraction import router as extraction_router
from api.images import router as images_router
from api.questions import router as questions_router
from api.upload import router as upload_router
from db import init_db
from utils.files import EXTRACTED_IMAGE_DIR, UPLOAD_DIR, ensure_data_dirs

load_dotenv()
ensure_data_dirs()
init_db()

app = FastAPI(title="CBT Forge API", version="0.1.0")

origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

app.include_router(upload_router)
app.include_router(extraction_router)
app.include_router(images_router)
app.include_router(questions_router)
app.include_router(attempts_router)
app.mount("/extracted_images", StaticFiles(directory=EXTRACTED_IMAGE_DIR), name="extracted_images")
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/api/health")
async def health() -> JSONResponse:
    return JSONResponse({"status": "ok"})
