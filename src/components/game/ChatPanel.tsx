import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '~/stores/game-store';
import type { GameLogEntry } from '~/engine/types';

export function ChatPanel() {
  const gameState = useGameStore((s) => s.gameState);
  const clientState = useGameStore((s) => s.clientState);
  const [messages, setMessages] = useState<{ text: string; from: string }[]>([]);
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const state = gameState ?? clientState;

  // Also show game log entries
  const logEntries: GameLogEntry[] = state?.log ?? [];

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, logEntries]);

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { text, from: 'You' }]);
    setInput('');
  }

  return (
    <div className="flex h-full flex-col rounded-lg bg-gray-800">
      <div className="border-b border-gray-700 px-3 py-2">
        <span className="text-sm font-medium">Game Log</span>
      </div>
      <div ref={listRef} className="flex-1 space-y-1 overflow-y-auto px-3 py-2 text-xs">
        {logEntries.map((entry, i) => (
          <div key={`log-${i}`} className="text-gray-400">
            {entry.message}
          </div>
        ))}
        {messages.map((msg, i) => (
          <div key={`chat-${i}`}>
            <span className="font-medium text-amber-400">{msg.from}: </span>
            <span className="text-gray-200">{msg.text}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-700 p-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-1"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded bg-gray-700 px-2 py-1 text-sm text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button
            type="submit"
            className="cursor-pointer rounded bg-amber-600 px-2 py-1 text-sm hover:bg-amber-500"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
