import { useState } from 'react'
import { toggleMicroStep, toggleTaskStatus, deleteTask } from '../services/api'
import SnakeGame from './SnakeGame'

const BASE = 'http://localhost:8000'

const ENERGY_BADGE = {
  high:   { label: 'High',   classes: 'bg-[#f5d0d0] text-[#a05050]' },
  medium: { label: 'Medium', classes: 'bg-[#f5ecd0] text-[#8a7040]' },
  low:    { label: 'Low',    classes: 'bg-[#d0e8d0] text-[#4a7a4a]' },
}

export default function TaskFeedColumn({ tasks, loading, onTasksChange }) {
  const [openTask, setOpenTask] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  async function handleToggleTask(task) {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    try {
      await toggleTaskStatus(task.id, newStatus)
      onTasksChange()
    } catch (err) {
      console.error('Failed to update task:', err)
    }
  }

  async function handleToggleStep(taskId, stepId, currentValue) {
    try {
      await toggleMicroStep(stepId, !currentValue)
      onTasksChange()
      setOpenTask(prev => prev?.id !== taskId ? prev : {
        ...prev,
        micro_steps: prev.micro_steps.map(s =>
          s.id !== stepId ? s : { ...s, is_completed: !currentValue }
        )
      })
    } catch (err) {
      console.error('Failed to update microstep:', err)
    }
  }

  async function handleDelete(taskId) {
    try {
      await deleteTask(taskId)
      if (openTask?.id === taskId) setOpenTask(null)
      onTasksChange()
    } catch (err) {
      console.error('Failed to delete task:', err)
    }
  }

  async function handleCreateTask(formData) {
    try {
      // 1. Create the task
      const res = await fetch(`${BASE}/tasks/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          energy_level: formData.energy_level,
          deadline: formData.deadline || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to create task')
      const newTask = await res.json()

      // 2. Add microsteps if any
      for (const step of formData.micro_steps) {
        if (!step.content.trim()) continue
        await fetch(`${BASE}/tasks/${newTask.id}/microsteps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: step.content,
            duration_minutes: Number(step.duration_minutes) || 20,
          }),
        })
      }

      setShowCreateModal(false)
      onTasksChange()
    } catch (err) {
      console.error('Failed to create task:', err)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2 h-full min-h-0">

        {/* Task list — 66.66% */}
        <div className="flex-[2] min-h-0 rounded-[14px] border border-[#e8ddd0] bg-[#fdfaf5] flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#e8ddd0] flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#b8a9c9]" />
            <p className="text-[10px] uppercase tracking-widest text-[#a8997e]">Tasks</p>
            <span className="ml-auto text-[10px] text-[#c4b49a] mr-2">
              {tasks.filter(t => t.status === 'completed').length}/{tasks.length} done
            </span>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-[10px] text-[#b8a9c9] hover:text-[#9a8aab] transition-colors"
            >
              + new task
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-2">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[#c4b49a] text-sm">Loading tasks…</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-1 py-8">
                <p className="text-[#c4b49a] text-sm">No tasks yet.</p>
                <p className="text-[#d4c0b0] text-xs">Tell the AI what's on your mind →</p>
              </div>
            ) : (
              tasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onTitleClick={() => setOpenTask(task)}
                  onToggle={() => handleToggleTask(task)}
                  onDelete={() => handleDelete(task.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Snake game — 33.33% */}
        <div className="flex-1 rounded-[14px] border border-[#e8ddd0] bg-[#fdfaf5] flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#e8ddd0] flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#8aab8a]" />
            <p className="text-[10px] uppercase tracking-widest text-[#a8997e]">Mini break · Snake</p>
          </div>
          <div className="flex-1 relative overflow-hidden">
            <SnakeGame />
          </div>
        </div>

      </div>

      {/* Microstep viewer modal */}
      {openTask && (
        <MicroStepModal
          task={openTask}
          onClose={() => setOpenTask(null)}
          onToggleStep={(stepId, current) => handleToggleStep(openTask.id, stepId, current)}
          onDelete={() => handleDelete(openTask.id)}
        />
      )}

      {/* Manual task creation modal */}
      {showCreateModal && (
        <CreateTaskModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTask}
        />
      )}
    </>
  )
}

// ─── Task row ────────────────────────────────────────────────────────────────

function TaskRow({ task, onTitleClick, onToggle, onDelete }) {
  const badge = ENERGY_BADGE[task.energy_level] ?? ENERGY_BADGE.medium
  const completed = task.status === 'completed'

  return (
    <div className="rounded-xl border border-[#e8ddd0] bg-[#f5f0e8] px-3 py-2.5 flex items-center gap-2.5 group">
      <input
        type="checkbox"
        checked={completed}
        onChange={onToggle}
        className="accent-[#d4a0a0] w-3.5 h-3.5 shrink-0 cursor-pointer"
      />
      <span
        onClick={onTitleClick}
        className={`flex-1 text-sm cursor-pointer hover:text-[#d4a0a0] transition-colors select-none
          ${completed ? 'line-through text-[#c4b49a]' : 'text-[#5c4f3d]'}`}
      >
        {task.title}
      </span>
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${badge.classes}`}>
        {badge.label}
      </span>
      <button
        onClick={onDelete}
        className="text-[#e8ddd0] hover:text-[#d4a0a0] transition-colors opacity-0 group-hover:opacity-100 text-base leading-none ml-1"
      >
        ×
      </button>
    </div>
  )
}

// ─── Microstep viewer modal ──────────────────────────────────────────────────

function MicroStepModal({ task, onClose, onToggleStep, onDelete }) {
  const badge = ENERGY_BADGE[task.energy_level] ?? ENERGY_BADGE.medium
  const totalMinutes = task.micro_steps.reduce((sum, s) => sum + s.duration_minutes, 0)
  const doneCount = task.micro_steps.filter(s => s.is_completed).length

  return (
    <>
      <div className="fixed inset-0 bg-[#5c4f3d]/20 backdrop-blur-[2px] z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
        w-[420px] max-h-[70vh] rounded-2xl border border-[#e8ddd0] bg-[#fdfaf5] flex flex-col overflow-hidden">

        <div className="px-5 py-4 border-b border-[#e8ddd0] flex items-start gap-3">
          <div className="flex-1">
            <p className="text-[#5c4f3d] font-medium text-sm leading-snug">{task.title}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badge.classes}`}>
                {badge.label} energy
              </span>
              <span className="text-[10px] text-[#c4b49a]">·</span>
              <span className="text-[10px] text-[#a8997e]">{totalMinutes}m total</span>
              <span className="text-[10px] text-[#c4b49a]">·</span>
              <span className="text-[10px] text-[#a8997e]">{doneCount}/{task.micro_steps.length} done</span>
            </div>
          </div>
          <button onClick={onClose} className="text-[#c4b49a] hover:text-[#a8997e] transition-colors text-lg leading-none mt-0.5">×</button>
        </div>

        <div className="h-1 bg-[#f5f0e8]">
          <div
            className="h-full bg-[#8aab8a] transition-all duration-300"
            style={{ width: `${task.micro_steps.length ? (doneCount / task.micro_steps.length) * 100 : 0}%` }}
          />
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-2">
          {task.micro_steps.length === 0 ? (
            <p className="text-[#c4b49a] text-sm text-center py-4">No microsteps yet.</p>
          ) : task.micro_steps.map((step, i) => (
            <div
              key={step.id}
              onClick={() => onToggleStep(step.id, step.is_completed)}
              className="flex items-center gap-3 rounded-xl border border-[#e8ddd0] bg-[#f5f0e8]
                px-3 py-2.5 cursor-pointer hover:border-[#d4a0a0] transition-colors"
            >
              <input
                type="checkbox"
                checked={step.is_completed}
                onChange={() => onToggleStep(step.id, step.is_completed)}
                onClick={e => e.stopPropagation()}
                className="accent-[#8aab8a] w-3.5 h-3.5 shrink-0 cursor-pointer"
              />
              <span className="text-[10px] text-[#c4b49a] shrink-0 w-4">{i + 1}.</span>
              <span className={`flex-1 text-sm ${step.is_completed ? 'line-through text-[#c4b49a]' : 'text-[#5c4f3d]'}`}>
                {step.content}
              </span>
              <span className="text-[10px] text-[#c4b49a] shrink-0 bg-[#fdfaf5] px-2 py-0.5 rounded-full border border-[#e8ddd0]">
                {step.duration_minutes}m
              </span>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-[#e8ddd0] flex justify-between items-center">
          <button onClick={onDelete} className="text-xs text-[#d4a0a0] hover:text-[#a05050] transition-colors">
            Delete task
          </button>
          <button onClick={onClose} className="text-xs text-[#a8997e] hover:text-[#5c4f3d] transition-colors">
            Close
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Create task modal ───────────────────────────────────────────────────────

const EMPTY_STEP = () => ({ content: '', duration_minutes: 20 })

function CreateTaskModal({ onClose, onSubmit }) {
  const [title, setTitle] = useState('')
  const [energyLevel, setEnergyLevel] = useState('medium')
  const [deadline, setDeadline] = useState('')
  const [steps, setSteps] = useState([EMPTY_STEP()])
  const [submitting, setSubmitting] = useState(false)

  function addStep() {
    setSteps(prev => [...prev, EMPTY_STEP()])
  }

  function removeStep(i) {
    setSteps(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateStep(i, field, value) {
    setSteps(prev => prev.map((s, idx) => idx !== i ? s : { ...s, [field]: value }))
  }

  async function handleSubmit() {
    if (!title.trim()) return
    setSubmitting(true)
    await onSubmit({
      title: title.trim(),
      energy_level: energyLevel,
      deadline,
      micro_steps: steps.filter(s => s.content.trim()),
    })
    setSubmitting(false)
  }

  return (
    <>
      <div className="fixed inset-0 bg-[#5c4f3d]/20 backdrop-blur-[2px] z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
        w-[460px] max-h-[80vh] rounded-2xl border border-[#e8ddd0] bg-[#fdfaf5] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-[#e8ddd0] flex items-center justify-between">
          <p className="text-sm font-medium text-[#5c4f3d]">New task</p>
          <button onClick={onClose} className="text-[#c4b49a] hover:text-[#a8997e] transition-colors text-lg leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-widest text-[#a8997e]">Task title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What needs to get done?"
              className="bg-[#f5f0e8] border border-[#e8ddd0] rounded-lg px-3 py-2 text-sm text-[#5c4f3d]
                placeholder:text-[#c4b49a] outline-none focus:border-[#d4a0a0] transition-colors"
            />
          </div>

          {/* Energy level + deadline row */}
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[10px] uppercase tracking-widest text-[#a8997e]">Energy level</label>
              <div className="flex gap-1.5">
                {['low', 'medium', 'high'].map(level => (
                  <button
                    key={level}
                    onClick={() => setEnergyLevel(level)}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium capitalize transition-colors border
                      ${energyLevel === level
                        ? level === 'low'
                          ? 'bg-[#d0e8d0] text-[#4a7a4a] border-[#4a7a4a]/20'
                          : level === 'medium'
                            ? 'bg-[#f5ecd0] text-[#8a7040] border-[#8a7040]/20'
                            : 'bg-[#f5d0d0] text-[#a05050] border-[#a05050]/20'
                        : 'bg-[#f5f0e8] text-[#a8997e] border-[#e8ddd0] hover:border-[#c4b49a]'
                      }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest text-[#a8997e]">Deadline</label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="bg-[#f5f0e8] border border-[#e8ddd0] rounded-lg px-3 py-2 text-xs text-[#5c4f3d]
                  outline-none focus:border-[#d4a0a0] transition-colors"
              />
            </div>
          </div>

          {/* Microsteps */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-widest text-[#a8997e]">Microsteps</label>
              <button
                onClick={addStep}
                className="text-[10px] text-[#b8a9c9] hover:text-[#9a8aab] transition-colors"
              >
                + add step
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-[10px] text-[#c4b49a] w-4 shrink-0">{i + 1}.</span>
                  <input
                    type="text"
                    value={step.content}
                    onChange={e => updateStep(i, 'content', e.target.value)}
                    placeholder="What's the step?"
                    className="flex-1 bg-[#f5f0e8] border border-[#e8ddd0] rounded-lg px-3 py-1.5 text-xs text-[#5c4f3d]
                      placeholder:text-[#c4b49a] outline-none focus:border-[#d4a0a0] transition-colors"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      value={step.duration_minutes}
                      onChange={e => updateStep(i, 'duration_minutes', e.target.value)}
                      min={1}
                      className="w-12 bg-[#f5f0e8] border border-[#e8ddd0] rounded-lg px-2 py-1.5 text-xs text-[#5c4f3d]
                        outline-none focus:border-[#d4a0a0] transition-colors text-center"
                    />
                    <span className="text-[10px] text-[#c4b49a]">m</span>
                  </div>
                  {steps.length > 1 && (
                    <button
                      onClick={() => removeStep(i)}
                      className="text-[#e8ddd0] hover:text-[#d4a0a0] transition-colors text-base leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#e8ddd0] flex justify-between items-center">
          <button onClick={onClose} className="text-xs text-[#a8997e] hover:text-[#5c4f3d] transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || submitting}
            className="bg-[#d4a0a0] hover:bg-[#c49090] disabled:opacity-40 text-[#fdfaf5]
              rounded-lg px-4 py-1.5 text-xs font-medium transition-colors"
          >
            {submitting ? 'Saving…' : 'Save task'}
          </button>
        </div>

      </div>
    </>
  )
}