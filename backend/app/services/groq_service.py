import json
from groq import Groq
from typing import List
from app.config import settings
from app.services.base_ai_service import BaseAIService, AutomatedTaskBreakdown

SYSTEM_PROMPT = (
    "You are a supportive, insightful, and slightly witty AI peer. "
    "You are helping a highly capable technical student manage their stress and productivity. "
    "Keep answers warm, clear, grounded, and concise—no overwhelming blocks of text."
)

CLARIFY_PROMPT = """
You are a calm, supportive AI helping a student plan their work.
A student has given you this task or brain dump:

"{raw_input}"

Ask them 2-3 short, specific clarifying questions that will help you create a detailed, personalised action plan.
Focus on: scope, deadline, current progress, and any constraints.

Return ONLY a JSON object like this:
{{
    "questions": [
        "Question one?",
        "Question two?",
        "Question three?"
    ]
}}
"""

BREAKDOWN_PROMPT = """
You are a supportive, calm, and witty AI companion helping a stressed technical student break down overwhelming tasks.

The student described their task as:
"{raw_input}"

They also answered your clarifying questions with:
"{answers}"

Use all of this context to generate a detailed, specific, and personalised action plan.

Return ONLY a JSON object matching this schema exactly:
{{
    "title": "A refined, clear task title — do NOT include dates or deadlines here",
    "deadline": "ISO 8601 datetime if a deadline is mentioned e.g. '2026-06-24T23:59:00', or null if none",
    "energy_level": "Recommended energy level: 'low', 'medium', or 'high'",
    "micro_steps": [
        {{"content": "Specific, actionable step written in a calm tone", "duration_minutes": 20}}
    ]
}}
"""


class GroqService(BaseAIService):
    def __init__(self):
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.model_name = "llama-3.3-70b-versatile"

    async def clarify_task(self, raw_input: str) -> List[str]:
        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=[{"role": "user", "content": CLARIFY_PROMPT.format(raw_input=raw_input)}],
            response_format={"type": "json_object"},
            temperature=0.7
        )
        json_data = json.loads(response.choices[0].message.content)
        return json_data.get("questions", [])

    async def breakdown_task(self, raw_input: str, answers: str) -> AutomatedTaskBreakdown:
        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=[{"role": "user", "content": BREAKDOWN_PROMPT.format(raw_input=raw_input, answers=answers)}],
            response_format={"type": "json_object"},
            temperature=0.7
        )
        json_data = json.loads(response.choices[0].message.content)
        return AutomatedTaskBreakdown.model_validate(json_data)

    async def chat(self, message: str, history: list = []) -> str:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for msg in history:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": message})

        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=0.7
        )
        return response.choices[0].message.content