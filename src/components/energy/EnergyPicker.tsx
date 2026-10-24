import { ENERGY_LABEL, ENERGY_LEVELS, type Energy } from '../../lib/types';
import './energy.css';

interface EnergyPickerProps {
  value: Energy;
  onChange: (energy: Energy) => void;
}

const HINT: Record<Energy, string> = {
  low: 'Only tiny, gentle steps',
  medium: 'Steps that need some focus',
  high: 'Anything, including the hard parts',
};

/** Native radios: arrow keys, labels and screen reader semantics come for free. */
export function EnergyPicker({ value, onChange }: EnergyPickerProps) {
  return (
    <fieldset className="energy-picker">
      <legend className="energy-picker__legend">How much energy do you have right now?</legend>
      <div className="energy-picker__options">
        {ENERGY_LEVELS.map((level, index) => (
          <label key={level} className="energy-picker__option" data-energy={level}>
            <input
              type="radio"
              name="energy"
              value={level}
              checked={value === level}
              onChange={() => onChange(level)}
              aria-describedby={`energy-hint-${level}`}
            />
            <span className="energy-picker__meter" aria-hidden="true">
              {ENERGY_LEVELS.map((_, bar) => (
                <span key={bar} className={bar <= index ? 'is-filled' : undefined} />
              ))}
            </span>
            <span className="energy-picker__label">{ENERGY_LABEL[level]}</span>
            <span id={`energy-hint-${level}`} className="energy-picker__hint">
              {HINT[level]}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
