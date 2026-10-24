export const ENERGY_LEVELS = ['low', 'medium', 'high'] as const;
export type Energy = (typeof ENERGY_LEVELS)[number];

export const ENERGY_LABEL: Record<Energy, string> = {
  low: 'Running low',
  medium: 'Some energy',
  high: 'Plenty',
};

export interface StepDraft {
  readonly text: string;
  readonly minutes: number;
  readonly energy: Energy;
}

export interface Step extends StepDraft {
  readonly id: string;
  readonly done: boolean;
  readonly doneAt?: number;
}

export type StepSource = 'local' | 'ai';

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly steps: readonly Step[];
  readonly createdAt: number;
  readonly today: boolean;
  readonly source: StepSource;
  readonly doneAt?: number;
}

export interface Win {
  readonly id: string;
  readonly text: string;
  readonly at: number;
}

export const energyRank = (energy: Energy): number => ENERGY_LEVELS.indexOf(energy);
