import React, { useState, useRef, useEffect } from 'react';
import './Chat.css';

export default function Chat({ messages, onSend, isGenerating, plan, architecture }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    onSend(input.trim());
    setInput('');
  };

  const quickPrompts = [
    "Build a todo app with React and Tailwind CSS",
    "Create a weather dashboard using Python Flask",
    "Build a real-time chat app with Node.js and WebSocket",
    "Create a landing page for a SaaS product",
  ];

  return (
    <div className="chat">
      <div className="chat-messages">
        {messages.length === 0 && !isGenerating && (
          <div className="chat-welcome">
            <h2>Welcome to Rashi AI IDE</h2>
            <p>Describe what you want to build and watch the AI create it autonomously.</p>
            <p className="chat-subtitle">Powered by 12 specialized AI agents and 70+ integrated prompt systems</p>
            <div className="quick-prompts">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  className="quick-prompt"
                  onClick={() => { onSend(prompt); }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageItem key={i} msg={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat-input-area" onSubmit={handleSubmit}>
        <input
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={isGenerating ? "Building your project..." : "Describe what you want to build..."}
          disabled={isGenerating}
        />
        <button
          className="chat-send"
          type="submit"
          disabled={!input.trim() || isGenerating}
        >
          {isGenerating ? '⏳' : '→'}
        </button>
      </form>
    </div>
  );
}

function MessageItem({ msg }) {
  const iconMap = {
    status: '💬',
    plan: '📋',
    architecture: '🏗️',
    file: '📄',
    error: '❌',
    complete: '✅',
  };

  if (msg.type === 'plan' && msg.data) {
    return (
      <div className="chat-msg plan-msg">
        <div className="msg-header">
          <span className="msg-icon">📋</span>
          <span className="msg-label">Task Plan</span>
        </div>
        <div className="msg-body">
          <strong>{msg.data.project_name}</strong>
          <p>{msg.data.description}</p>
          {msg.data.tasks && (
            <ol className="task-list">
              {msg.data.tasks.map((t, i) => (
                <li key={i}>{t.name}: {t.description}</li>
              ))}
            </ol>
          )}
        </div>
      </div>
    );
  }

  if (msg.type === 'architecture' && msg.data) {
    return (
      <div className="chat-msg arch-msg">
        <div className="msg-header">
          <span className="msg-icon">🏗️</span>
          <span className="msg-label">Architecture</span>
        </div>
        <div className="msg-body">
          {msg.data.framework && <p><strong>Framework:</strong> {msg.data.framework}</p>}
          {msg.data.dependencies && (
            <p><strong>Dependencies:</strong> {msg.data.dependencies.join(', ')}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`chat-msg ${msg.type}-msg`}>
      <span className="msg-icon">{iconMap[msg.type] || '💬'}</span>
      <span className="msg-text">{msg.text}</span>
    </div>
  );
}
