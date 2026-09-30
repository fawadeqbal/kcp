/**
 * The part of the loop guard that runs in the preview page. Kept apart from
 * loop-guard.ts so the page doesn't load the JavaScript parser.
 */

/** Name of the guard function in the preview page (installed by installLoopGuard). */
export const LOOP_GUARD = '__kcpLoopGuard';
/** Message of the error the guard throws; the sandbox turns it into a friendly note. */
export const LOOP_LIMIT_ERROR = 'KCP_LOOP_LIMIT';

/**
 * Installs the guard function on the page's window. Loops share a time budget of
 * `limitMs` per task (a script, a timer callback, an event handler): a short loop
 * that an animation runs every frame starts afresh each time, while one that
 * freezes the page is stopped. Once the budget is spent, every guard call throws
 * until the task ends, so catching the error in an outer loop doesn't help.
 */
export function installLoopGuard(target: object, limitMs = 1500): void {
  // Taken now, before the student's code runs and could replace setTimeout.
  const later: (callback: () => void, ms: number) => unknown =
    (target as { setTimeout?: typeof setTimeout }).setTimeout?.bind(target) ?? setTimeout;
  let taskStart = 0;
  let spent = false;
  const endOfTask = () => {
    taskStart = 0;
    spent = false;
  };
  Object.defineProperty(target, LOOP_GUARD, {
    configurable: false,
    writable: false,
    value: () => {
      if (spent) throw new Error(LOOP_LIMIT_ERROR);
      const now = Date.now();
      if (taskStart === 0) {
        // A timer only runs once the current task (and its promise callbacks) is over.
        taskStart = now;
        later(endOfTask, 0);
      } else if (now - taskStart > limitMs) {
        spent = true;
        throw new Error(LOOP_LIMIT_ERROR);
      }
    },
  });
}
