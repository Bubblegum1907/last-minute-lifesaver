from abc import ABC, abstractmethod
from pydantic import BaseModel, field_validator
from typing import List, Optional
from math import ceil


class GeneratedMicroStep(BaseModel):
    content: str
    duration_minutes: int

    @field_validator('duration_minutes', mode='before')
    @classmethod
    def round_duration(cls, v):
        return max(1, ceil(float(v)))


class AutomatedTaskBreakdown(BaseModel):
    title: str
    energy_level: str
    deadline: Optional[str] = None
    micro_steps: List[GeneratedMicroStep]


class BaseAIService(ABC):

    @abstractmethod
    async def clarify_task(self, raw_input: str) -> List[str]:
        pass

    @abstractmethod
    async def breakdown_task(self, raw_input: str, answers: str) -> AutomatedTaskBreakdown:
        pass

    @abstractmethod
    async def chat(self, message: str, history: list = []) -> str:
        pass