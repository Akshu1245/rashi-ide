import React from 'react';
import './TopBar.css';

export default function TopBar({ connected, project, isGenerating }) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <span className="topbar-logo">Rashi AI IDE</span>
        {project && <span className="topbar-project">{project}</span>}
      </div>
      <div className="topbar-right">
        {isGenerating && (
          <span className="topbar-status generating">
            <span className="pulse-dot"></span>
            Building...
          </span>
        )}
        <span className={`topbar-status ${connected ? 'connected' : 'disconnected'}`}>
          <span className="status-dot"></span>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </div>
  );
}
