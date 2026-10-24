import { Dialog } from '../ui/Dialog';
import './settings.css';

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS: ReadonlyArray<[string, string]> = [
  ['F', 'Start focus on the current step'],
  ['D', 'Mark the current step done'],
  ['S', "I'm stuck — make the step smaller"],
  ['N', 'Not now — show a different step'],
  ['R', 'Read the step aloud'],
  ['1 / 2 / 3', 'Set energy: low / some / plenty'],
  ['/', 'Jump to the brain-dump box'],
  ['?', 'Open this help'],
];

export function HelpDialog({ open, onClose }: HelpDialogProps) {
  return (
    <Dialog open={open} title="How Foothold works" onClose={onClose}>
      <div className="settings">
        <ol className="help__steps">
          <li>
            <strong>Dump it.</strong> Type or say whatever is on your mind. Each line becomes a plan of small steps.
          </li>
          <li>
            <strong>Check in.</strong> Tell Foothold how much energy you have. It only shows steps that fit.
          </li>
          <li>
            <strong>Do one thing.</strong> You see one step at a time. Too big? Press “I'm stuck” and it gets smaller.
          </li>
        </ol>
        <section aria-labelledby="shortcuts-heading" className="settings__group">
          <h3 id="shortcuts-heading">Keyboard shortcuts</h3>
          <p className="settings__hint">They never fire while you type, and you can turn them off in settings.</p>
          <dl className="help__keys">
            {SHORTCUTS.map(([key, action]) => (
              <div key={key}>
                <dt>
                  <span className="kbd">{key}</span>
                </dt>
                <dd>{action}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </Dialog>
  );
}
