from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime
from app.database import get_db
from app.models.task import Task, MicroStep
from app.schemas.task import TaskResponse, TaskStatusUpdate, MicroStepCreate, MicroStepResponse, MicroStepStatusUpdate
from app.services.ai_factory import ai_service

router = APIRouter(
    prefix="/tasks",
    tags=["Tasks & AI Orchestration"]
)


class RawDumpRequest(BaseModel):
    raw_dump: str


class BreakdownRequest(BaseModel):
    raw_dump: str
    answers: str


@router.post("/clarify")
async def clarify_task(payload: RawDumpRequest):
    """Step 1: AI returns clarifying questions about the task."""
    try:
        questions = await ai_service.clarify_task(payload.raw_dump)
        return {"questions": questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI processing error: {str(e)}")


@router.post("/ai-breakdown", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_ai_task(payload: BreakdownRequest, db: Session = Depends(get_db)):
    """Step 2: AI generates a detailed breakdown using the dump + answers."""
    try:
        ai_data = await ai_service.breakdown_task(payload.raw_dump, payload.answers)

        new_task = Task(
            title=ai_data.title,
            deadline=datetime.fromisoformat(ai_data.deadline) if ai_data.deadline else None,
            energy_level=ai_data.energy_level,
            status="pending"
        )
        db.add(new_task)
        db.flush()

        for step in ai_data.micro_steps:
            micro_step = MicroStep(
                task_id=new_task.id,
                content=step.content,
                duration_minutes=step.duration_minutes
            )
            db.add(micro_step)

        db.commit()
        db.refresh(new_task)
        return new_task
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"AI processing error: {str(e)}")


@router.get("/", response_model=List[TaskResponse])
def get_all_tasks(db: Session = Depends(get_db)):
    return db.query(Task).order_by(Task.created_at.desc()).all()


@router.post("/{task_id}/microsteps", response_model=MicroStepResponse, status_code=status.HTTP_201_CREATED)
def add_microstep(task_id: int, payload: MicroStepCreate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    step = MicroStep(
        task_id=task_id,
        content=payload.content,
        duration_minutes=payload.duration_minutes
    )
    db.add(step)
    db.commit()
    db.refresh(step)
    return step


@router.patch("/{task_id}/status", response_model=TaskResponse)
def update_task_status(task_id: int, payload: TaskStatusUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.status = payload.status
    db.commit()
    db.refresh(task)
    return task


@router.patch("/microsteps/{step_id}/status")
def update_microstep_status(step_id: int, payload: MicroStepStatusUpdate, db: Session = Depends(get_db)):
    step = db.query(MicroStep).filter(MicroStep.id == step_id).first()
    if not step:
        raise HTTPException(status_code=404, detail="Micro-step not found")
    step.is_completed = payload.is_completed
    db.commit()
    return {"message": "Micro-step updated successfully", "is_completed": step.is_completed}


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return None