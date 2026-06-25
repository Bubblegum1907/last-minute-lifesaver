import json
from google import genai
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
Return only the JSON object, no extra text.
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
Return only the JSON object, no extra text.
"""


class GeminiService(BaseAIService):
    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model_name = "gemini-1.5-flash"

    async def clarify_task(self, raw_input: str) -> List[str]:
        response = self.client.models.generate_content(
            model=self.model_name,
            contents=CLARIFY_PROMPT.format(raw_input=raw_input),
            config={"temperature": 0.7}
        )
        text = response.text.strip().removeprefix("```json").removesuffix("```").strip()
        json_data = json.loads(text)
        return json_data.get("questions", [])

    async def breakdown_task(self, raw_input: str, answers: str) -> AutomatedTaskBreakdown:
        response = self.client.models.generate_content(
            model=self.model_name,
            contents=BREAKDOWN_PROMPT.format(raw_input=raw_input, answers=answers),
            config={"temperature": 0.7}
        )
        text = response.text.strip().removeprefix("```json").removesuffix("```").strip()
        json_data = json.loads(text)
        return AutomatedTaskBreakdown.model_validate(json_data)

    async def chat(self, message: str, history: list = []) -> str:
        contents = []
        for msg in history:
            role = "user" if msg.role == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg.content}]})
        contents.append({"role": "user", "parts": [{"text": message}]})

        response = self.client.models.generate_content(
            model=self.model_name,
            contents=contents,
            config={"system_instruction": SYSTEM_PROMPT, "temperature": 0.7}
        )
        return response.text