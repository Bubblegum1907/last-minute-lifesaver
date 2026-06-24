from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.models.task import Task, MicroStep  
from app.routes import tasks, ai_copilot

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Last-Minute Lifesaver API",
    description="Backend service for the cozy, agentic productivity dashboard",
    version="1.0.0"
)

origins = ["http://localhost:5173", "http://127.0.0.1:5173",]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks.router)
app.include_router(ai_copilot.router)

@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "Welcome to the Last-Minute Lifesaver API! Everything is running smoothly."
    }