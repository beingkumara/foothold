import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CaptureBar } from './components/capture/CaptureBar';
import { EnergyPicker } from './components/energy/EnergyPicker';
import { FocusMode } from './components/focus/FocusMode';
import { NextStep, type ExitIntent } from './components/next-step/NextStep';
import { HelpDialog } from './components/settings/HelpDialog';
import { SettingsDialog } from './components/settings/SettingsDialog';
import { TaskList } from './components/task-list/TaskList';
import { Icon } from './components/ui/Icon';
import { Scribble } from './components/ui/Scribble';
import { WinsLog } from './components/wins/WinsLog';
import { useAnnounce } from './hooks/useAnnouncer';
import { useAppStore } from './hooks/useAppStore';
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion';
import { useSettings } from './hooks/useSettings';
import { useShortcuts } from './hooks/useShortcuts';
import { canSpeak, useSpeak } from './hooks/useSpeak';
import { shrinkStep } from './lib/breakdown';
import { planFromDump } from './lib/plan';
import { ENERGY_LABEL, ENERGY_LEVELS, type Energy } from './lib/types';
import { MAX_STEPS, pickNextStep } from './state/tasks';
import './app.css';

const CHEERS = ['Nice.', 'That counts.', 'One down.', 'Look at you go.', 'Done is done.'] as const;
const CHEER_MS = 1400;

type Panel = 'none' | 'settings' | 'help' | 'focus';

export function App() {
  const [state, dispatch] = useAppStore();
  const [settings, updateSettings] = useSettings();
  const [panel, setPanel] = useState<Panel>('none');
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [cheer, setCheer] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [exitIntent, setExitIntent] = useState<ExitIntent>('swap');
  const [burstKey, setBurstKey] = useState(0);
  const osReducedMotion = usePrefersReducedMotion();
  const captureRef = useRef<HTMLTextAreaElement>(null);
  const announce = useAnnounce();
  const speak = useSpeak();

  const energy = settings.energy;
  const pick = useMemo(() => pickNextStep(state, energy), [state, energy]);
  const openTasks = state.tasks.filter((t) => t.doneAt === undefined);
  const stepNumber = pick ? pick.task.steps.findIndex((s) => s.id === pick.step.id) + 1 : 0;
  const remaining = openTasks.reduce((n, t) => n + t.steps.filter((s) => !s.done).length, 0);
  const reduceMotion = settings.reduceMotion || osReducedMotion;

  // When the hero empties out, its buttons vanish; keep keyboard users anchored.
  const hadPick = useRef(pick !== null);
  useEffect(() => {
    if (hadPick.current && pick === null) document.getElementById('next-heading')?.focus();
    hadPick.current = pick !== null;
  }, [pick]);

  // Buttons keep focus when the step changes, so tell screen reader users what the new step is.
  const prevStepId = useRef(pick?.step.id);
  useEffect(() => {
    if (pick && prevStepId.current && pick.step.id !== prevStepId.current) announce(`Next: ${pick.step.text}`);
    prevStepId.current = pick?.step.id;
  }, [pick, announce]);

  useEffect(() => {
    if (!cheer) return;
    const t = setTimeout(() => setCheer(null), CHEER_MS);
    return () => clearTimeout(t);
  }, [cheer]);

  const handleDump = useCallback(
    async (dump: string) => {
      setBusy(true);
      setNotice(null);
      try {
        const result = await planFromDump(dump, settings.aiKey);
        if (result.tasks.length === 0) {
          announce('I could not find a task in that. Try writing a few words.', 'assertive');
          return;
        }
        const now = Date.now();
        setExitIntent('swap');
        result.tasks.forEach((t) => dispatch({ type: 'addTask', title: t.title, steps: t.steps, source: t.source, now }));
        const summary =
          result.tasks.length === 1
            ? `Planned “${result.tasks[0].title}” as ${result.tasks[0].steps.length} small steps.`
            : `Planned ${result.tasks.length} tasks.`;
        if (result.fallbackReason) setNotice(`Used offline steps because ${result.fallbackReason}.`);
        announce(result.fallbackReason ? `${summary} Used offline steps because ${result.fallbackReason}.` : summary);
      } catch (error: unknown) {
        announce(error instanceof Error ? error.message : 'Could not plan that. Try rewording it.', 'assertive');
      } finally {
        setBusy(false);
      }
    },
    [settings.aiKey, dispatch, announce],
  );

  const completeCurrent = useCallback(() => {
    if (!pick) return;
    setExitIntent('done');
    setBurstKey((k) => k + 1);
    dispatch({ type: 'completeStep', taskId: pick.task.id, stepId: pick.step.id, now: Date.now() });
    const line = CHEERS[Math.floor(Math.random() * CHEERS.length)];
    setCheer(line);
    const last = pick.task.steps.filter((s) => !s.done).length === 1;
    announce(last ? `${line} You finished “${pick.task.title}”.` : `${line} Marked done: ${pick.step.text}`);
  }, [pick, dispatch, announce]);

  const shrinkCurrent = useCallback(() => {
    if (!pick) return;
    if (pick.task.steps.length >= MAX_STEPS - 3) {
      announce('This plan is already in very small pieces. Try "Not now", or rest for a bit.', 'assertive');
      return;
    }
    const smaller = shrinkStep(pick.step);
    setExitIntent('stuck');
    dispatch({ type: 'replaceStep', taskId: pick.task.id, stepId: pick.step.id, steps: smaller });
    announce('Made it smaller.');
  }, [pick, dispatch, announce]);

  const skipCurrent = useCallback(() => {
    if (!pick) return;
    setExitIntent('skip');
    dispatch({ type: 'skipStep', stepId: pick.step.id });
    announce('Set aside for now.');
  }, [pick, dispatch, announce]);

  const setEnergy = useCallback(
    (level: Energy) => {
      setExitIntent('swap');
      updateSettings({ energy: level });
      dispatch({ type: 'clearSkips' });
      announce(`Energy set to ${ENERGY_LABEL[level].toLowerCase()}.`);
    },
    [updateSettings, dispatch, announce],
  );

  const readAloud = useCallback(() => {
    if (pick) speak(`${pick.step.text}. About ${pick.step.minutes} minutes.`);
  }, [pick, speak]);

  useShortcuts(
    {
      f: () => pick && setPanel('focus'),
      d: completeCurrent,
      s: shrinkCurrent,
      n: skipCurrent,
      r: readAloud,
      '1': () => setEnergy(ENERGY_LEVELS[0]),
      '2': () => setEnergy(ENERGY_LEVELS[1]),
      '3': () => setEnergy(ENERGY_LEVELS[2]),
      '/': () => captureRef.current?.focus(),
      '?': () => setPanel('help'),
    },
    settings.shortcuts,
  );

  const closePanel = useCallback(() => setPanel('none'), []);

  // Finishing or reopening a plan moves its card between groups; keep focus and say why.
  const toggleListStep = (taskId: string, stepId: string, done: boolean) => {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const finishing = done && task.steps.filter((s) => !s.done).length === 1;
    const reopening = !done && task.doneAt !== undefined;
    dispatch(done ? { type: 'completeStep', taskId, stepId, now: Date.now() } : { type: 'uncompleteStep', taskId, stepId });
    if (finishing || reopening) {
      announce(finishing ? `Finished “${task.title}”. Moved to Finished.` : `Reopened “${task.title}”.`);
      requestAnimationFrame(() => document.getElementById('all-heading')?.focus());
    }
  };

  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'never'}>
      <a className="skip-link" href="#main">
        Skip to your next step
      </a>
      <header className="masthead">
        <div className="masthead__brand">
          <span className="masthead__mark" aria-hidden="true">
            <svg viewBox="0 0 64 64" width="30" height="30">
              <path d="M10 42c7-12 12-12 17-5s10 7 17-7l8-8" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="masthead__words">
            <h1 className="masthead__title">Foothold</h1>
            <Scribble className="masthead__scribble" delay={0.5} />
            <p className="masthead__tagline">Start anything. One small step at a time.</p>
          </div>
        </div>
        <nav className="masthead__nav" aria-label="App">
          <button type="button" className="btn btn--quiet" onClick={() => setPanel('help')}>
            <Icon name="help" />
            Help
          </button>
          <button type="button" className="btn" onClick={() => setPanel('settings')}>
            <Icon name="gear" />
            Settings
          </button>
        </nav>
      </header>

      <main id="main" className="layout" tabIndex={-1}>
        <div className="layout__primary">
          <EnergyPicker value={energy} onChange={setEnergy} />
          <div className="layout__hero">
            <NextStep
              pick={pick}
              energy={energy}
              stepNumber={stepNumber}
              stepTotal={pick?.task.steps.length ?? 0}
              remaining={remaining}
              exitIntent={exitIntent}
              burstKey={burstKey}
              reduceMotion={reduceMotion}
              hasOpenTasks={state.tasks.length > 0}
              hasSkipped={state.skipped.length > 0 && openTasks.length > 0}
              shortcuts={settings.shortcuts}
              canSpeak={canSpeak()}
              onDone={completeCurrent}
              onSkip={skipCurrent}
              onStuck={shrinkCurrent}
              onFocus={() => setPanel('focus')}
              onSpeak={readAloud}
              onRestoreSkipped={() => dispatch({ type: 'clearSkips' })}
            />
            <AnimatePresence>
              {cheer && (
                <motion.p
                  key={burstKey}
                  className="cheer"
                  aria-hidden="true"
                  initial={{ scale: 0, rotate: -28 }}
                  animate={{ scale: 1, rotate: -7, transition: { type: 'spring', stiffness: 500, damping: 14 } }}
                  exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.2 } }}
                >
                  {cheer}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        <aside className="layout__side" aria-label="Capture and progress">
          <div className="layout__capture">
            <CaptureBar busy={busy} showExamples={state.tasks.length === 0} onSubmit={handleDump} inputRef={captureRef} />
            {notice && <p className="notice">{notice}</p>}
          </div>
          <WinsLog wins={state.wins} now={Date.now()} />
        </aside>

        {state.tasks.length > 0 && (
          <section className="layout__all" aria-labelledby="all-heading">
            <div className="layout__all-head">
              <h2 id="all-heading" tabIndex={-1}>All plans</h2>
              <button
                type="button"
                className="btn"
                aria-expanded={showAll}
                aria-controls="all-plans"
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll ? 'Hide the list' : `See everything (${openTasks.length} open)`}
              </button>
            </div>
            <p className="layout__all-note">Hidden by default, so the one step above is all you have to think about.</p>
            <div id="all-plans" hidden={!showAll}>
              <TaskList
                tasks={state.tasks}
                onToggleStep={toggleListStep}
                onToggleToday={(taskId) => dispatch({ type: 'toggleToday', taskId })}
                onRemove={(taskId) => {
                  dispatch({ type: 'removeTask', taskId });
                  announce('Plan removed.');
                  requestAnimationFrame(() =>
                    (document.getElementById('all-heading') ?? document.getElementById('next-heading'))?.focus(),
                  );
                }}
              />
            </div>
          </section>
        )}
      </main>

      <footer className="colophon">
        <p>
          Your plans stay on this device. No accounts, no tracking. (If you add your own free Groq key, only the task titles you plan are
          sent to Groq.) Built for brains that find starting hard.
        </p>
      </footer>

      <FocusMode
        open={panel === 'focus'}
        taskTitle={pick?.task.title ?? ''}
        step={pick?.step ?? null}
        sound={settings.sound}
        onDone={() => {
          completeCurrent();
          setPanel('none');
        }}
        onStuck={shrinkCurrent}
        onClose={closePanel}
      />
      <SettingsDialog
        open={panel === 'settings'}
        settings={settings}
        state={state}
        onChange={updateSettings}
        onReplaceState={(next) => dispatch({ type: 'replaceAll', state: next })}
        onClose={closePanel}
      />
      <HelpDialog open={panel === 'help'} onClose={closePanel} />
    </MotionConfig>
  );
}
