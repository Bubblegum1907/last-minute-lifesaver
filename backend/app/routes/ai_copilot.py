from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.ai_factory import ai_service

router = APIRouter(
    prefix="/copilot",
    tags=["AI Copilot Chat"]
)


class ChatRequest(BaseModel):
    message: str


@router.post("/chat")
async def chat(payload: ChatRequest):
    try:
        reply = await ai_service.chat(payload.message)
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))