import React from 'react';
import { Zap, Download, Settings } from 'lucide-react';
import './TopBar.css';

export default function TopBar({ connected, project, isGenerating, onSettingsClick }) {
  const handleDownload = () => {
    if (!project) return;
    const link = document.createElement('a');
    link.href = `/api/projects/${encodeURIComponent(project)}/download`;
    link.download = `${project}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="topbar">
      <div className="topbar-left">
        <span className="topbar-logo">
          <Zap size={16} className="topbar-bolt-icon" />
          Rashi
        </span>
        <span className="topbar-version">v1.0</span>
        {project && <span className="topbar-project">{project}</span>}
      </div>
      <div className="topbar-right">
        {isGenerating && (
          <span className="topbar-status generating">
            <span className="building-indicator">
              <span className="bounce-dot"></span>
              <span className="bounce-dot"></span>
              <span className="bounce-dot"></span>
            </span>
            Building
          </span>
        )}
        <span className={`topbar-status ${connected ? 'connected' : 'disconnected'}`}>
          <span className="status-dot-wrapper">
            <span className="status-dot"></span>
            <span className="status-ring"></span>
          </span>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
        {project && (
          <button className="topbar-download-btn" onClick={handleDownload} title="Download project as ZIP">
            <Download size={16} />
          </button>
        )}
        <button className="topbar-settings-btn" onClick={onSettingsClick} title="Settings">
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
}
