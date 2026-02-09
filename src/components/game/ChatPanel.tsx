import { useState, useRef, useEffect } from 'react'
import { useGameStore } from '~/stores/game-store'
import type { GameLogEntry } from '~/engine/types'

export function ChatPanel() {
  const gameState = useGameStore((s) => s.gameState)
  const clientState = useGameStore((s) => s.clientState)
  const [messages, setMessages] = useState<{ text: string; from: string }[]>([])
  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const state = gameState ?? clientState

  // Also show game log entries
  const logEntries: GameLogEntry[] = state?.log ?? []

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, logEntries])

  function handleSend() {
    const text = input.trim()
    if (!text) return
    setMessages((prev) => [...prev, { text, from: 'You' }])
    setInput('')
  }

  return (
    <div className="flex flex-col h-full bg-gray-800 rounded-lg">
      <div className="px-3 py-2 border-b border-gray-700">
        <span className="text-sm font-medium">Game Log</span>
      </div>
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-1 text-xs"
      >
        {logEntries.map((entry, i) => (
          <div key={`log-${i}`} className="text-gray-400">
            {entry.message}
          </div>
        ))}
        {messages.map((msg, i) => (
          <div key={`chat-${i}`}>
            <span className="text-amber-400 font-medium">{msg.from}: </span>
            <span className="text-gray-200">{msg.text}</span>
          </div>
        ))}
      </div>
      <div className="p-2 border-t border-gray-700">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex gap-1"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-700 rounded px-2 py-1 text-sm text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button
            type="submit"
            className="px-2 py-1 bg-amber-600 hover:bg-amber-500 rounded text-sm cursor-pointer"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
