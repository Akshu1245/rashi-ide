import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [agents, setAgents] = useState({});
  const [currentProject, setCurrentProject] = useState(null);
  const [fileTree, setFileTree] = useState(null);
  const [terminalOutput, setTerminalOutput] = useState([]);
  const [previewInfo, setPreviewInfo] = useState(null);
  const [plan, setPlan] = useState(null);
  const [architecture, setArchitecture] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const connectingRef = useRef(false);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (connectingRef.current) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    connectingRef.current = true;

    try {
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        try { wsRef.current.close(); } catch (e) {}
      }
    } catch (e) {}

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        connectingRef.current = false;
        if (mountedRef.current) {
          setConnected(true);
        }
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      };

      ws.onclose = () => {
        connectingRef.current = false;
        if (mountedRef.current) {
          setConnected(false);
          if (!reconnectTimerRef.current) {
            reconnectTimerRef.current = setTimeout(() => {
              reconnectTimerRef.current = null;
              connect();
            }, 2000);
          }
        }
      };

      ws.onerror = () => {
        connectingRef.current = false;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleMessage(msg);
        } catch (e) {
          console.error('Failed to parse message', e);
        }
      };

      wsRef.current = ws;
    } catch (e) {
      connectingRef.current = false;
      if (mountedRef.current) {
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
          connect();
        }, 3000);
      }
    }
  }, []);

  const handleMessage = useCallback((msg) => {
    const { type, data } = msg;

    switch (type) {
      case 'status':
        setMessages(prev => [...prev, { type: 'status', text: data, time: Date.now() }]);
        break;
      case 'agent':
        setAgents(prev => ({
          ...prev,
          [data.name]: { status: data.status, message: data.message || '' }
        }));
        break;
      case 'plan':
        setPlan(data);
        setMessages(prev => [...prev, { type: 'plan', data, time: Date.now() }]);
        break;
      case 'architecture':
        setArchitecture(data);
        setMessages(prev => [...prev, { type: 'architecture', data, time: Date.now() }]);
        break;
      case 'file_created':
        setMessages(prev => [...prev, { type: 'file', text: `Created: ${data.path}`, time: Date.now() }]);
        break;
      case 'file_updated':
        setMessages(prev => [...prev, { type: 'file', text: `Updated: ${data.path}`, time: Date.now() }]);
        break;
      case 'file_tree':
        setFileTree(data);
        break;
      case 'terminal':
        setTerminalOutput(prev => [...prev, data]);
        break;
      case 'preview':
        setPreviewInfo(data);
        break;
      case 'error':
        setMessages(prev => [...prev, { type: 'error', text: data, time: Date.now() }]);
        setIsGenerating(false);
        break;
      case 'complete':
        setCurrentProject(data.project);
        setIsGenerating(false);
        setMessages(prev => [...prev, { type: 'complete', text: `Project "${data.project}" is ready!`, data, time: Date.now() }]);
        break;
      case 'pong':
        break;
      default:
        break;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        try { wsRef.current.close(); } catch (e) {}
      }
    };
  }, [connect]);

  const sendPrompt = useCallback((prompt) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      setIsGenerating(true);
      setMessages([{ type: 'status', text: `You: ${prompt}`, time: Date.now() }]);
      setAgents({});
      setFileTree(null);
      setTerminalOutput([]);
      setPreviewInfo(null);
      setPlan(null);
      setArchitecture(null);
      wsRef.current.send(JSON.stringify({ action: 'generate', prompt }));
    } else {
      setMessages(prev => [...prev, { type: 'error', text: 'Not connected to server. Reconnecting...', time: Date.now() }]);
      connect();
    }
  }, [connect]);

  return {
    connected,
    messages,
    agents,
    currentProject,
    fileTree,
    terminalOutput,
    previewInfo,
    plan,
    architecture,
    isGenerating,
    sendPrompt,
  };
}
