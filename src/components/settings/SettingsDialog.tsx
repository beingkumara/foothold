import { useRef, useState, type ChangeEvent } from 'react';
import { CLAUDE_MODEL, looksLikeClaudeKey, testClaudeKey, type KeyCheck } from '../../lib/ai';
import { parseImport, serializeExport } from '../../lib/storage';
import { TEXT_SCALES, type Settings } from '../../state/settings';
import type { AppState } from '../../state/tasks';
import { useAnnounce } from '../../hooks/useAnnouncer';
import { Dialog } from '../ui/Dialog';
import './settings.css';

interface SettingsDialogProps {
  open: boolean;
  settings: Settings;
  state: AppState;
  onChange: (patch: Partial<Settings>) => void;
  onReplaceState: (state: AppState) => void;
  onClose: () => void;
}

const THEMES: ReadonlyArray<{ value: Settings['theme']; label: string }> = [
  { value: 'system', label: 'Match my device' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const SCALE_LABEL: Record<number, string> = { 1: 'Standard', 1.15: 'Large', 1.3: 'Larger', 1.5: 'Largest' };

export function SettingsDialog({ open, settings, state, onChange, onReplaceState, onClose }: SettingsDialogProps) {
  const announce = useAnnounce();
  const [keyDraft, setKeyDraft] = useState(settings.claudeKey);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [keyCheck, setKeyCheck] = useState<KeyCheck | null>(null);
  const [testing, setTesting] = useState(false);

  const runKeyTest = async () => {
    if (!looksLikeClaudeKey(keyDraft)) {
      setKeyError('That does not look like an Anthropic key (it should start with sk-ant-).');
      return;
    }
    setKeyError(null);
    setTesting(true);
    setKeyCheck(null);
    const result = await testClaudeKey(keyDraft);
    setTesting(false);
    setKeyCheck(result);
    if (result.ok) onChange({ claudeKey: keyDraft.trim() });
  };
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const wipeRef = useRef<HTMLButtonElement>(null);
  const closeWipe = () => {
    setConfirmWipe(false);
    requestAnimationFrame(() => wipeRef.current?.focus());
  };

  const saveKey = () => {
    if (keyDraft.trim() && !looksLikeClaudeKey(keyDraft)) {
      setKeyError('That does not look like an Anthropic key (it should start with sk-ant-).');
      return;
    }
    setKeyError(null);
    onChange({ claudeKey: keyDraft.trim() });
    announce(keyDraft.trim() ? 'Claude key saved on this device.' : 'Claude key removed.');
  };

  const exportData = () => {
    const blob = new Blob([serializeExport(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `foothold-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    announce('Backup downloaded.');
  };

  const importData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const result = parseImport(await file.text());
    if (!result.ok) {
      setImportError(result.error);
      return;
    }
    setImportError(null);
    onReplaceState(result.state);
    announce(`Restored ${result.state.tasks.length} plans from backup.`);
  };

  return (
    <Dialog open={open} title="Make it yours" onClose={onClose}>
      <div className="settings">
        <fieldset className="settings__group">
          <legend>Theme</legend>
          {THEMES.map((t) => (
            <label key={t.value} className="settings__choice">
              <input type="radio" name="theme" checked={settings.theme === t.value} onChange={() => onChange({ theme: t.value })} />
              {t.label}
            </label>
          ))}
        </fieldset>

        <fieldset className="settings__group">
          <legend>Text size</legend>
          {TEXT_SCALES.map((scale) => (
            <label key={scale} className="settings__choice">
              <input type="radio" name="scale" checked={settings.textScale === scale} onChange={() => onChange({ textScale: scale })} />
              <span style={{ fontSize: `${scale}em` }}>{SCALE_LABEL[scale]}</span>
            </label>
          ))}
        </fieldset>

        <fieldset className="settings__group">
          <legend>Comfort</legend>
          <Toggle label="High contrast" hint="Pure black and white, thicker borders, no texture." checked={settings.highContrast} onChange={(v) => onChange({ highContrast: v })} />
          <Toggle label="Reading comfort spacing" hint="More space between letters, words and lines. Helps many dyslexic readers." checked={settings.comfortSpacing} onChange={(v) => onChange({ comfortSpacing: v })} />
          <Toggle label="Reduce motion" hint="Turns off animations. Also follows your device setting." checked={settings.reduceMotion} onChange={(v) => onChange({ reduceMotion: v })} />
          <Toggle label="Single-key shortcuts" hint="F, D, S, N, R, / and ?. Turn off if you use speech or switch control." checked={settings.shortcuts} onChange={(v) => onChange({ shortcuts: v })} />
          <Toggle label="Gentle chime" hint="A soft sound when your planned focus time is up." checked={settings.sound} onChange={(v) => onChange({ sound: v })} />
        </fieldset>

        <fieldset className="settings__group">
          <legend>Smarter breakdowns (optional)</legend>
          <p className="settings__hint">
            Foothold works fully offline. Add your own Anthropic API key to have {CLAUDE_MODEL} write custom steps. The key is stored
            only in this browser and sent only to api.anthropic.com.
          </p>
          <label htmlFor="claude-key" className="settings__label">
            Anthropic API key
          </label>
          <div className="settings__row">
            <input
              id="claude-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              className="settings__input"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              aria-invalid={keyError !== null}
              aria-describedby={keyError ? 'claude-key-error' : undefined}
              placeholder="sk-ant-…"
            />
            <button type="button" className="btn" onClick={saveKey}>
              Save key
            </button>
            <button type="button" className="btn btn--quiet" onClick={() => void runKeyTest()} disabled={testing || !keyDraft.trim()}>
              {testing ? 'Testing…' : 'Test key'}
            </button>
          </div>
          <p className={`settings__keycheck ${keyCheck?.ok ? 'is-ok' : keyCheck ? 'is-bad' : ''}`} role="status">
            {keyCheck ? (keyCheck.ok ? `✓ ${keyCheck.message}` : `✗ ${keyCheck.message}. Plans will keep using offline steps.`) : ''}
          </p>
          {keyError && (
            <p id="claude-key-error" className="settings__error" role="alert">
              {keyError}
            </p>
          )}
        </fieldset>

        <fieldset className="settings__group">
          <legend>Your data</legend>
          <p className="settings__hint">No account, no tracking. Everything stays on this device, except task titles sent to Anthropic if you add a Claude key.</p>
          <div className="settings__row">
            <button type="button" className="btn" onClick={exportData}>
              Download backup
            </button>
            <label className="btn settings__file">
              Restore backup
              <input type="file" accept="application/json,.json" onChange={(e) => void importData(e)} />
            </label>
          </div>
          {importError && (
            <p className="settings__error" role="alert">
              {importError}
            </p>
          )}
          {confirmWipe ? (
            <div className="settings__row" role="group" aria-label="Confirm deleting everything">
              <button
                type="button"
                className="btn settings__danger"
                onClick={() => {
                  onReplaceState({ tasks: [], wins: [], skipped: [] });
                  closeWipe();
                  announce('All plans and wins deleted.');
                }}
              >
                Yes, delete everything
              </button>
              <button type="button" className="btn btn--quiet" onClick={closeWipe} autoFocus>
                Cancel
              </button>
            </div>
          ) : (
            <button ref={wipeRef} type="button" className="btn btn--quiet settings__danger" onClick={() => setConfirmWipe(true)}>
              Delete all my data…
            </button>
          )}
        </fieldset>
      </div>
    </Dialog>
  );
}

interface ToggleProps {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function Toggle({ label, hint, checked, onChange }: ToggleProps) {
  return (
    <label className="settings__toggle">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="settings__toggle-label">{label}</span>
        <span className="settings__hint">{hint}</span>
      </span>
    </label>
  );
}
