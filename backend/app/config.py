import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "groq")  # switch to "gemini" to swap
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

settings = Settings()