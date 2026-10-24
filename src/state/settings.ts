import { z } from 'zod';
import { ENERGY_LEVELS } from '../lib/types';
import { readJson, writeJson } from '../lib/storage';

export const TEXT_SCALES = [1, 1.15, 1.3, 1.5] as const;

export const settingsSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).default('system'),
  highContrast: z.boolean().default(false),
  textScale: z.number().min(1).max(1.5).default(1),
  comfortSpacing: z.boolean().default(false),
  reduceMotion: z.boolean().default(false),
  shortcuts: z.boolean().default(true),
  sound: z.boolean().default(false),
  energy: z.enum(ENERGY_LEVELS).default('medium'),
  aiKey: z.string().max(300).default(''),
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = settingsSchema.parse({});

const SETTINGS_KEY = 'foothold:settings:v1';

export const loadSettings = (): Settings => readJson(SETTINGS_KEY, settingsSchema, DEFAULT_SETTINGS);
export const saveSettings = (settings: Settings): boolean => writeJson(SETTINGS_KEY, settings);
