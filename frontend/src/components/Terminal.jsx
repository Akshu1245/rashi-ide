import React, { useRef, useEffect, useCallback } from 'react';
import './Terminal.css';

export default function Terminal({ output }) {
  const termContainerRef = useRef(null);
  const termInstanceRef = useRef(null);
  const fitAddonRef = useRef(null);
  const lastLengthRef = useRef(0);
  const initRef = useRef(false);

  const initTerminal = useCallback(async () => {
    if (initRef.current || !termContainerRef.current) return;
    initRef.current = true;

    try {
      const { Terminal: XTerminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');
      await import('@xterm/xterm/css/xterm.css');

      const fitAddon = new FitAddon();
      const term = new XTerminal({
        cursorBlink: true,
        cursorStyle: 'bar',
        fontSize: 13,
        fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
        theme: {
          background: '#0d0d0d',
          foreground: '#d4d4d4',
          cursor: '#a855f7',
          cursorAccent: '#0d0d0d',
          selectionBackground: 'rgba(0, 224, 255, 0.2)',
          black: '#1e1e1e',
          red: '#f87171',
          green: '#4ade80',
          yellow: '#fbbf24',
          blue: '#60a5fa',
          magenta: '#c084fc',
          cyan: '#22d3ee',
          white: '#d4d4d4',
          brightBlack: '#6b7280',
          brightRed: '#fca5a5',
          brightGreen: '#86efac',
          brightYellow: '#fde68a',
          brightBlue: '#93c5fd',
          brightMagenta: '#d8b4fe',
          brightCyan: '#67e8f9',
          brightWhite: '#f9fafb',
        },
        scrollback: 1000,
        convertEol: true,
        allowProposedApi: true,
      });

      term.loadAddon(fitAddon);
      term.open(termContainerRef.current);

      setTimeout(() => {
        try { fitAddon.fit(); } catch {}
      }, 100);

      termInstanceRef.current = term;
      fitAddonRef.current = fitAddon;

      if (output && output.length > 0) {
        for (const line of output) {
          const text = typeof line === 'string' ? line : JSON.stringify(line);
          term.writeln(colorize(text));
        }
        lastLengthRef.current = output.length;
      }
    } catch (err) {
      console.error('Failed to initialize xterm:', err);
      initRef.current = false;
    }
  }, []);

  useEffect(() => {
    initTerminal();
    return () => {
      if (termInstanceRef.current) {
        termInstanceRef.current.dispose();
        termInstanceRef.current = null;
        fitAddonRef.current = null;
        initRef.current = false;
        lastLengthRef.current = 0;
      }
    };
  }, [initTerminal]);

  useEffect(() => {
    if (!termInstanceRef.current || !output) return;
    const newLines = output.slice(lastLengthRef.current);
    for (const line of newLines) {
      const text = typeof line === 'string' ? line : JSON.stringify(line);
      termInstanceRef.current.writeln(colorize(text));
    }
    lastLengthRef.current = output.length;
  }, [output]);

  useEffect(() => {
    const handleResize = () => {
      try { fitAddonRef.current?.fit(); } catch {}
    };
    window.addEventListener('resize', handleResize);
    const resizeInterval = setInterval(handleResize, 500);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(resizeInterval);
    };
  }, []);

  const handleClear = () => {
    if (termInstanceRef.current) {
      termInstanceRef.current.clear();
    }
  };

  return (
    <div className="terminal">
      <div className="terminal-header">
        <div className="terminal-header-left">
          <div className="terminal-header-dots">
            <span className="terminal-dot red"></span>
            <span className="terminal-dot yellow"></span>
            <span className="terminal-dot green"></span>
          </div>
          <span className="terminal-title">Terminal</span>
        </div>
        <button className="terminal-clear-btn" onClick={handleClear} title="Clear terminal">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        </button>
      </div>
      <div className="terminal-xterm-container" ref={termContainerRef} />
    </div>
  );
}

function colorize(text) {
  if (typeof text !== 'string') return text;
  const lower = text.toLowerCase();
  if (lower.includes('error') || lower.includes('failed') || lower.includes('exception') || lower.includes('traceback')) {
    return `\x1b[31m${text}\x1b[0m`;
  }
  if (lower.includes('warning') || lower.includes('warn') || lower.includes('deprecated')) {
    return `\x1b[33m${text}\x1b[0m`;
  }
  if (lower.includes('success') || lower.includes('compiled') || lower.includes('ready') || lower.includes('listening') || lower.includes('started') || lower.includes('done')) {
    return `\x1b[32m${text}\x1b[0m`;
  }
  return text;
}
