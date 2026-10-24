import { AnimatePresence, motion } from 'motion/react';
import type { Task } from '../../lib/types';
import { TaskCard } from './TaskCard';
import './task-list.css';

interface TaskListProps {
  tasks: readonly Task[];
  onToggleStep: (taskId: string, stepId: string, done: boolean) => void;
  onToggleToday: (taskId: string) => void;
  onRemove: (taskId: string) => void;
}

export function TaskList({ tasks, onToggleStep, onToggleToday, onRemove }: TaskListProps) {
  const open = tasks.filter((t) => t.doneAt === undefined);
  const finished = tasks.filter((t) => t.doneAt !== undefined);

  const render = (list: readonly Task[]) => (
    <ul className="task-list" role="list">
      <AnimatePresence initial={false}>
      {list.map((task, i) => (
        <motion.li
          key={task.id}
          layout
          initial={{ opacity: 0, y: 24, rotate: i % 2 ? 1.5 : -1.5 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        >
          <TaskCard
            task={task}
            onToggleStep={(stepId, done) => onToggleStep(task.id, stepId, done)}
            onToggleToday={() => onToggleToday(task.id)}
            onRemove={() => onRemove(task.id)}
          />
        </motion.li>
      ))}
      </AnimatePresence>
    </ul>
  );

  return (
    <div className="task-groups">
      {open.length > 0 ? render(open) : <p className="task-list__empty">No open plans.</p>}
      {finished.length > 0 && (
        <details className="task-finished">
          <summary>Finished ({finished.length})</summary>
          {render(finished)}
        </details>
      )}
    </div>
  );
}
