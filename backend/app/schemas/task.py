from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime 

# Micro step schemas
class MicroStepBase(BaseModel):
    content: str
    duration_minutes: int = 20

class MicroStepCreate(MicroStepBase):
    pass

class MicroStepResponse(MicroStepBase):
    id: int
    task_id: int
    is_completed: bool

    class Config:
        from_attributes = True

# Main task schemas
class TaskBase(BaseModel):
    title: str
    deadline: Optional[datetime] = None
    energy_level: str = "medium"
class TaskCreate(TaskBase):
    micro_steps: Optional[List[MicroStepCreate]] = []

class TaskResponse(TaskBase):
    id: int
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    micro_steps: List[MicroStepResponse] = []

    class Config:
        from_attributes = True


# Component update schemas
class TaskStatusUpdate(BaseModel):
    status: str

class MicroStepStatusUpdate(BaseModel):
    is_completed: bool