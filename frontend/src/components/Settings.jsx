import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import './Settings.css';

const PROVIDERS = [
  { value: 'replit', label: 'Replit AI' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'kilocode', label: 'Kilo Code' },
  { value: 'custom', label: 'Custom' },
];

const MODEL_OPTIONS = {
  replit: ['gpt-5-mini', 'gpt-5'],
  openai: ['gpt-5-mini', 'gpt-5', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano'],
  kilocode: ['kilo-coder', 'kilo-coder-mini'],
  custom: [],
};

const STORAGE_KEY = 'rashi-settings';
const THEME_KEY = 'rashi-theme';

function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    provider: 'replit',
    apiKey: '',
    baseUrl: '',
    model: 'gpt-5-mini',
  };
}

function saveSettingsToStorage(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || 'dark';
  } catch {
    return 'dark';
  }
}

export function setStoredTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
  } catch {}
}

export default function Settings({ isOpen, onClose, theme, onThemeChange }) {
  const [settings, setSettings] = useState(loadSettings);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(loadSettings());
    }
  }, [isOpen]);

  useEffect(() => {
    const stored = loadSettings();
    if (stored.provider !== 'replit') {
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stored),
      }).catch(() => {});
    }
  }, []);

  if (!isOpen) return null;

  const needsApiKey = settings.provider !== 'replit';
  const needsBaseUrl = settings.provider === 'custom' || settings.provider === 'kilocode';
  const models = MODEL_OPTIONS[settings.provider] || [];

  const handleProviderChange = (e) => {
    const provider = e.target.value;
    const defaultModel = (MODEL_OPTIONS[provider] || [])[0] || '';
    setSettings((s) => ({ ...s, provider, model: defaultModel }));
  };

  const handleSave = async () => {
    saveSettingsToStorage(settings);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
    } catch {}
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    onThemeChange(newTheme);
  };

  return (
    <>
      <div className="settings-overlay" onClick={handleOverlayClick}>
        <div className="settings-modal">
          <div className="settings-header">
            <h2>Settings</h2>
            <button className="settings-close-btn" onClick={onClose}>x</button>
          </div>
          <div className="settings-body">
            <div className="settings-section">
              <label>Theme</label>
              <div className="settings-theme-toggle">
                <button
                  className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => onThemeChange('dark')}
                >
                  <Moon size={14} />
                  Dark
                </button>
                <button
                  className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => onThemeChange('light')}
                >
                  <Sun size={14} />
                  Light
                </button>
              </div>
            </div>

            <div className="settings-section">
              <label>AI Provider</label>
              <select value={settings.provider} onChange={handleProviderChange}>
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {needsApiKey && (
              <div className="settings-section">
                <label>API Key</label>
                <input
                  type="password"
                  placeholder="Enter your API key"
                  value={settings.apiKey}
                  onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))}
                />
                <span className="settings-hint">Required for {PROVIDERS.find((p) => p.value === settings.provider)?.label}</span>
              </div>
            )}

            {needsBaseUrl && (
              <div className="settings-section">
                <label>Base URL</label>
                <input
                  type="text"
                  placeholder="https://api.example.com/v1"
                  value={settings.baseUrl}
                  onChange={(e) => setSettings((s) => ({ ...s, baseUrl: e.target.value }))}
                />
                <span className="settings-hint">API endpoint URL</span>
              </div>
            )}

            <div className="settings-section">
              <label>Model</label>
              {models.length > 0 ? (
                <select
                  value={settings.model}
                  onChange={(e) => setSettings((s) => ({ ...s, model: e.target.value }))}
                >
                  {models.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Enter model name"
                  value={settings.model}
                  onChange={(e) => setSettings((s) => ({ ...s, model: e.target.value }))}
                />
              )}
            </div>
          </div>
          <div className="settings-footer">
            <button className="settings-btn settings-btn-cancel" onClick={onClose}>Cancel</button>
            <button className="settings-btn settings-btn-save" onClick={handleSave}>Save Settings</button>
          </div>
        </div>
      </div>
      {showToast && <div className="settings-saved-toast">Settings saved successfully</div>}
    </>
  );
}
