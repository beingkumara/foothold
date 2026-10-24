import { useEffect, useReducer } from 'react';
import { loadState, saveState } from '../lib/storage';
import { reducer, type Action, type AppState } from '../state/tasks';

export function useAppStore(): readonly [AppState, (action: Action) => void] {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  useEffect(() => {
    saveState(state);
  }, [state]);
  return [state, dispatch] as const;
}
