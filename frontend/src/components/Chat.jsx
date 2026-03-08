import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Layout, Server, Globe, Code2, Upload, Plus } from 'lucide-react';
import './Chat.css';

const BrainCircuitIcon = () => (
  <svg className="welcome-icon" viewBox="0 0 64 64" width="56" height="56" fill="none">
    <circle cx="32" cy="32" r="28" stroke="url(#brain-grad)" strokeWidth="2" opacity="0.3">
      <animateTransform attributeName="transform" type="rotate" from="0 32 32" to="360 32 32" dur="20s" repeatCount="indefinite" />
    </circle>
    <circle cx="32" cy="32" r="20" stroke="url(#brain-grad)" strokeWidth="1.5" opacity="0.2">
      <animateTransform attributeName="transform" type="rotate" from="360 32 32" to="0 32 32" dur="15s" repeatCount="indefinite" />
    </circle>
    <circle cx="32" cy="20" r="3" fill="url(#brain-grad)">
      <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
    </circle>
    <circle cx="20" cy="36" r="3" fill="url(#brain-grad)">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
    </circle>
    <circle cx="44" cy="36" r="3" fill="url(#brain-grad)">
      <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
    </circle>
    <circle cx="32" cy="44" r="3" fill="url(#brain-grad)">
      <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite" />
    </circle>
    <line x1="32" y1="20" x2="20" y2="36" stroke="url(#brain-grad)" strokeWidth="1.5" opacity="0.5" />
    <line x1="32" y1="20" x2="44" y2="36" stroke="url(#brain-grad)" strokeWidth="1.5" opacity="0.5" />
    <line x1="20" y1="36" x2="32" y2="44" stroke="url(#brain-grad)" strokeWidth="1.5" opacity="0.5" />
    <line x1="44" y1="36" x2="32" y2="44" stroke="url(#brain-grad)" strokeWidth="1.5" opacity="0.5" />
    <line x1="20" y1="36" x2="44" y2="36" stroke="url(#brain-grad)" strokeWidth="1" opacity="0.3" />
    <defs>
      <linearGradient id="brain-grad" x1="0" y1="0" x2="64" y2="64">
        <stop offset="0%" stopColor="#58a6ff" />
        <stop offset="50%" stopColor="#8957ff" />
        <stop offset="100%" stopColor="#00e5ff" />
      </linearGradient>
    </defs>
  </svg>
);

const TEMPLATE_ICONS = {
  react: <Layout size={20} />,
  server: <Server size={20} />,
  flask: <Code2 size={20} />,
  globe: <Globe size={20} />,
};

export default function Chat({ messages, onSend, onIterate, isGenerating, plan, architecture, onProjectCreated, currentProject, onNewProject }) {
  const [input, setInput] = useState('');
  const [templates, setTemplates] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const isIterateMode = !!currentProject;

  useEffect(() => {
    fetch('/api/templates')
      .then(r => r.json())
      .then(d => setTemplates(d.templates || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    if (isIterateMode && onIterate) {
      onIterate(input.trim(), currentProject);
    } else {
      onSend(input.trim());
    }
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (!input.trim() || isGenerating) return;
      if (isIterateMode && onIterate) {
        onIterate(input.trim(), currentProject);
      } else {
        onSend(input.trim());
      }
      setInput('');
    }
  };

  const handleFileUpload = useCallback(async (files) => {
    if (!currentProject || !files || files.length === 0) return;
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        await fetch(`/api/upload/${currentProject}/${file.name}`, {
          method: 'POST',
          body: formData,
        });
      } catch (e) {
        console.error('Failed to upload file', e);
      }
    }
  }, [currentProject]);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (currentProject) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (currentProject && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const promptCategories = [
    { key: 'all', label: 'All', icon: '✨' },
    { key: 'web', label: 'Web Apps', icon: '🌐' },
    { key: 'api', label: 'APIs', icon: '⚡' },
    { key: 'mobile', label: 'Mobile', icon: '📱' },
    { key: 'data', label: 'Data/AI', icon: '🤖' },
  ];

  const quickPrompts = [
    { icon: "🛒", text: "Build an e-commerce storefront with product listings, cart, and Stripe checkout", accent: "#58a6ff", category: "web" },
    { icon: "📊", text: "Create an admin dashboard with charts, user management, and role-based access control", accent: "#58a6ff", category: "web" },
    { icon: "📝", text: "Build a blog platform with markdown editor, categories, and SEO-friendly URLs", accent: "#58a6ff", category: "web" },
    { icon: "🔐", text: "Build a REST API with JWT authentication, rate limiting, and Swagger docs", accent: "#00e5ff", category: "api" },
    { icon: "💳", text: "Create a payment processing API with Stripe integration and webhook handling", accent: "#00e5ff", category: "api" },
    { icon: "📡", text: "Build a GraphQL API with user CRUD, pagination, and real-time subscriptions", accent: "#00e5ff", category: "api" },
    { icon: "📱", text: "Build a fitness tracker app with workout logging, progress charts, and reminders", accent: "#8957ff", category: "mobile" },
    { icon: "🗺️", text: "Create a location-based app with maps, geofencing, and nearby search", accent: "#8957ff", category: "mobile" },
    { icon: "💬", text: "Build a messaging app with real-time chat, push notifications, and media sharing", accent: "#8957ff", category: "mobile" },
    { icon: "📈", text: "Build a data pipeline that ingests CSV files, cleans data, and generates visual reports", accent: "#f778ba", category: "data" },
    { icon: "🧠", text: "Create a sentiment analysis tool that processes customer reviews and shows trends", accent: "#f778ba", category: "data" },
    { icon: "🔍", text: "Build a RAG chatbot with document upload, vector search, and citation-backed answers", accent: "#f778ba", category: "data" },
  ];

  const [activeCategory, setActiveCategory] = useState('all');

  const filteredPrompts = activeCategory === 'all'
    ? quickPrompts
    : quickPrompts.filter(p => p.category === activeCategory);

  return (
    <div
      className={`chat ${isDragging ? 'chat-drag-active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="chat-drop-overlay">
          <Upload size={48} />
          <span>Drop files to upload</span>
        </div>
      )}
      <div className="chat-messages">
        {messages.length === 0 && !isGenerating && (
          <div className="chat-welcome">
            <div className="welcome-gradient-bg"></div>
            <div className="welcome-sparkles">
              <span className="sparkle sparkle-1"></span>
              <span className="sparkle sparkle-2"></span>
              <span className="sparkle sparkle-3"></span>
              <span className="sparkle sparkle-4"></span>
            </div>
            <div className="welcome-content">
              <BrainCircuitIcon />
              <h2>Welcome to Rashi</h2>
              <p>Describe your vision and watch intelligent agents bring it to life — from architecture to deployment.</p>
              <p className="chat-subtitle">Powered by 12 specialized AI agents and 70+ integrated prompt systems</p>
              <div className="category-pills">
                {promptCategories.map(cat => (
                  <button
                    key={cat.key}
                    className={`category-pill ${activeCategory === cat.key ? 'active' : ''}`}
                    onClick={() => setActiveCategory(cat.key)}
                  >
                    <span className="category-pill-icon">{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
              <div className="quick-prompts">
                {filteredPrompts.map((prompt, i) => (
                  <button
                    key={prompt.text}
                    className="quick-prompt"
                    style={{ animationDelay: `${i * 0.08}s`, '--prompt-accent': prompt.accent }}
                    onClick={() => { onSend(prompt.text); }}
                  >
                    <span className="quick-prompt-icon">{prompt.icon}</span>
                    <span className="quick-prompt-text">{prompt.text}</span>
                  </button>
                ))}
              </div>
              {templates.length > 0 && (
                <div className="templates-section">
                  <p className="templates-label">Or start from a template</p>
                  <div className="template-cards">
                    {templates.map((tmpl) => (
                      <button
                        key={tmpl.id}
                        className="template-card"
                        onClick={() => {
                          fetch(`/api/templates/${tmpl.id}/create`, { method: 'POST' })
                            .then(r => r.json())
                            .then(d => {
                              if (d.success && d.project && onProjectCreated) {
                                onProjectCreated(d.project);
                              } else if (d.success) {
                                window.location.reload();
                              }
                            })
                            .catch(() => alert('Failed to create from template'));
                        }}
                      >
                        <span className="template-card-icon">{TEMPLATE_ICONS[tmpl.icon] || <Globe size={20} />}</span>
                        <span className="template-card-name">{tmpl.name}</span>
                        <span className="template-card-desc">{tmpl.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageItem key={i} msg={msg} index={i} />
        ))}
        {isGenerating && (
          <div className="typing-indicator">
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat-input-area" onSubmit={handleSubmit}>
        {isIterateMode && onNewProject && (
          <button
            type="button"
            className="chat-new-project-btn"
            onClick={onNewProject}
            title="Start a new project"
          >
            <Plus size={18} />
          </button>
        )}
        <input
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isGenerating ? "Building your project..." : (isIterateMode ? "Describe changes..." : "What would you like me to build?")}
          disabled={isGenerating}
        />
        {isIterateMode && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                handleFileUpload(e.target.files);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              className="chat-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Upload files"
            >
              <Upload size={16} />
            </button>
          </>
        )}
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

function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="code-block">
      <div className="code-block-header">
        {language && <span className="code-block-lang">{language}</span>}
        <button className="code-block-copy" onClick={handleCopy}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="code-block-pre"><code>{code}</code></pre>
    </div>
  );
}

function renderMessageText(text) {
  if (!text) return null;
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    const codeMatch = part.match(/^```(\w*)\n?([\s\S]*?)```$/);
    if (codeMatch) {
      return <CodeBlock key={i} language={codeMatch[1]} code={codeMatch[2].replace(/\n$/, '')} />;
    }
    const inlineParts = part.split(/(`[^`]+`)/g);
    return (
      <React.Fragment key={i}>
        {inlineParts.map((seg, j) => {
          if (seg.startsWith('`') && seg.endsWith('`') && seg.length > 2) {
            return <code key={j} className="inline-code">{seg.slice(1, -1)}</code>;
          }
          return seg;
        })}
      </React.Fragment>
    );
  });
}

function MessageItem({ msg, index }) {
  const iconMap = {
    status: '💬',
    plan: '📋',
    architecture: '🏗️',
    file: '📄',
    error: '❌',
    complete: '✅',
    test_result: '🧪',
    uiux_update: '🎨',
  };

  const staggerDelay = `${Math.min(index * 0.05, 0.5)}s`;

  if (msg.type === 'plan' && msg.data) {
    return (
      <div className="chat-msg plan-msg msg-animate" style={{ animationDelay: staggerDelay }}>
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
      <div className="chat-msg arch-msg msg-animate" style={{ animationDelay: staggerDelay }}>
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

  if (msg.type === 'test_result') {
    const passed = msg.data?.passed;
    return (
      <div className={`chat-msg test-result-msg ${passed ? 'test-passed' : 'test-failed'} msg-animate`} style={{ animationDelay: staggerDelay }}>
        <span className="msg-icon">🧪</span>
        <span className="msg-text">{renderMessageText(msg.text)}</span>
      </div>
    );
  }

  if (msg.type === 'uiux_update') {
    return (
      <div className="chat-msg uiux-update-msg msg-animate" style={{ animationDelay: staggerDelay }}>
        <span className="msg-icon">🎨</span>
        <span className="msg-text">{renderMessageText(msg.text)}</span>
      </div>
    );
  }

  return (
    <div className={`chat-msg ${msg.type}-msg msg-animate`} style={{ animationDelay: staggerDelay }}>
      <span className="msg-icon">{iconMap[msg.type] || '💬'}</span>
      <span className="msg-text">{renderMessageText(msg.text)}</span>
    </div>
  );
}
