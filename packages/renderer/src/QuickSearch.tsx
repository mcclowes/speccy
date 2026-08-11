/**
 * ---
 * purpose: Renders searchable, keyboard-navigable navigation across API pages, tags, endpoints, and components.
 * related:
 *   - ./Speccy.tsx - Builds route-aware search results and controls dialog visibility.
 * ---
 */

import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { WebhookIcon } from './WebhookIcon';
import styles from './QuickSearch.module.css';

export type SearchResult = {
  id: string;
  group: 'Pages' | 'Tags' | 'Endpoints' | 'Reference';
  label: string;
  detail?: string;
  webhook?: boolean;
  terms: string[];
  navigate: () => void;
};

export function QuickSearch({
  results,
  onClose,
}: {
  results: SearchResult[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedQuery = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      results.filter(
        (result) =>
          !normalizedQuery ||
          result.terms.some((term) =>
            term.toLowerCase().includes(normalizedQuery),
          ),
      ),
    [normalizedQuery, results],
  );
  const grouped = matches.reduce<
    Array<[SearchResult['group'], SearchResult[]]>
  >((groups, result) => {
    const current = groups.at(-1);
    if (current?.[0] === result.group) current[1].push(result);
    else groups.push([result.group, [result]]);
    return groups;
  }, []);

  useEffect(() => setActiveIndex(0), [normalizedQuery]);

  useEffect(() => {
    const activeResult = matches[activeIndex];
    if (!activeResult) return;
    document
      .getElementById(`sp-search-result-${activeResult.id}`)
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, normalizedQuery]);

  function select(result?: SearchResult) {
    if (!result) return;
    result.navigate();
    onClose();
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) =>
        matches.length ? (index + 1) % matches.length : 0,
      );
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) =>
        matches.length ? (index - 1 + matches.length) % matches.length : 0,
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      select(matches[activeIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  }

  let resultIndex = 0;
  return (
    <div
      className={`sp-search-backdrop ${styles.backdrop}`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`sp-search-dialog ${styles.dialog}`}
        role="dialog"
        aria-modal="true"
        aria-label="Search API reference"
      >
        <div className={`sp-search-input ${styles.input}`}>
          <span aria-hidden="true">⌕</span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search endpoints, tags, and reference"
            aria-label="Search API reference"
            aria-controls="sp-search-results"
            aria-activedescendant={
              matches[activeIndex]
                ? `sp-search-result-${matches[activeIndex].id}`
                : undefined
            }
          />
          <kbd>Esc</kbd>
        </div>
        <div
          className={`sp-search-results ${styles.results}`}
          id="sp-search-results"
          role="listbox"
        >
          {grouped.map(([group, items]) => (
            <section
              className={`sp-search-group ${styles.group}`}
              aria-label={group}
              key={group}
            >
              <h2>{group}</h2>
              {items.map((result) => {
                const index = resultIndex++;
                return (
                  <button
                    id={`sp-search-result-${result.id}`}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={
                      index === activeIndex ? `is-active ${styles.active}` : ''
                    }
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => select(result)}
                    key={result.id}
                  >
                    <span>{result.label}</span>
                    {result.detail && (
                      <small>
                        {result.webhook && <WebhookIcon />} {result.detail}
                      </small>
                    )}
                  </button>
                );
              })}
            </section>
          ))}
          {matches.length === 0 && (
            <div className={`sp-search-empty ${styles.empty}`} role="status">
              No results for “{query}”.
            </div>
          )}
        </div>
        <div className={`sp-search-help ${styles.help}`}>
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> Navigate
          </span>
          <span>
            <kbd>↵</kbd> Open
          </span>
        </div>
      </div>
    </div>
  );
}
