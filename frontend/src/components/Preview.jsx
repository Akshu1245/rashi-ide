import React from 'react';
import './Preview.css';

export default function Preview({ info, project }) {
  const isRunning = info && info.success !== false && info.port;

  return (
    <div className="preview">
      {!isRunning && (
        <div className="preview-placeholder">
          <div className="preview-icon">🖥️</div>
          <h3>Preview</h3>
          <p>
            {project
              ? 'Starting preview server...'
              : 'Build a project to see the live preview here'}
          </p>
        </div>
      )}
      {isRunning && (
        <div className="preview-active">
          <div className="preview-url-bar">
            <span className="preview-dot green"></span>
            <span className="preview-url">localhost:{info.port}</span>
            <button
              className="preview-refresh-btn"
              onClick={() => {
                const iframe = document.querySelector('.preview-iframe');
                if (iframe) iframe.src = iframe.src;
              }}
            >↻</button>
          </div>
          <iframe
            className="preview-iframe"
            src="/preview/"
            title="Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      )}
    </div>
  );
}
