from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import List, Optional


class GeneratedMicroStep(BaseModel):
    content: str
    duration_minutes: int


class AutomatedTaskBreakdown(BaseModel):
    title: str
    energy_level: str
    deadline: Optional[str] = None
    micro_steps: List[GeneratedMicroStep]


class BaseAIService(ABC):

    @abstractmethod
    async def clarify_task(self, raw_input: str) -> List[str]:
        """Return 2-3 clarifying questions about the task."""
        pass

    @abstractmethod
    async def breakdown_task(self, raw_input: str, answers: str) -> AutomatedTaskBreakdown:
        """Generate a detailed breakdown using the dump + user's answers."""
        pass

    @abstractmethod
    async def chat(self, message: str) -> str:
        """Return a conversational reply to the user's message."""
        pass