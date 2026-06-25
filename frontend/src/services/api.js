const BASE = 'http://localhost:8000'

export async function clarifyTask(rawDump) {
  const res = await fetch(`${BASE}/tasks/clarify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw_dump: rawDump }),
  })
  if (!res.ok) throw new Error('Failed to get clarifying questions')
  const data = await res.json()
  return data.questions // string[]
}

export async function breakdownTask(rawDump, answers) {
  const res = await fetch(`${BASE}/tasks/ai-breakdown`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw_dump: rawDump, answers }),
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error(detail?.detail || 'Failed to create task breakdown')
  }
  return await res.json() // TaskResponse
}

export async function copilotChat(message, history = []) {
  const res = await fetch(`${BASE}/copilot/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  })
  if (!res.ok) throw new Error('Failed to get chat reply')
  const data = await res.json()
  return data.reply // string
}

export async function getAllTasks() {
  const res = await fetch(`${BASE}/tasks/`)
  if (!res.ok) throw new Error('Failed to fetch tasks')
  return await res.json() // TaskResponse[]
}

export async function toggleMicroStep(stepId, isCompleted) {
  const res = await fetch(`${BASE}/tasks/microsteps/${stepId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_completed: isCompleted }),
  })
  if (!res.ok) throw new Error('Failed to update microstep')
  return await res.json()
}

export async function toggleTaskStatus(taskId, status) {
  const res = await fetch(`${BASE}/tasks/${taskId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error('Failed to update task status')
  return await res.json()
}

export async function deleteTask(taskId) {
  const res = await fetch(`${BASE}/tasks/${taskId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete task')
}