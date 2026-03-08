import React, { useState, useEffect } from 'react';
import { Zap, Download, Settings, Rocket } from 'lucide-react';
import './TopBar.css';

export default function TopBar({ connected, project, isGenerating, onSettingsClick }) {
  const [stats, setStats] = useState(null);
  const [deploying, setDeploying] = useState(false);

  useEffect(() => {
    if (!project) {
      setStats(null);
      return;
    }
    const fetchStats = () => {
      fetch(`/api/projects/${encodeURIComponent(project)}/stats`)
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data) setStats(data); })
        .catch(() => {});
    };
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [project]);

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = () => {
    if (!project) return;
    const link = document.createElement('a');
    link.href = `/api/projects/${encodeURIComponent(project)}/download`;
    link.download = `${project}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeploy = async () => {
    if (!project || deploying) return;
    setDeploying(true);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(project)}/deploy-package`, { method: 'POST' });
      if (!res.ok) throw new Error('Deploy package failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project}-deploy.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Deploy package error:', e);
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="topbar">
      {isGenerating && <div className="topbar-progress-bar" />}
      <div className="topbar-left">
        <span className="topbar-logo">
          <Zap size={16} className="topbar-bolt-icon" />
          Rashi
        </span>
        <span className="topbar-version">v2.0</span>
        {project && (
          <span
            className="topbar-project"
            title={stats ? `Type: ${stats.project_type} · Size: ${formatSize(stats.total_size)}` : project}
          >
            {project}
            {stats && (
              <span className="topbar-file-count">{stats.file_count} files</span>
            )}
          </span>
        )}
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
          <>
            <button className="topbar-deploy-btn" onClick={handleDeploy} disabled={deploying} title="Deploy - Download production-ready package">
              <Rocket size={16} />
              {deploying ? 'Packaging...' : 'Deploy'}
            </button>
            <button className="topbar-download-btn" onClick={handleDownload} title="Download project as ZIP">
              <Download size={16} />
            </button>
          </>
        )}
        <button className="topbar-settings-btn" onClick={onSettingsClick} title="Settings">
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
}
