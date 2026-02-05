"""
Face Recognition API Server
Entry point สำหรับ FastAPI application
"""

from fastapi import FastAPI
from routers.face import router as face_router
from core.database import init_db

app = FastAPI(
    title="Face Recognition API",
    description="API สำหรับระบบจดจำใบหน้า",
    version="1.0.0"
)

# Initialize database tables
@app.on_event("startup")
async def startup_event():
    try:
        init_db()
        print("Database initialized successfully")
    except Exception as e:
        print(f"Database initialization error: {e}")

# Include routers
app.include_router(face_router)


@app.get("/")
async def root():
    return {
        "message": "Face Recognition API",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}