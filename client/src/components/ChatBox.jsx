import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../services/socket';
import { SOCKET_EVENTS } from '../../../shared/events';

export default function ChatBox({ username, isDrawer, roomStatus }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const handleChatMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on(SOCKET_EVENTS.CHAT_MESSAGE, handleChatMessage);

    return () => {
      socket.off(SOCKET_EVENTS.CHAT_MESSAGE, handleChatMessage);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    socket.emit(SOCKET_EVENTS.SEND_CHAT, { text: input });
    setInput('');
  };

  return (
    <div className="bg-canvas-paper rounded-xl p-space-md shadow-xl flex flex-col h-full min-h-[460px] border-2 border-border-dark">
      <div className="flex items-center justify-between pb-space-xs border-b-2 border-border-dark mb-space-sm">
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-accent-blue text-[20px]">forum</span>
          <h2 className="font-headline-sm text-headline-sm uppercase text-on-surface">GUESS FEED</h2>
        </div>
        <span className="font-label-sm text-label-sm bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full font-bold">
          LIVE
        </span>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-space-xs p-space-xs">
        {messages.map((m, i) => {
          if (m.isSystem) {
            return (
              <div
                key={i}
                className={`p-space-xs px-space-sm rounded-lg font-body-sm text-body-sm ${
                  m.isCorrectNotice
                    ? 'bg-primary-fixed text-on-primary-fixed font-bold border border-border-dark shadow-sm'
                    : 'bg-surface-card-subtle text-on-surface-variant font-italic'
                }`}
              >
                {m.text}
              </div>
            );
          }

          if (m.isConcealedChat) {
            return (
              <div key={i} className="p-space-xs px-space-sm rounded-lg bg-surface-card text-on-surface-variant font-body-sm text-body-sm">
                <strong className="text-on-surface">{m.sender}:</strong>{' '}
                <span className="bg-border-dark text-border-dark select-none px-1 rounded">██████ (GUESSED)</span>
              </div>
            );
          }

          return (
            <div
              key={i}
              className={`p-space-xs px-space-sm rounded-lg font-body-sm text-body-sm ${
                m.sender === username ? 'bg-secondary-fixed text-on-secondary-fixed font-bold' : 'bg-surface-card text-on-surface'
              }`}
            >
              <strong className="text-on-surface">{m.sender}:</strong> <span>{m.text}</span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="flex flex-col sm:flex-row gap-space-xs pt-space-sm border-t-2 border-border-dark mt-space-sm">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isDrawer
              ? 'You are drawing! Chat with guessers...'
              : roomStatus === 'PLAYING'
              ? 'TYPE YOUR GUESS HERE...'
              : 'TYPE A MESSAGE...'
          }
          className="w-full min-w-0 flex-1 bg-surface-card text-on-surface font-body-md text-body-md px-space-md py-space-xs rounded-xl border-2 border-border-dark focus:outline-none focus:ring-2 focus:ring-secondary-container"
        />
        <button
          type="submit"
          className="w-full shrink-0 sm:w-auto px-space-md py-space-xs rounded-xl bg-primary-container text-on-primary font-headline-sm text-headline-sm uppercase border-2 border-border-dark shadow-[2px_2px_0px_#18181B] hover:opacity-90 transition-all"
        >
          SEND
        </button>
      </form>
    </div>
  );
}
