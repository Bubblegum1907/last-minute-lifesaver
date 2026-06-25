import { useState, useEffect, useCallback } from 'react'
import CopilotColumn from './components/CopilotColumn'
import TaskFeedColumn from './components/TaskFeedColumn'
import FocusColumn from './components/FocusColumn'
import { getAllTasks } from './services/api'

export default function App() {
  const [tasks, setTasks] = useState([])
  const [tasksLoading, setTasksLoading] = useState(true)

  const refreshTasks = useCallback(async () => {
    try {
      const data = await getAllTasks()
      setTasks(data)
    } catch (err) {
      console.error('Failed to fetch tasks:', err)
    } finally {
      setTasksLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshTasks()
  }, [refreshTasks])

  return (
    <div className="grid grid-cols-[1fr_1.5fr_1fr] gap-2 p-2 h-screen overflow-hidden bg-[#f5f0e8]">
      <CopilotColumn tasks={tasks} onTaskCreated={refreshTasks} />
      <TaskFeedColumn tasks={tasks} loading={tasksLoading} onTasksChange={refreshTasks} />
      <FocusColumn tasks={tasks} />
    </div>
  )
}