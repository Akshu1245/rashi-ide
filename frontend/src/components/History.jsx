import React, { useState, useEffect } from 'react';
import { Clock, RotateCcw, Trash2, Sparkles } from 'lucide-react';
import './History.css';

const HISTORY_KEY = 'rashi-history';

export function loadHistory() {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveHistoryItem(prompt, projectName) {
  try {
    const history = loadHistory();
    history.unshift({
      id: Date.now(),
      prompt,
      project: projectName,
      timestamp: Date.now(),
    });
    const trimmed = history.slice(0, 50);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {}
}

export default function History({ onRerun }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(loadHistory());
  }, []);

  const handleDelete = (id) => {
    const updated = items.filter(item => item.id !== id);
    setItems(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all generation history?')) {
      setItems([]);
      localStorage.removeItem(HISTORY_KEY);
    }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  if (items.length === 0) {
    return (
      <div className="history-empty">
        <div className="history-empty-icon">
          <Sparkles size={40} />
        </div>
        <h3>No generation history yet</h3>
        <p>Your past prompts and projects will appear here</p>
      </div>
    );
  }

  return (
    <div className="history">
      <div className="history-header">
        <h3 className="history-title">
          <Clock size={16} />
          Generation History
        </h3>
        <button className="history-clear-btn" onClick={handleClearAll}>Clear All</button>
      </div>
      <div className="history-list">
        {items.map((item) => (
          <div key={item.id} className="history-item">
            <div className="history-item-main">
              <span className="history-item-project">{item.project}</span>
              <span className="history-item-time">{formatTime(item.timestamp)}</span>
            </div>
            <p className="history-item-prompt">{item.prompt}</p>
            <div className="history-item-actions">
              <button
                className="history-action-btn rerun"
                onClick={() => onRerun(item.prompt)}
                title="Re-run this prompt"
              >
                <RotateCcw size={13} />
                Re-run
              </button>
              <button
                className="history-action-btn delete"
                onClick={() => handleDelete(item.id)}
                title="Delete"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
