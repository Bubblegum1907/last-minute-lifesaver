from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
import datetime

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    deadline = Column(DateTime, nullable=True)
    energy_level = Column(String, default="medium")
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationship to link subtasks
    micro_steps = relationship("MicroStep", back_populates="parent_task", cascade="all, delete-orphan")

class MicroStep(Base):
    __tablename__ = "micro_steps"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    content = Column(String, nullable=False)
    duration_minutes = Column(Integer, default=20)   # Gemini's estimated bite-sized chunks
    is_completed = Column(Boolean, default=False)

    # Link back to the main task
    parent_task = relationship("Task", back_populates="micro_steps")