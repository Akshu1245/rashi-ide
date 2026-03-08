import React, { useRef, useEffect, useCallback, useState } from 'react';
import './Terminal.css';

export default function Terminal({ output }) {
  const termContainerRef = useRef(null);
  const termInstanceRef = useRef(null);
  const fitAddonRef = useRef(null);
  const lastLengthRef = useRef(0);
  const initRef = useRef(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const userScrolledRef = useRef(false);
  const [mode, setMode] = useState('logs');

  const shellContainerRef = useRef(null);
  const shellTermRef = useRef(null);
  const shellFitRef = useRef(null);
  const shellWsRef = useRef(null);
  const shellInitRef = useRef(false);

  const xtermTheme = {
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
  };

  const initTerminal = useCallback(async () => {
    if (initRef.current || !termContainerRef.current) return;
    initRef.current = true;

    try {
      const { Terminal: XTerminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');
      await import('@xterm/xterm/css/xterm.css');

      const fitAddon = new FitAddon();
      const term = new XTerminal({
        cursorBlink: false,
        cursorStyle: 'bar',
        fontSize: 13,
        fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
        theme: xtermTheme,
        scrollback: 1000,
        convertEol: true,
        allowProposedApi: true,
        disableStdin: true,
      });

      term.loadAddon(fitAddon);
      term.open(termContainerRef.current);

      setTimeout(() => {
        try { fitAddon.fit(); } catch {}
      }, 100);

      termInstanceRef.current = term;
      fitAddonRef.current = fitAddon;

      const viewport = termContainerRef.current.querySelector('.xterm-viewport');
      if (viewport) {
        viewport.addEventListener('scroll', () => {
          const isAtBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 30;
          userScrolledRef.current = !isAtBottom;
          setShowScrollBtn(!isAtBottom);
        });
      }

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

  const initShell = useCallback(async () => {
    if (shellInitRef.current || !shellContainerRef.current) return;
    shellInitRef.current = true;

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
        theme: xtermTheme,
        scrollback: 5000,
        convertEol: false,
        allowProposedApi: true,
      });

      term.loadAddon(fitAddon);
      term.open(shellContainerRef.current);

      setTimeout(() => {
        try { fitAddon.fit(); } catch {}
      }, 100);

      shellTermRef.current = term;
      shellFitRef.current = fitAddon;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/terminal`;
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        const dims = fitAddon.proposeDimensions();
        if (dims) {
          ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
        }
      };

      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          term.write(new Uint8Array(event.data));
        } else {
          term.write(event.data);
        }
      };

      ws.onclose = () => {};
      ws.onerror = () => {};

      shellWsRef.current = ws;

      term.onData((data) => {
        if (shellWsRef.current && shellWsRef.current.readyState === WebSocket.OPEN) {
          shellWsRef.current.send(data);
        }
      });

      term.onResize(({ cols, rows }) => {
        if (shellWsRef.current && shellWsRef.current.readyState === WebSocket.OPEN) {
          shellWsRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
        }
      });
    } catch (err) {
      console.error('Failed to initialize shell:', err);
      shellInitRef.current = false;
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
    if (mode === 'shell') {
      const timer = setTimeout(() => initShell(), 50);
      return () => clearTimeout(timer);
    }
  }, [mode, initShell]);

  useEffect(() => {
    return () => {
      if (shellWsRef.current) {
        try { shellWsRef.current.close(); } catch {}
        shellWsRef.current = null;
      }
      if (shellTermRef.current) {
        shellTermRef.current.dispose();
        shellTermRef.current = null;
        shellFitRef.current = null;
        shellInitRef.current = false;
      }
    };
  }, []);

  useEffect(() => {
    if (!termInstanceRef.current || !output) return;
    const newLines = output.slice(lastLengthRef.current);
    for (const line of newLines) {
      const text = typeof line === 'string' ? line : JSON.stringify(line);
      termInstanceRef.current.writeln(colorize(text));
    }
    lastLengthRef.current = output.length;
    if (!userScrolledRef.current) {
      termInstanceRef.current.scrollToBottom();
    }
  }, [output]);

  useEffect(() => {
    const handleResize = () => {
      try { fitAddonRef.current?.fit(); } catch {}
      try { shellFitRef.current?.fit(); } catch {}
    };
    window.addEventListener('resize', handleResize);
    const resizeInterval = setInterval(handleResize, 500);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(resizeInterval);
    };
  }, []);

  const handleClear = () => {
    if (mode === 'logs' && termInstanceRef.current) {
      termInstanceRef.current.clear();
    } else if (mode === 'shell' && shellTermRef.current) {
      shellTermRef.current.clear();
    }
  };

  const handleScrollToBottom = () => {
    if (termInstanceRef.current) {
      termInstanceRef.current.scrollToBottom();
      userScrolledRef.current = false;
      setShowScrollBtn(false);
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
          <div className="terminal-mode-toggle">
            <button
              className={`terminal-mode-btn ${mode === 'logs' ? 'active' : ''}`}
              onClick={() => setMode('logs')}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Logs
            </button>
            <button
              className={`terminal-mode-btn ${mode === 'shell' ? 'active' : ''}`}
              onClick={() => setMode('shell')}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
              Shell
            </button>
          </div>
        </div>
        <button className="terminal-clear-btn" onClick={handleClear} title="Clear terminal">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        </button>
      </div>
      <div className="terminal-body">
        <div
          className="terminal-xterm-container"
          ref={termContainerRef}
          style={{ display: mode === 'logs' ? 'flex' : 'none', flex: 1 }}
        />
        <div
          className="terminal-xterm-container terminal-shell-container"
          ref={shellContainerRef}
          style={{ display: mode === 'shell' ? 'flex' : 'none', flex: 1 }}
        />
        {mode === 'logs' && showScrollBtn && (
          <button className="terminal-scroll-btn" onClick={handleScrollToBottom} title="Scroll to bottom">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function colorize(text) {
  if (typeof text !== 'string') return text;
  if (/\x1b\[/.test(text)) return text;
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
  if (/^\s*\$/.test(text) || /^\s*>/.test(text)) {
    return `\x1b[36m${text}\x1b[0m`;
  }
  if (/^\s*\d+[\s|]/.test(text) || /^---/.test(text) || /^===/.test(text)) {
    return `\x1b[90m${text}\x1b[0m`;
  }
  return text;
}
