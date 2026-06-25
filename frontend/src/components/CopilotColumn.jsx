import { useState, useRef, useEffect } from 'react'
import { clarifyTask, breakdownTask, copilotChat } from '../services/api'

const WELCOME = {
  id: 'welcome',
  role: 'bot',
  text: "Hey there 🌿 Tell me what's on your mind — I'm here to chat, help you plan, or break down anything that feels overwhelming.",
}

// Returns last 7 days as array of { label: 'Mon', date: 'YYYY-MM-DD', count: 0 }
function buildGraphData(tasks) {
  const days = []
  const today = new Date()

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('en-US', { weekday: 'short' })
    days.push({ label, dateStr, count: 0 })
  }

  tasks.forEach(task => {
    if (task.status !== 'completed' || !task.completed_at) return
    const completedDate = task.completed_at.split('T')[0]
    const day = days.find(d => d.dateStr === completedDate)
    if (day) day.count++
  })

  return days
}

export default function CopilotColumn({ tasks, onTaskCreated }) {
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [mode, setMode] = useState('idle')
  const [rawDump, setRawDump] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  const graphData = buildGraphData(tasks)
  const maxCount = Math.max(...graphData.map(d => d.count), 1)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function pushMessage(role, text) {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role, text }])
  }

  // Build history array for the API from current messages (skip welcome + bot offers)
  function buildHistory(msgs) {
    return msgs
      .filter(m => m.id !== 'welcome')
      .filter(m => !m.text.startsWith("Want me to turn this"))
      .map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }))
  }

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || loading) return
    setInput('')
    pushMessage('user', trimmed)
    setLoading(true)

    try {
      if (mode === 'idle') {
        // Always chat first
        const reply = await copilotChat(trimmed, buildHistory(messages))
        pushMessage('bot', reply)

        // Only offer task creation if the message sounds actionable
        // Filter out pure venting, feelings, greetings, small talk
        const isVenting = /^(i('m| am) (so |really |just )?(tired|exhausted|stressed|anxious|sad|bored|done|over it|struggling|overwhelmed|lost|confused|scared|worried|nervous|upset|angry|frustrated)|ugh|argh|i hate|this sucks|why is|i can't|i cant|i don't know|i feel|feeling|so tired|so stressed|i give up|whatever|i just|omg|oh no|help me|i need (a hug|to vent|someone)|just venting)/i.test(trimmed.trim())
        const isGreeting = /^(hi|hey|hello|good (morning|afternoon|evening)|sup|what's up|how are you|yo)/i.test(trimmed.trim())
        const isShortEmotional = trimmed.split(' ').length <= 5 && /tired|sad|stressed|anxious|bored|lost|scared|overwhelmed|ugh|argh/i.test(trimmed)

        if (!isVenting && !isGreeting && !isShortEmotional) {
          await new Promise(r => setTimeout(r, 600))
          pushMessage('bot', "Want me to turn this into a task with a step-by-step plan? 🌱")
          setRawDump(trimmed)
          setMode('offer')
        } else {
          setMode('done')
        }

      } else if (mode === 'offer') {
        // User replied to the "want to add as task?" prompt
        const yes = /yes|yeah|yep|sure|please|do it|add|create|make|go ahead|ok|okay/i.test(trimmed)
        const no = /no|nah|nope|just|only|never mind|nevermind|dont|don't/i.test(trimmed)

        if (yes) {
          const wordCount = rawDump.trim().split(/\s+/).length
          const hasDeadline = /deadline|due|by |tomorrow|tonight|week|month|asap|urgent/i.test(rawDump)
          const isSimple = wordCount < 8 && !hasDeadline

          if (isSimple) {
            pushMessage('bot', "On it — putting together your plan now… 🌱")
            const task = await breakdownTask(rawDump, 'Keep it simple and practical.')
            const stepList = task.micro_steps.map((s, i) => `${i + 1}. ${s.content} (${s.duration_minutes}m)`).join('\n')
            pushMessage('bot', `Done! Here's a quick plan for **${task.title}**:\n\n${stepList}\n\nAdded to your task list 🌿`)
            setMode('done')
            onTaskCreated?.()
          } else {
            const questions = await clarifyTask(rawDump)
            const formatted = questions.map((q, i) => `${i + 1}. ${q}`).join('\n')
            pushMessage('bot', `Great! A couple of quick questions first:\n\n${formatted}\n\nFeel free to answer all at once.`)
            setMode('clarifying')
          }
        } else if (no) {
          pushMessage('bot', "No worries — I'm here if you need anything else 🌿")
          setMode('done')
        } else {
          // Ambiguous reply — treat as continued chat and re-offer
          const reply = await copilotChat(trimmed, buildHistory(messages))
          pushMessage('bot', reply)
          setMode('offer')
        }

      } else if (mode === 'clarifying') {
        setMode('answering')
        pushMessage('bot', "On it — putting together your plan now… 🌱")
        const task = await breakdownTask(rawDump, trimmed)
        const stepList = task.micro_steps.map((s, i) => `${i + 1}. ${s.content} (${s.duration_minutes}m)`).join('\n')
        pushMessage('bot', `All done! Here's your plan for **${task.title}**:\n\n${stepList}\n\nIt's been added to your task list. You've got this 💪`)
        setMode('done')
        onTaskCreated?.()

      } else {
        // done — general chat
        const reply = await copilotChat(trimmed, buildHistory(messages))
        pushMessage('bot', reply)
      }

    } catch (err) {
      const msg = err?.message || 'unknown error'
      pushMessage('bot', `Hmm, something went wrong: ${msg}. Could you try again?`)
      console.error(err)
      setMode('idle')
      setRawDump('')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleNewTask() {
    setMode('idle')
    setRawDump('')
    pushMessage('bot', "Sure! Tell me about the next thing on your plate 🌿")
  }

  return (
    <div className="flex flex-col gap-2 h-full min-h-0">

      {/* Motivational message — 25% */}
      <MotivationalPanel />

      {/* AI Chat — 50% */}
      <div className="flex-[2] min-h-0 rounded-[14px] border border-[#e8ddd0] bg-[#fdfaf5] flex flex-col overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#e8ddd0] flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#d4a0a0]" />
          <p className="text-[10px] uppercase tracking-widest text-[#a8997e]">AI Copilot</p>
          {(mode === 'done' || mode === 'offer') && (
            <button
              onClick={handleNewTask}
              className="ml-auto text-[10px] text-[#b8a9c9] hover:text-[#9a8aab] transition-colors"
            >
              + new task
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
          {messages.map(msg => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          {loading && (
            <div className="flex gap-1 px-3 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c4b49a] animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#c4b49a] animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#c4b49a] animate-bounce [animation-delay:300ms]" />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-3 py-3 border-t border-[#e8ddd0] flex gap-2">
          <textarea
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === 'offer' ? "Yes / No…" :
              mode === 'clarifying' ? "Answer the questions above…" :
              "Talk to me…"
            }
            className="flex-1 bg-[#f5f0e8] border border-[#e8ddd0] rounded-lg px-3 py-2 text-sm text-[#5c4f3d]
              placeholder:text-[#c4b49a] outline-none focus:border-[#d4a0a0] resize-none leading-snug"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-[#d4a0a0] hover:bg-[#c49090] disabled:opacity-40 text-[#fdfaf5]
              rounded-lg px-3 py-2 text-sm transition-colors self-end"
          >
            Send
          </button>
        </div>
      </div>

      {/* Activity graph — 25% */}
      <div className="flex-1 min-h-0 rounded-[14px] border border-[#e8ddd0] bg-[#fdfaf5] flex flex-col overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#e8ddd0] flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#8aab8a]" />
          <p className="text-[10px] uppercase tracking-widest text-[#a8997e]">Tasks done · last 7 days</p>
        </div>

        <div className="flex-1 flex flex-col justify-end px-3 pb-2 pt-3 gap-1">
          {/* Bars */}
          <div className="flex-1 flex items-end gap-1.5">
            {graphData.map((day, i) => {
              const isToday = i === graphData.length - 1
              const heightPct = maxCount === 0 ? 0 : (day.count / maxCount) * 100
              return (
                <div key={day.dateStr} className="flex-1 flex flex-col items-center justify-end gap-1 h-full group relative">
                  {/* Tooltip */}
                  {day.count > 0 && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#5c4f3d] text-[#fdfaf5]
                      text-[9px] px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      {day.count} done
                    </div>
                  )}
                  {/* Bar */}
                  <div
                    className={`w-full rounded-t-md transition-all duration-500
                      ${isToday ? 'bg-[#d4a0a0]' : 'bg-[#e8ddd0]'}
                      ${day.count === 0 ? 'min-h-[3px]' : ''}`}
                    style={{ height: day.count === 0 ? '3px' : `${heightPct}%` }}
                  />
                </div>
              )
            })}
          </div>

          {/* Day labels */}
          <div className="flex gap-1.5">
            {graphData.map((day, i) => {
              const isToday = i === graphData.length - 1
              return (
                <div key={day.dateStr} className="flex-1 text-center">
                  <span className={`text-[9px] ${isToday ? 'text-[#d4a0a0] font-semibold' : 'text-[#c4b49a]'}`}>
                    {isToday ? 'Today' : day.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

    </div>
  )
}

function ChatBubble({ message }) {
  const isBot = message.role === 'bot'
  const formatted = message.text.split('\n').map((line, i, arr) => {
    const parts = line.split(/\*\*(.*?)\*\*/g)
    return (
      <span key={i}>
        {parts.map((part, j) =>
          j % 2 === 1 ? <strong key={j}>{part}</strong> : part
        )}
        {i < arr.length - 1 && <br />}
      </span>
    )
  })

  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed
        ${isBot
          ? 'bg-[#f5f0e8] text-[#5c4f3d] rounded-tl-sm'
          : 'bg-[#d4a0a0] text-[#fdfaf5] rounded-tr-sm'
        }`}
      >
        {formatted}
      </div>
    </div>
  )
}

// ─── Motivational panel ──────────────────────────────────────────────────────

const ENTRIES = [
  { mood: 'Sunny',       icon: '☀️',  quote: 'You are capable of amazing things — one small step at a time.' },
  { mood: 'Cozy',        icon: '🍵',  quote: 'Rest is not laziness. A calm mind works wonders.' },
  { mood: 'Breezy',      icon: '🌿',  quote: 'Progress, not perfection. Keep going gently.' },
  { mood: 'Rainy',       icon: '🌧️',  quote: 'Even on hard days, you are doing better than you think.' },
  { mood: 'Golden hour', icon: '🌅',  quote: 'Every task you finish is proof of what you can do.' },
  { mood: 'Misty',       icon: '🌫️',  quote: 'Unclear paths still lead somewhere beautiful.' },
  { mood: 'Stormy',      icon: '⛈️',  quote: 'Storms don\'t last. You\'ve weathered every one so far.' },
  { mood: 'Crisp',       icon: '🍂',  quote: 'A fresh start is available to you at any moment.' },
  { mood: 'Starry',      icon: '🌙',  quote: 'Late nights happen. Be kind to yourself tonight.' },
  { mood: 'Blooming',    icon: '🌸',  quote: 'Growth is quiet. You might not see it yet, but it\'s there.' },
  { mood: 'Dewy',        icon: '🌱',  quote: 'Small actions, repeated with care, change everything.' },
  { mood: 'Warm',        icon: '🕯️',  quote: 'You don\'t have to do it all today. Just the next thing.' },
]

const DAILY = ENTRIES[Math.floor(Math.random() * ENTRIES.length)]

function MotivationalPanel() {
  return (
    <div className="flex-1 min-h-0 rounded-[14px] border border-[#e8ddd0] bg-[#fdfaf5] flex flex-col overflow-hidden">

      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[#e8ddd0] flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#c4b49a]" />
        <p className="text-[10px] uppercase tracking-widest text-[#a8997e]">Daily mood</p>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4 py-3 text-center">
        <span className="text-2xl">{DAILY.icon}</span>
        <span className="text-[10px] uppercase tracking-widest text-[#c4b49a] font-medium">
          {DAILY.mood}
        </span>
        <p className="text-xs text-[#a8997e] leading-relaxed italic">
          "{DAILY.quote}"
        </p>
      </div>

    </div>
  )
}