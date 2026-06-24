from app.config import settings
from app.services.base_ai_service import BaseAIService


def get_ai_service() -> BaseAIService:
    provider = settings.AI_PROVIDER.lower()

    if provider == "groq":
        from app.services.groq_service import GroqService
        return GroqService()
    elif provider == "gemini":
        from app.services.gemini_service import GeminiService
        return GeminiService()
    else:
        raise ValueError(f"Unknown AI_PROVIDER: '{provider}'. Must be 'groq' or 'gemini'.")


# Single shared instance used across routes
ai_service: BaseAIService = get_ai_service()