export const formatMinutes = (minutes: number): string =>
  minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} min` : ''}`.trim();

export const formatClock = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

/** Spoken form for screen readers, e.g. "4 minutes 5 seconds". */
export const spokenDuration = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  const parts = [m ? `${m} minute${m === 1 ? '' : 's'}` : '', s || !m ? `${s} second${s === 1 ? '' : 's'}` : ''];
  return parts.filter(Boolean).join(' ');
};
