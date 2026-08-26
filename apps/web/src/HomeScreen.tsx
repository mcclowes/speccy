/**
 * ---
 * purpose: Renders the studio home screen: discovered repositories, the public API catalog, and recent references.
 * related:
 *   - ./App.tsx - Owns the state and actions this screen reports back to.
 *   - ./apiCatalog.ts - Supplies curated public specifications for the catalog.
 *   - ./recentReferences.ts - Shape of the recent references listed here.
 *   - ./Mark.tsx - Brand mark shown on each card.
 *   - ./scoped.ts - Class-name scoping shared with the studio shell.
 * ---
 */

import type { CSSProperties } from 'react';
import { API_CATALOG, type CatalogApi } from './apiCatalog';
import type { RecentReference } from './recentReferences';
import { Mark } from './Mark';
import { scoped } from './scoped';

function RecentCard({
  name,
  meta,
  onClick,
}: {
  name: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      className={scoped('studio-recent-card')}
      type="button"
      onClick={onClick}
    >
      <span className={scoped('studio-recent-icon')}>
        <Mark />
      </span>
      <span className={scoped('studio-recent-name')}>{name}</span>
      <span className={scoped('studio-recent-meta')}>{meta}</span>
      <span className={scoped('studio-recent-arrow')} aria-hidden="true">
        ↗
      </span>
    </button>
  );
}

function DiscoveredRepositories({
  repositories,
}: {
  repositories: DiscoveredRepository[];
}) {
  if (repositories.length === 0) return null;
  return (
    <section
      className={scoped('studio-recents')}
      aria-labelledby="discovered-heading"
    >
      <div className={scoped('studio-section-heading')}>
        <div>
          <span className={scoped('studio-eyebrow')}>Found on this Mac</span>
          <h2 id="discovered-heading">OpenAPI repositories</h2>
        </div>
        <span>
          {repositories.length}{' '}
          {repositories.length === 1 ? 'repository' : 'repositories'}
        </span>
      </div>
      <div className={scoped('studio-recent-grid')}>
        {repositories.map((repository) => (
          <RecentCard
            key={repository.path}
            name={repository.name}
            meta={`${repository.documentCount} ${repository.documentCount === 1 ? 'OpenAPI document' : 'OpenAPI documents'}`}
            onClick={() =>
              window.webkit?.messageHandlers?.speccyOpenRepository?.postMessage(
                repository.path,
              )
            }
          />
        ))}
      </div>
    </section>
  );
}

function ApiCatalog({
  loading,
  message,
  onOpen,
}: {
  loading: boolean;
  message: string;
  onOpen: (api: CatalogApi) => void;
}) {
  return (
    <section
      className={scoped('studio-recents studio-catalog')}
      aria-labelledby="catalog-heading"
    >
      <div className={scoped('studio-section-heading')}>
        <div>
          <span className={scoped('studio-eyebrow')}>Explore</span>
          <h2 id="catalog-heading">Popular complex APIs</h2>
        </div>
        <span>{API_CATALOG.length} public specifications</span>
      </div>
      <div className={scoped('studio-catalog-grid')}>
        {API_CATALOG.map((api) => (
          <button
            className={scoped('studio-catalog-card')}
            type="button"
            key={api.name}
            onClick={() => onOpen(api)}
            disabled={loading}
            aria-label={`Open ${api.name} API`}
            style={{ '--catalog-color': api.color } as CSSProperties}
          >
            <span className={scoped('studio-catalog-icon')} aria-hidden="true">
              {api.name.slice(0, 1)}
            </span>
            <span className={scoped('studio-catalog-copy')}>
              <strong>{api.name}</strong>
              <span>{api.description}</span>
            </span>
            <span className={scoped('studio-recent-arrow')} aria-hidden="true">
              ↗
            </span>
          </button>
        ))}
      </div>
      {message && (
        <p className={scoped('studio-catalog-error')} role="alert">
          Couldn’t open that API. {message}
        </p>
      )}
    </section>
  );
}

function RecentReferences({
  recents,
  onOpen,
}: {
  recents: RecentReference[];
  onOpen: (reference: RecentReference) => void;
}) {
  return (
    <section
      className={scoped('studio-recents')}
      aria-labelledby="recent-heading"
    >
      <div className={scoped('studio-section-heading')}>
        <div>
          <span className={scoped('studio-eyebrow')}>Your workspace</span>
          <h2 id="recent-heading">Recent references</h2>
        </div>
        <span>
          {recents.length} {recents.length === 1 ? 'reference' : 'references'}
        </span>
      </div>
      {recents.length ? (
        <div className={scoped('studio-recent-grid')}>
          {recents.map((reference) => (
            <RecentCard
              key={reference.id}
              name={reference.name}
              meta={`Opened ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(reference.openedAt)}`}
              onClick={() => onOpen(reference)}
            />
          ))}
        </div>
      ) : (
        <div className={scoped('studio-empty')}>
          <Mark />
          <h3>No recent references yet</h3>
          <p>References you open will stay handy here on this device.</p>
        </div>
      )}
    </section>
  );
}

export function HomeScreen({
  discoveredRepositories,
  recents,
  loading,
  message,
  onOpenFile,
  onOpenUrl,
  onOpenSample,
  onOpenCatalogApi,
  onOpenRecent,
}: {
  discoveredRepositories: DiscoveredRepository[];
  recents: RecentReference[];
  loading: boolean;
  message: string;
  onOpenFile: () => void;
  onOpenUrl: () => void;
  onOpenSample: () => void;
  onOpenCatalogApi: (api: CatalogApi) => void;
  onOpenRecent: (reference: RecentReference) => void;
}) {
  return (
    <main className={scoped('studio-home')}>
      <section className={scoped('studio-home-intro')}>
        <span className={scoped('studio-eyebrow')}>API reference studio</span>
        <h1>Pick up where you left off.</h1>
        <p>
          Open a recent API reference, or bring in an OpenAPI document to start
          exploring.
        </p>
        <div className={scoped('studio-home-actions')}>
          <button
            className={scoped('is-primary')}
            type="button"
            onClick={onOpenFile}
          >
            Open a file
          </button>
          <button type="button" onClick={onOpenUrl}>
            Load from URL
          </button>
          <button type="button" onClick={onOpenSample}>
            Explore the sample
          </button>
        </div>
      </section>
      <DiscoveredRepositories repositories={discoveredRepositories} />
      <ApiCatalog
        loading={loading}
        message={message}
        onOpen={onOpenCatalogApi}
      />
      <RecentReferences recents={recents} onOpen={onOpenRecent} />
    </main>
  );
}
