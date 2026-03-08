import React, { useState, useRef } from 'react';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import './Preview.css';

const VIEWPORTS = [
  { key: 'desktop', label: 'Desktop', width: '100%', icon: Monitor },
  { key: 'tablet', label: 'Tablet', width: '768px', icon: Tablet },
  { key: 'mobile', label: 'Mobile', width: '375px', icon: Smartphone },
];

export default function Preview({ info, project }) {
  const isRunning = info && info.success !== false && info.port;
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [viewport, setViewport] = useState('desktop');
  const [urlPath, setUrlPath] = useState('');
  const iframeRef = useRef(null);

  const activeViewport = VIEWPORTS.find(v => v.key === viewport);

  const handleRefresh = () => {
    setIframeLoaded(false);
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    if (iframeRef.current) {
      const path = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
      iframeRef.current.src = `/preview${path}`;
      setIframeLoaded(false);
    }
  };

  return (
    <div className="preview">
      {!isRunning && (
        <div className="preview-placeholder">
          <div className="preview-icon-wrapper">
            <div className="preview-icon-float">
              <svg className="preview-monitor-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div className="preview-icon-glow"></div>
          </div>
          <h3>Preview</h3>
          <p>
            {project
              ? 'Spinning up your preview environment...'
              : 'Your creation will come to life here — start building!'}
          </p>
          {project && (
            <div className="preview-loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}
        </div>
      )}
      {isRunning && (
        <div className="preview-active">
          <div className="preview-url-bar">
            <div className="preview-url-bar-left">
              <span className="preview-dot green">
                <span className="preview-dot-ring"></span>
              </span>
              <form className="preview-url-form" onSubmit={handleUrlSubmit}>
                <input
                  className="preview-url-input"
                  value={urlPath}
                  onChange={(e) => setUrlPath(e.target.value)}
                  placeholder={`localhost:${info.port}/`}
                />
              </form>
            </div>
            <div className="preview-url-bar-right">
              <div className="preview-viewport-toggles">
                {VIEWPORTS.map(vp => {
                  const Icon = vp.icon;
                  return (
                    <button
                      key={vp.key}
                      className={`preview-viewport-btn ${viewport === vp.key ? 'active' : ''}`}
                      onClick={() => setViewport(vp.key)}
                      title={vp.label}
                    >
                      <Icon size={14} />
                    </button>
                  );
                })}
              </div>
              <button
                className="preview-refresh-btn"
                onClick={handleRefresh}
                title="Refresh"
              >↻</button>
            </div>
          </div>
          <div className="preview-iframe-wrapper">
            {!iframeLoaded && (
              <div className="preview-iframe-loading">
                <div className="preview-loading-spinner"></div>
                <span>Loading preview...</span>
              </div>
            )}
            <div
              className="preview-viewport-container"
              style={{
                maxWidth: activeViewport?.width || '100%',
                margin: viewport !== 'desktop' ? '0 auto' : undefined,
              }}
            >
              <iframe
                ref={iframeRef}
                className={`preview-iframe ${iframeLoaded ? 'loaded' : ''}`}
                src="/preview/"
                title="Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                onLoad={() => setIframeLoaded(true)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
