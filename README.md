# Fernly 🌿

A cottagecore-inspired, AI-assisted productivity app built for students who are overwhelmed, behind on deadlines, or just need a calmer way to get things done. Fernly turns vague brain dumps into clear, actionable plans, and pairs that with a cozy set of focus tools so working doesn't have to feel so stressful.

---

## What it does

Most to-do apps assume you already know how to break your work down into steps. Fernly doesn't assume that. Instead, it gives you an AI copilot you can just talk to. Tell it what's stressing you out, and it will figure out whether you're venting or whether there's an actual task hiding in there. If there's a task, it offers to turn it into a plan, asks a couple of quick clarifying questions if needed, then generates a structured task with bite-sized "micro-steps," each with a time estimate and a recommended energy level.

Once a task exists, you can track it in a clean task feed, and a third "Focus" column gives you tools to help you actually sit down and do the work: a Pomodoro timer, a sketchpad for quick doodle breaks, and a small Snake game for when you need sixty seconds to reset.

## Key features

- **AI Copilot Chat** – A three-mode conversation flow (chat, offer to create a task, clarify if complex, AI breakdown) that knows the difference between you venting and you actually needing a plan.
- **AI Task Breakdown** – Generates a title, deadline, energy level, and a list of specific, time-boxed micro-steps from a raw description plus a few clarifying answers.
- **Manual Task Creation** – A modal for building tasks by hand when you don't need the AI's help.
- **Task Feed** – Sortable list with energy badges, friendly relative deadlines ("due in 3h"), and a micro-step modal for tracking progress.
- **7-Day Activity Graph** – A small bar chart showing how many tasks you've completed each day over the past week.
- **Pomodoro Timer** – Focus and break sessions with an animated progress ring and session counter.
- **Sketchpad** – A built-in canvas with brush size, color, and eraser controls.
- **Snake Game** – A lightweight, mouse-controlled game for short breaks.
- **Daily Mood Panel** – A rotating set of gentle, encouraging quotes.
- **Cat Mascot Notifications** – A friendly cat that surfaces real, useful nudges: a deadline within 24 hours, all tasks done for the day, a 45-minute work session, or a finished Pomodoro round.
- **Swappable AI Provider** – The backend can run on Groq or Gemini, controlled by a single environment variable, with no other code changes required.

## Tech stack

**Backend:** FastAPI, SQLAlchemy, SQLite, Pydantic
**Frontend:** React, Vite, Tailwind CSS, Quicksand font
**AI layer:** Groq API and Google Gemini API, abstracted behind a shared `BaseAIService` interface and selected via an `ai_factory.py` provider factory

## Project structure

```
backend/
  app/
    config.py            # Settings, including AI_PROVIDER switch
    database.py           # SQLAlchemy engine and session setup
    main.py               # FastAPI app entrypoint
    models/                # Task and MicroStep ORM models
    routes/                # /tasks and /copilot endpoints
    schemas/                # Pydantic request/response schemas
    services/
      base_ai_service.py    # Shared AI interface
      groq_service.py        # Groq implementation
      gemini_service.py      # Gemini implementation
      ai_factory.py            # Picks a provider at startup

frontend/
  src/
    components/
      CopilotColumn.jsx     # AI chat, mood panel, activity graph
      TaskFeedColumn.jsx     # Task list, modals, Snake game
      FocusColumn.jsx          # Pomodoro, sketchpad, cat notifications
    services/api.js            # Frontend API client
```

## Getting started

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # on Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in `backend/` with:

```
AI_PROVIDER=groq          # or "gemini"
GROQ_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
```

Then run the server:

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

## Notes and known limitations

- Authentication (Google login) is intentionally not included yet. It was deprioritized for the hackathon deadline and is planned as a future addition.
- The app uses SQLite without migrations, so any change to the database schema currently requires deleting `lifesaver.db` and letting it regenerate.

## Why this exists

Deadlines are stressful, and the planning step is often the hardest part of getting started. Fernly tries to remove that friction by letting students talk through what's on their plate in plain language, while keeping the rest of the experience calm, warm, and a little bit fun.