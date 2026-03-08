import React, { useRef, useEffect } from 'react';
import './Terminal.css';

export default function Terminal({ output }) {
  const termRef = useRef(null);

  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div className="terminal">
      <div className="terminal-header">
        <span className="terminal-title">Terminal Output</span>
      </div>
      <div className="terminal-body" ref={termRef}>
        {(!output || output.length === 0) && (
          <div className="terminal-empty">Waiting for output...</div>
        )}
        {output && output.map((line, i) => (
          <div key={i} className="terminal-line">
            {typeof line === 'string' ? line : JSON.stringify(line)}
          </div>
        ))}
      </div>
    </div>
  );
}
