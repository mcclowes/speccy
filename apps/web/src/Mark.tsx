/**
 * ---
 * purpose: Renders the Speccy brand mark used in the studio bar and on reference cards.
 * related:
 *   - ./App.tsx - Studio bar that shows the mark beside the wordmark.
 *   - ./HomeScreen.tsx - Cards and empty states that reuse the mark.
 * ---
 */

import { scoped } from './scoped';

export function Mark() {
  return (
    <span className={scoped('studio-mark')} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M3.5 9.5 5 7.75M20.5 9.5 19 7.75M9.5 11.5h5" />
        <circle cx="6.5" cy="13" r="3.5" />
        <circle cx="17.5" cy="13" r="3.5" />
      </svg>
    </span>
  );
}
