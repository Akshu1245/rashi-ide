import React, { useState, useEffect } from 'react';
import './AgentStatus.css';

const AGENT_DESCRIPTIONS = {
  orchestrator: { title: 'Orchestrator', desc: 'Coordinates all agents and manages the build pipeline', icon: '🎯' },
  planner: { title: 'Task Planner', desc: 'Breaks requests into actionable steps', icon: '📋' },
  architect: { title: 'Architect', desc: 'Designs system architecture and chooses frameworks', icon: '🏗️' },
  coder: { title: 'Code Generator', desc: 'Generates complete, production-ready source code', icon: '💻' },
  debugger: { title: 'Debugger', desc: 'Analyzes errors and generates fixes', icon: '🔧' },
  editor: { title: 'File Editor', desc: 'Makes targeted modifications to existing files', icon: '✏️' },
  uiux: { title: 'UI/UX Designer', desc: 'Improves frontend interfaces and responsive design', icon: '🎨' },
  researcher: { title: 'Researcher', desc: 'Provides technical knowledge and best practices', icon: '🔍' },
  executor: { title: 'Executor', desc: 'Runs commands and starts applications', icon: '▶️' },
  dependency: { title: 'Dependency Manager', desc: 'Manages packages and resolves conflicts', icon: '📦' },
  tester: { title: 'Tester', desc: 'Verifies application functionality', icon: '🧪' },
  deployer: { title: 'Deployer', desc: 'Prepares applications for deployment', icon: '🚀' },
};

const PIPELINE_STAGES = [
  { key: 'planner', label: 'Plan' },
  { key: 'architect', label: 'Design' },
  { key: 'coder', label: 'Code' },
  { key: 'uiux', label: 'UI/UX' },
  { key: 'debugger', label: 'Debug' },
  { key: 'tester', label: 'Test' },
  { key: 'executor', label: 'Run' },
];

function getPipelineStatus(agents, stageKey) {
  const state = agents?.[stageKey];
  if (!state) return 'pending';
  return state.status || 'pending';
}

export default function AgentStatus({ agents }) {
  const [promptSources, setPromptSources] = useState([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetch('/api/prompts')
      .then(r => r.json())
      .then(d => setPromptSources(d.sources || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const allAgents = Object.keys(AGENT_DESCRIPTIONS);

  const hasAnyActive = allAgents.some(name => agents?.[name]?.status === 'active' || agents?.[name]?.status === 'done');

  const debugRetries = agents?.debugger?.retries || 0;

  return (
    <div className={`agent-status ${visible ? 'visible' : ''}`}>
      {hasAnyActive && (
        <div className="pipeline-timeline">
          <h3 className="agent-section-title">Build Pipeline</h3>
          <div className="pipeline-stages">
            {PIPELINE_STAGES.map((stage, idx) => {
              const stageStatus = getPipelineStatus(agents, stage.key);
              return (
                <React.Fragment key={stage.key}>
                  <div className={`pipeline-stage ${stageStatus}`}>
                    <div className="pipeline-stage-dot">
                      {stageStatus === 'active' && <span className="pipeline-dot-pulse" />}
                      {stageStatus === 'done' && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span className="pipeline-stage-label">{stage.label}</span>
                  </div>
                  {idx < PIPELINE_STAGES.length - 1 && (
                    <div className={`pipeline-connector ${stageStatus === 'done' ? 'done' : ''}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      <div className="agent-grid-section">
        <h3 className="agent-section-title">Rashi Neural Network</h3>
        <p className="agent-section-desc">
          12 specialized AI agents powered by compiled prompts from {promptSources.length} sources
        </p>
        <div className="agent-grid">
          {allAgents.map((name, index) => {
            const info = AGENT_DESCRIPTIONS[name];
            const state = agents?.[name];
            const status = state?.status || 'idle';
            const isDebugger = name === 'debugger';
            return (
              <div
                key={name}
                className={`agent-card ${status}`}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                {status === 'active' && <div className="agent-card-glow" />}
                <div className="agent-card-header">
                  <span className="agent-card-icon">{info.icon}</span>
                  <span className="agent-card-title">{info.title}</span>
                  {isDebugger && debugRetries > 0 && (
                    <span className="retry-badge" title={`${debugRetries} retry attempt${debugRetries > 1 ? 's' : ''}`}>
                      ↻ {debugRetries}
                    </span>
                  )}
                  <span className={`agent-badge ${status}`}>
                    {status === 'active' && <span className="badge-pulse" />}
                    {status}
                  </span>
                </div>
                <p className="agent-card-desc">{info.desc}</p>
                {status === 'active' && (
                  <div className="agent-progress">
                    <div className="agent-progress-bar">
                      <div className="agent-progress-fill" />
                    </div>
                  </div>
                )}
                {state?.message && (
                  <p className="agent-card-msg">{state.message}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {promptSources.length > 0 && (
        <div className="prompt-sources">
          <h3 className="agent-section-title">Integrated Prompt Sources</h3>
          <div className="source-grid">
            {promptSources.map((s, index) => (
              <div
                key={s.name}
                className="source-card"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <span className="source-name">{s.name}</span>
                <span className="source-meta">
                  {s.prompt_files.length} prompts, {Math.round(s.total_size / 1024)}KB
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
