import type { Energy, StepDraft } from './types';

/**
 * Offline task breakdown. Works with no network and no API key, so the core
 * experience never depends on a third party. Every plan opens with a
 * "foothold": a step small enough (≤ 2 min, low energy) to start right now.
 */

type Template = {
  readonly match: RegExp;
  readonly steps: (subject: string) => readonly StepDraft[];
};

const step = (text: string, minutes: number, energy: Energy): StepDraft => ({ text, minutes, energy });

const TEMPLATES: readonly Template[] = [
  {
    match: /\b(email|e-mail|reply|message|text|dm|respond)\b/i,
    steps: (s) => [
      step(`Open the thread for "${s}" — just read it, no replying yet`, 2, 'low'),
      step('Write one sentence saying what you need or want to say', 3, 'low'),
      step('Add any details, dates or links they need', 5, 'medium'),
      step('Check the subject line and who it goes to', 1, 'low'),
      step('Hit send — good enough beats perfect', 1, 'low'),
    ],
  },
  {
    match: /\b(essay|write|writing|report|article|blog|thesis|paper|draft|cover letter)\b/i,
    steps: (s) => [
      step(`Open a blank document and title it "${s}"`, 1, 'low'),
      step('Dump every idea as messy bullet points for 5 minutes', 5, 'medium'),
      step('Group the bullets into a rough outline of 3–5 parts', 10, 'medium'),
      step('Write the ugliest possible first draft of one part', 20, 'high'),
      step('Fill in the remaining parts, one at a time', 30, 'high'),
      step('Read it once out loud and fix what trips you up', 15, 'medium'),
    ],
  },
  {
    match: /\b(study|revise|revision|exam|test|quiz|homework|assignment|learn|read)\b/i,
    steps: (s) => [
      step(`Put the materials for "${s}" on your desk or screen`, 2, 'low'),
      step('Skim the headings and pick ONE topic to start with', 3, 'low'),
      step('Study that one topic for a single 15-minute block', 15, 'medium'),
      step('Close the notes and write down what you remember', 5, 'medium'),
      step('Check what you missed and mark it for next time', 5, 'low'),
    ],
  },
  {
    match: /\b(clean|tidy|declutter|organi[sz]e|vacuum|hoover|dishes|kitchen|bathroom|room)\b/i,
    steps: (s) => [
      step('Set a timer and grab a bag for trash', 1, 'low'),
      step('Pick up only the trash you can see', 5, 'low'),
      step('Put the dishes and cups in the sink or dishwasher', 5, 'low'),
      step('Clear one surface completely', 10, 'medium'),
      step(`Do the rest of "${s}" in one 15-minute sweep, then stop`, 15, 'high'),
    ],
  },
  {
    match: /\b(laundry|washing|clothes|ironing|fold)\b/i,
    steps: () => [
      step('Carry the laundry basket to the machine', 1, 'low'),
      step('Load the machine and press start', 3, 'low'),
      step('Set a phone reminder for when it finishes', 1, 'low'),
      step('Move everything to dry', 5, 'medium'),
      step('Fold or hang just the things you need this week', 10, 'medium'),
    ],
  },
  {
    match: /\b(call|phone|ring|appointment|book|booking|schedule|dentist|doctor|gp)\b/i,
    steps: (s) => [
      step(`Find the phone number or website for "${s}"`, 2, 'low'),
      step('Write down the one thing you need to ask, plus your dates', 3, 'low'),
      step('Make the call or open the booking page', 5, 'high'),
      step('Put the result in your calendar straight away', 2, 'low'),
    ],
  },
  {
    match: /\b(shop|shopping|groceries|grocery|buy|order|pick up)\b/i,
    steps: (s) => [
      step(`Open a note called "${s}"`, 1, 'low'),
      step('Check the fridge and cupboards and list what is missing', 5, 'low'),
      step('Order online or head out with the list', 20, 'medium'),
      step('Put everything away as soon as you are back', 10, 'medium'),
    ],
  },
  {
    match: /\b(tax|taxes|form|apply|application|passport|visa|bill|bills|pay|invoice|bank|insurance|admin)\b/i,
    steps: (s) => [
      step(`Find the website or envelope for "${s}" and open it`, 2, 'low'),
      step('List the documents or numbers it asks for', 5, 'low'),
      step('Gather those documents into one folder', 10, 'medium'),
      step('Fill in the easy fields first', 10, 'medium'),
      step('Do the tricky fields, or write down the question to ask someone', 15, 'high'),
      step('Submit and save the confirmation', 3, 'low'),
    ],
  },
  {
    match: /\b(code|bug|fix|deploy|feature|refactor|pr|pull request|debug)\b/i,
    steps: (s) => [
      step(`Open the project for "${s}" and run it once`, 2, 'low'),
      step('Write down in one line what "done" looks like', 2, 'low'),
      step('Find the file where the change belongs', 5, 'medium'),
      step('Make the smallest change that moves it forward', 20, 'high'),
      step('Test it, then commit with a clear message', 10, 'medium'),
    ],
  },
  {
    match: /\b(exercise|workout|gym|run|walk|yoga|stretch)\b/i,
    steps: () => [
      step('Put on the shoes or clothes for it', 2, 'low'),
      step('Fill a water bottle', 1, 'low'),
      step('Do just 5 minutes — you are allowed to stop after', 5, 'medium'),
      step('Keep going if it feels okay', 20, 'high'),
    ],
  },
  {
    match: /\b(cook|dinner|lunch|breakfast|meal|bake)\b/i,
    steps: (s) => [
      step(`Decide what "${s}" will be — simplest option wins`, 2, 'low'),
      step('Take out every ingredient and tool you need', 5, 'low'),
      step('Prep: chop, measure, preheat', 10, 'medium'),
      step('Cook it', 20, 'medium'),
      step('Clear up the worst of it while it is still warm', 5, 'medium'),
    ],
  },
];

const genericSteps = (s: string): readonly StepDraft[] => [
  step(`Write down what "done" looks like for ${s}`, 2, 'low'),
  step(`Gather anything you need for ${s} in one place`, 5, 'low'),
  step(`Spend 10 minutes on the easiest part of ${s}`, 10, 'medium'),
  step(`Work through the hardest part of ${s}`, 20, 'high'),
  step('Check it over and call it done', 5, 'low'),
];

const cleanSubject = (title: string): string =>
  title
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/, '');

export function breakDown(title: string): readonly StepDraft[] {
  const subject = cleanSubject(title);
  if (subject.length === 0) {
    throw new Error('Task title is empty');
  }
  const template = TEMPLATES.find((t) => t.match.test(subject));
  return template ? template.steps(subject) : genericSteps(subject.charAt(0).toLowerCase() + subject.slice(1));
}

/** "I'm stuck": replace one step with smaller, gentler ones that end in the original step. */
export function shrinkStep(original: StepDraft): readonly StepDraft[] {
  const full = original.text.charAt(0).toLowerCase() + original.text.slice(1);
  // Shrinking a shrunk step nests its text; cap it so repeated "I'm stuck" stays readable.
  const lower = full.length > 80 ? `${full.slice(0, 77).trimEnd()}…` : full;
  const rest = Math.max(1, Math.round(original.minutes / 2));
  return [
    step('Take three slow breaths and get a drink of water', 1, 'low'),
    step(`Just look at what "${lower}" involves for 2 minutes — no doing`, 2, 'low'),
    step(`Do the very first, smallest piece of: ${lower}`, Math.min(5, rest), 'low'),
    step(`Keep going on ${lower} for ${rest} minutes, then you may stop`, rest, original.energy === 'high' ? 'medium' : original.energy),
  ];
}

/** Turn a messy brain dump into separate task titles. */
export function splitCompound(dump: string): readonly string[] {
  return dump
    .split(/\n|;|\band then\b/i)
    .map((part) => part.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim())
    .filter((part) => part.length > 0);
}
