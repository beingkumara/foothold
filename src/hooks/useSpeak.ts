import { useCallback } from 'react';

export const canSpeak = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window;

/** Read text aloud with the device voice — helpful for low vision and reading fatigue. */
export function useSpeak(): (text: string) => void {
  return useCallback((text: string) => {
    if (!canSpeak()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }, []);
}
