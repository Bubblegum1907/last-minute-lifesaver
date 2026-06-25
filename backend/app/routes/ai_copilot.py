from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.services.ai_factory import ai_service

router = APIRouter(prefix="/copilot", tags=["AI Copilot Chat"])

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []

@router.post("/chat")
async def chat(payload: ChatRequest):
    try:
        reply = await ai_service.chat(payload.message, payload.history)
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))