import { useState, useEffect, useRef, useCallback } from 'react'
import catImage from '../assets/cat.png'

const MODES = {
  focus: { label: 'Focus', minutes: 25, color: '#d4a0a0' },
  break: { label: 'Break', minutes: 5,  color: '#8aab8a' },
}

export default function FocusColumn({ tasks }) {
  const [notifications, setNotifications] = useState([])

  const addNotification = useCallback((id, text) => {
    setNotifications(prev => {
      if (prev.find(n => n.id === id)) return prev
      return [...prev, { id, text, time: new Date() }]
    })
  }, [])

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  // ── Deadline approaching (within 24hrs) ──────────────────────────────────
  useEffect(() => {
    if (!tasks.length) return
    const now = new Date()
    const in24hrs = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    tasks.forEach(task => {
      if (!task.deadline || task.status === 'completed') return
      const deadline = new Date(task.deadline)
      if (deadline > now && deadline <= in24hrs) {
        const hoursLeft = Math.round((deadline - now) / (1000 * 60 * 60))
        addNotification(
          `deadline-${task.id}`,
          `⏰ "${task.title}" is due in ~${hoursLeft}h`
        )
      }
    })
  }, [tasks, addNotification])

  // ── All tasks completed ───────────────────────────────────────────────────
  useEffect(() => {
    if (!tasks.length) return
    const allDone = tasks.every(t => t.status === 'completed')
    if (allDone) {
      addNotification('all-done', '🌸 All tasks completed! You did amazing today.')
    } else {
      removeNotification('all-done')
    }
  }, [tasks, addNotification, removeNotification])

  // ── Been working a while (45 min) ────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      addNotification('working-long', '🍵 You\'ve been at it for a while — maybe take a little break?')
    }, 45 * 60 * 1000)
    return () => clearTimeout(timer)
  }, [addNotification])

  return (
    <div className="flex flex-col gap-2 h-full min-h-0">
      <PomodoroPanel onSessionEnd={() =>
        addNotification(`pomodoro-${Date.now()}`, '🌿 Pomodoro session done! Time for a breather.')
      } />
      <SketchpadPanel notifications={notifications} onDismiss={removeNotification} />
    </div>
  )
}

// ─── Pomodoro ────────────────────────────────────────────────────────────────

function PomodoroPanel({ onSessionEnd }) {
  const [mode, setMode] = useState('focus')
  const [secondsLeft, setSecondsLeft] = useState(MODES.focus.minutes * 60)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const intervalRef = useRef(null)

  const { label, color } = MODES[mode]
  const totalSeconds = MODES[mode].minutes * 60
  const progress = (secondsLeft / totalSeconds) * 100
  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const seconds = String(secondsLeft % 60).padStart(2, '0')
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - progress / 100)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current)
            setRunning(false)
            handleSessionEnd()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running])

  function handleSessionEnd() {
    if (mode === 'focus') {
      setSessions(s => s + 1)
      onSessionEnd()
      switchMode('break')
    } else {
      switchMode('focus')
    }
  }

  function switchMode(next) {
    setMode(next)
    setSecondsLeft(MODES[next].minutes * 60)
    setRunning(false)
  }

  function handleReset() {
    setRunning(false)
    setSecondsLeft(MODES[mode].minutes * 60)
  }

  return (
    <div className="flex-1 min-h-0 rounded-[14px] border border-[#e8ddd0] bg-[#fdfaf5] flex flex-col overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#e8ddd0] flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#d4a0a0]" />
        <p className="text-[10px] uppercase tracking-widest text-[#a8997e]">Pomodoro</p>
        <span className="ml-auto text-[10px] text-[#c4b49a]">
          {sessions} session{sessions !== 1 ? 's' : ''} today
        </span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4">
        <div className="flex gap-1 bg-[#f5f0e8] rounded-lg p-1">
          {Object.entries(MODES).map(([key, val]) => (
            <button key={key} onClick={() => switchMode(key)}
              className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors
                ${mode === key ? 'bg-[#fdfaf5] text-[#5c4f3d] shadow-sm' : 'text-[#a8997e] hover:text-[#5c4f3d]'}`}>
              {val.label}
            </button>
          ))}
        </div>
        <div className="relative flex items-center justify-center">
          <svg width="96" height="96" className="-rotate-90">
            <circle cx="48" cy="48" r={radius} fill="none" stroke="#f5f0e8" strokeWidth="5" />
            <circle cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="5"
              strokeLinecap="round" strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset} className="transition-all duration-1000" />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-xl font-semibold text-[#5c4f3d] leading-none">{minutes}:{seconds}</span>
            <span className="text-[9px] text-[#c4b49a] uppercase tracking-widest mt-0.5">{label}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className="text-[#c4b49a] hover:text-[#a8997e] transition-colors text-xs px-2 py-1">Reset</button>
          <button onClick={() => setRunning(r => !r)} style={{ backgroundColor: color }}
            className="text-[#fdfaf5] text-xs font-medium px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity min-w-[60px]">
            {running ? 'Pause' : secondsLeft === 0 ? 'Done' : 'Start'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sketchpad + cat ─────────────────────────────────────────────────────────

const COLORS = ['#5c4f3d', '#d4a0a0', '#8aab8a', '#b8a9c9', '#c4b49a']
const BRUSHES = [
  { label: 'S', size: 2 },
  { label: 'M', size: 5 },
  { label: 'L', size: 10 },
]

function SketchpadPanel({ notifications, onDismiss }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const lastPos = useRef(null)
  const [color, setColor] = useState(COLORS[0])
  const [brush, setBrush] = useState(BRUSHES[1])
  const [erasing, setErasing] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const popupRef = useRef(null)
  const hasUnread = notifications.length > 0

  useEffect(() => {
    function handleClickOutside(e) {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
    }
    if (showNotifications) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showNotifications])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = canvas.parentElement
    function resize() {
      const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height)
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fdfaf5'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.putImageData(imageData, 0, 0)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  function getPos(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  function startDraw(e) { e.preventDefault(); drawing.current = true; lastPos.current = getPos(e) }
  function draw(e) {
    e.preventDefault()
    if (!drawing.current) return
    const ctx = canvasRef.current.getContext('2d')
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = erasing ? '#fdfaf5' : color
    ctx.lineWidth = erasing ? brush.size * 4 : brush.size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    lastPos.current = pos
  }
  function stopDraw() { drawing.current = false; lastPos.current = null }
  function clearCanvas() {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fdfaf5'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  return (
    <div className="flex-1 min-h-0 rounded-[14px] border border-[#e8ddd0] bg-[#fdfaf5] flex flex-col overflow-hidden">

      {/* Header */}
      <div className="px-3 py-2 border-b border-[#e8ddd0] flex items-center gap-2 flex-wrap">
        <div className="w-2 h-2 rounded-full bg-[#c4b49a] shrink-0" />
        <p className="text-[10px] uppercase tracking-widest text-[#a8997e]">Sketchpad</p>
        <div className="flex gap-1 ml-1">
          {COLORS.map(c => (
            <button key={c} onClick={() => { setColor(c); setErasing(false) }}
              style={{ backgroundColor: c }}
              className={`w-3.5 h-3.5 rounded-full transition-transform
                ${color === c && !erasing ? 'scale-125 ring-1 ring-[#e8ddd0] ring-offset-1' : 'hover:scale-110'}`} />
          ))}
        </div>
        <div className="flex gap-1">
          {BRUSHES.map(b => (
            <button key={b.label} onClick={() => { setBrush(b); setErasing(false) }}
              className={`text-[9px] w-5 h-5 rounded-md font-medium transition-colors
                ${brush.label === b.label && !erasing
                  ? 'bg-[#5c4f3d] text-[#fdfaf5]'
                  : 'bg-[#f5f0e8] text-[#a8997e] hover:bg-[#e8ddd0]'}`}>
              {b.label}
            </button>
          ))}
        </div>
        <button onClick={() => setErasing(e => !e)}
          className={`text-[9px] px-2 h-5 rounded-md font-medium transition-colors ml-auto
            ${erasing ? 'bg-[#d4a0a0] text-[#fdfaf5]' : 'bg-[#f5f0e8] text-[#a8997e] hover:bg-[#e8ddd0]'}`}>
          Eraser
        </button>
        <button onClick={clearCanvas}
          className="text-[9px] px-2 h-5 rounded-md bg-[#f5f0e8] text-[#a8997e] hover:bg-[#e8ddd0] transition-colors font-medium">
          Clear
        </button>
      </div>

      {/* Canvas + cat */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ cursor: erasing ? 'cell' : 'crosshair' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />

        {/* Cat mascot + notification popup */}
        <div ref={popupRef} className="absolute bottom-2 right-2 flex flex-col items-end gap-1 z-10">

          {/* Notification popup */}
          {showNotifications && (
            <div className="mb-1 w-56 rounded-xl border border-[#e8ddd0] bg-[#fdfaf5] shadow-md overflow-hidden">
              <div className="px-3 py-2 border-b border-[#e8ddd0]">
                <p className="text-[10px] uppercase tracking-widest text-[#a8997e]">Notifications</p>
              </div>
              <div className="flex flex-col max-h-48 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-[11px] text-[#c4b49a] px-3 py-3">Nothing yet 🌿</p>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className="px-3 py-2 border-b border-[#f5f0e8] last:border-0 flex items-start gap-2 group">
                      <p className="text-[11px] text-[#5c4f3d] leading-snug flex-1">{n.text}</p>
                      <button
                        onClick={() => onDismiss(n.id)}
                        className="text-[#e8ddd0] hover:text-[#d4a0a0] transition-colors text-sm leading-none opacity-0 group-hover:opacity-100 shrink-0 mt-0.5"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Cat button */}
          <div className="relative inline-flex">
            <button
              onClick={() => setShowNotifications(v => !v)}
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center
                transition-all hover:scale-110 shadow-md overflow-hidden
                ${showNotifications ? 'border-[#d4a0a0]' : 'border-[#e8ddd0] hover:border-[#d4a0a0]'}
                ${hasUnread ? 'animate-[wiggle_1s_ease-in-out]' : ''}`}
              title="Notifications"
            >
              <img src={catImage} alt="Cat mascot" className="w-full h-full object-cover" />
            </button>

            {/* Unread dot — floats outside the circle */}
            {hasUnread && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#d4a0a0] border-2 border-[#fdfaf5] shadow-sm pointer-events-none" />
            )}
          </div>

        </div>
      </div>
    </div>
  )
}