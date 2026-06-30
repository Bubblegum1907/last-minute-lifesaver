import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.database import engine, Base
from app.models.task import Task, MicroStep  
from app.routes import tasks, ai_copilot

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Last-Minute Lifesaver API",
    description="Backend service for the cozy, agentic productivity dashboard",
    version="1.0.0"
)

# CORS configuration
# Add your deployed production frontend URL to this list once it's live!
origins = [
    "http://localhost:5173", 
    "http://127.0.0.1:5173",
    # "https://your-frontend-domain.web.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(tasks.router)
app.include_router(ai_copilot.router)

@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "Welcome to the Last-Minute Lifesaver API! Everything is running smoothly."
    }

# This block is critical for Google Cloud Run deployment
if __name__ == "__main__":
    # Cloud Run passes the port dynamically via the PORT environment variable
    port = int(os.environ.get("PORT", 8000))
    # Must bind to 0.0.0.0 in a container environment
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)