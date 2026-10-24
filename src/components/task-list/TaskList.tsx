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
      {list.map((task) => (
        <li key={task.id}>
          <TaskCard
            task={task}
            onToggleStep={(stepId, done) => onToggleStep(task.id, stepId, done)}
            onToggleToday={() => onToggleToday(task.id)}
            onRemove={() => onRemove(task.id)}
          />
        </li>
      ))}
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
