import { useCallback, useEffect, useRef, useState } from 'react';

interface RecognitionResultEvent {
  readonly results: ArrayLike<ArrayLike<{ readonly transcript: string }> & { readonly isFinal: boolean }>;
}

interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type RecognitionCtor = new () => Recognition;

const getRecognition = (): RecognitionCtor | undefined => {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

export interface SpeechInput {
  readonly supported: boolean;
  readonly listening: boolean;
  readonly error: string | null;
  start: () => void;
  stop: () => void;
}

const ERROR_TEXT: Record<string, string> = {
  'not-allowed': 'Microphone permission was blocked. You can still type.',
  'no-speech': "I didn't catch anything. Try again when you're ready.",
  network: 'Voice input needs a connection in this browser.',
};

/** Voice capture for people who find typing a barrier. Transcript is passed to onText. */
export function useSpeechInput(onText: (text: string) => void): SpeechInput {
  const Ctor = getRecognition();
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  useEffect(() => () => rec.current?.stop(), []);

  const start = useCallback(() => {
    if (!Ctor) return;
    setError(null);
    const r = new Ctor();
    r.lang = navigator.language || 'en-US';
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((res) => res[0]?.transcript ?? '')
        .join(' ')
        .trim();
      if (transcript) onTextRef.current(transcript);
    };
    r.onerror = (event) => setError(ERROR_TEXT[event.error] ?? 'Voice input stopped unexpectedly.');
    r.onend = () => setListening(false);
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setError('Voice input could not start.');
    }
  }, [Ctor]);

  const stop = useCallback(() => rec.current?.stop(), []);

  return { supported: Boolean(Ctor), listening, error, start, stop };
}
