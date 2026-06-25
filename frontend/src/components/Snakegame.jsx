import { useEffect, useRef, useState, useCallback } from 'react'

const SEGMENT_SIZE = 12
const FOOD_RADIUS = 5
const SNAKE_SPEED = 3.5
const FOOD_ITEMS = 3
const COLORS = {
  snake:      '#8aab8a',
  snakeHead:  '#5c8a5c',
  snakeBorder:'#fdfaf5',
  food:       ['#d4a0a0', '#b8a9c9', '#c4b49a'],
  foodBorder: '#fdfaf5',
  bg:         '#fdfaf5',
  grid:       '#f5f0e8',
  text:       '#a8997e',
  lose:       '#d4a0a0',
}

function randomPos(w, h, margin = 20) {
  return {
    x: margin + Math.random() * (w - margin * 2),
    y: margin + Math.random() * (h - margin * 2),
  }
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export default function SnakeGame() {
  const canvasRef = useRef(null)
  const stateRef = useRef(null)
  const rafRef = useRef(null)
  const [score, setScore] = useState(0)
  const [lost, setLost] = useState(false)
  const [started, setStarted] = useState(false)

  const initState = useCallback((w, h) => {
    const cx = w / 2, cy = h / 2
    const snake = Array.from({ length: 10 }, (_, i) => ({ x: cx - i * SEGMENT_SIZE * 0.8, y: cy }))
    return {
      snake,
      mouse: { x: cx, y: cy },
      food: Array.from({ length: FOOD_ITEMS }, (_, i) => ({
        ...randomPos(w, h),
        color: COLORS.food[i % COLORS.food.length],
        pulse: Math.random() * Math.PI * 2,
      })),
      score: 0,
      lost: false,
      w, h,
    }
  }, [])

  const resetGame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    stateRef.current = initState(canvas.width, canvas.height)
    setScore(0)
    setLost(false)
    setStarted(true)
  }, [initState])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const container = canvas.parentElement

    function resize() {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      if (stateRef.current) {
        stateRef.current.w = canvas.width
        stateRef.current.h = canvas.height
      }
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    function onMouseMove(e) {
      const rect = canvas.getBoundingClientRect()
      if (stateRef.current) {
        stateRef.current.mouse = {
          x: (e.clientX - rect.left) * (canvas.width / rect.width),
          y: (e.clientY - rect.top) * (canvas.height / rect.height),
        }
        if (!started) setStarted(false) // just hover, don't auto-start
      }
    }
    canvas.addEventListener('mousemove', onMouseMove)

    return () => {
      ro.disconnect()
      canvas.removeEventListener('mousemove', onMouseMove)
    }
  }, [started])

  // Game loop
  useEffect(() => {
    if (!started || lost) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    function tick() {
      const s = stateRef.current
      if (!s || s.lost) return

      // Move head toward mouse
      const head = s.snake[0]
      const dx = s.mouse.x - head.x
      const dy = s.mouse.y - head.y
      const d = Math.hypot(dx, dy)

      if (d > SNAKE_SPEED) {
        const nx = head.x + (dx / d) * SNAKE_SPEED
        const ny = head.y + (dy / d) * SNAKE_SPEED
        s.snake.unshift({ x: nx, y: ny })
        s.snake.pop()
      }

      // Check food collision
      s.food.forEach((f, fi) => {
        f.pulse += 0.08
        if (dist(s.snake[0], f) < SEGMENT_SIZE + FOOD_RADIUS) {
          // Eat — grow snake by 8 segments
          const tail = s.snake[s.snake.length - 1]
          for (let i = 0; i < 8; i++) s.snake.push({ ...tail })
          s.food[fi] = {
            ...randomPos(s.w, s.h),
            color: COLORS.food[fi % COLORS.food.length],
            pulse: 0,
          }
          s.score++
          setScore(s.score)
        }
      })

      // Self-collision — skip first 20 segments (head buffer)
      const newHead = s.snake[0]
      for (let i = 20; i < s.snake.length; i++) {
        if (dist(newHead, s.snake[i]) < SEGMENT_SIZE * 0.6) {
          s.lost = true
          setLost(true)
          return
        }
      }

      // ── Draw ──────────────────────────────────────────────
      ctx.fillStyle = COLORS.bg
      ctx.fillRect(0, 0, s.w, s.h)

      // Subtle dot grid
      ctx.fillStyle = COLORS.grid
      for (let x = 12; x < s.w; x += 18) {
        for (let y = 12; y < s.h; y += 18) {
          ctx.beginPath()
          ctx.arc(x, y, 1, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Snake body (back to front)
      for (let i = s.snake.length - 1; i >= 0; i--) {
        const seg = s.snake[i]
        const t = i / s.snake.length
        const radius = SEGMENT_SIZE * 0.5 * (1 - t * 0.3)

        // Border
        ctx.beginPath()
        ctx.arc(seg.x, seg.y, radius + 1.5, 0, Math.PI * 2)
        ctx.fillStyle = COLORS.snakeBorder
        ctx.fill()

        // Body
        ctx.beginPath()
        ctx.arc(seg.x, seg.y, radius, 0, Math.PI * 2)
        ctx.fillStyle = i === 0 ? COLORS.snakeHead : COLORS.snake
        ctx.fill()
      }

      // Eyes on head
      const head2 = s.snake[0]
      const next = s.snake[1] || { x: head2.x - 1, y: head2.y }
      const angle = Math.atan2(head2.y - next.y, head2.x - next.x)
      const eyeOffset = SEGMENT_SIZE * 0.28
      for (const side of [-1, 1]) {
        const ex = head2.x + Math.cos(angle + side * Math.PI / 2) * eyeOffset
        const ey = head2.y + Math.sin(angle + side * Math.PI / 2) * eyeOffset
        ctx.beginPath()
        ctx.arc(ex, ey, 2.2, 0, Math.PI * 2)
        ctx.fillStyle = '#fdfaf5'
        ctx.fill()
        ctx.beginPath()
        ctx.arc(ex + Math.cos(angle) * 0.8, ey + Math.sin(angle) * 0.8, 1.1, 0, Math.PI * 2)
        ctx.fillStyle = '#5c4f3d'
        ctx.fill()
      }

      // Food
      s.food.forEach(f => {
        const scale = 1 + Math.sin(f.pulse) * 0.12
        const r = FOOD_RADIUS * scale

        // Glow
        const grd = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r * 2.5)
        grd.addColorStop(0, f.color + '55')
        grd.addColorStop(1, f.color + '00')
        ctx.beginPath()
        ctx.arc(f.x, f.y, r * 2.5, 0, Math.PI * 2)
        ctx.fillStyle = grd
        ctx.fill()

        // Border
        ctx.beginPath()
        ctx.arc(f.x, f.y, r + 1.5, 0, Math.PI * 2)
        ctx.fillStyle = COLORS.foodBorder
        ctx.fill()

        // Berry
        ctx.beginPath()
        ctx.arc(f.x, f.y, r, 0, Math.PI * 2)
        ctx.fillStyle = f.color
        ctx.fill()

        // Shine
        ctx.beginPath()
        ctx.arc(f.x - r * 0.25, f.y - r * 0.25, r * 0.3, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.fill()
      })

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [started, lost])

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: started && !lost ? 'none' : 'default' }}
      />

      {/* Score */}
      {started && !lost && (
        <div className="absolute top-2 right-3 text-[10px] text-[#a8997e] select-none">
          🍓 {score}
        </div>
      )}

      {/* Start screen */}
      {!started && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <p className="text-2xl">🐍</p>
          <p className="text-xs text-[#a8997e]">Move your mouse to guide the snake</p>
          <button
            onClick={resetGame}
            className="mt-1 bg-[#8aab8a] hover:bg-[#7a9b7a] text-[#fdfaf5] text-xs font-medium px-4 py-1.5 rounded-lg transition-colors"
          >
            Start
          </button>
        </div>
      )}

      {/* Game over */}
      {lost && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#fdfaf5]/70 backdrop-blur-[2px]">
          <p className="text-xl">🌿</p>
          <p className="text-sm font-medium text-[#5c4f3d]">Oh no!</p>
          <p className="text-xs text-[#a8997e]">Score: {score} 🍓</p>
          <button
            onClick={resetGame}
            className="mt-1 bg-[#d4a0a0] hover:bg-[#c49090] text-[#fdfaf5] text-xs font-medium px-4 py-1.5 rounded-lg transition-colors"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}