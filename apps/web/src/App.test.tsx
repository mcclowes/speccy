// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const { previewRender, runSpectral } = vi.hoisted(() => ({
  previewRender: vi.fn(),
  runSpectral: vi.fn().mockResolvedValue([]),
}));

vi.mock('speccy-spectral', () => ({ runSpectral }));

vi.mock('speccy-renderer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('speccy-renderer')>()),
  Speccy: ({
    spec,
    onNavigate,
    hrefForRoute,
    theme,
  }: {
    spec: unknown;
    onNavigate?: (route: { page: 'operation'; operationId: string }) => void;
    hrefForRoute?: (route: {
      page: 'operation';
      operationId: string;
    }) => string;
    theme?: 'light' | 'dark' | 'system';
  }) => {
    previewRender(spec);
    const operation = {
      page: 'operation' as const,
      operationId: 'list-companies',
    };
    return (
      <div className={`speccy sp-theme-${theme}`}>
        Preview
        {onNavigate && (
          <a
            href={hrefForRoute?.(operation)}
            onClick={(event) => {
              event.preventDefault();
              onNavigate(operation);
            }}
          >
            Open test operation
          </a>
        )}
      </div>
    );
  },
}));

describe('web app', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    previewRender.mockClear();
    runSpectral.mockClear();
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('keeps opened references read-only', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Explore the sample' }));

    expect(screen.queryByRole('button', { name: 'Edit source' })).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('opens a public API from the catalog', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          JSON.stringify({ openapi: '3.0.0', info: { title: 'Stripe' } }),
        ),
    });
    vi.stubGlobal('fetch', fetch);
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Open Stripe API' }));

    await screen.findByText('Preview');
    expect(fetch).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/stripe/openapi/master/latest/openapi.spec3.json',
    );
    expect(window.location.pathname).toMatch(/^\/references\/Stripe-/);
    expect(previewRender).toHaveBeenLastCalledWith(
      expect.objectContaining({ info: { title: 'Stripe' } }),
    );
    await waitFor(() => expect(runSpectral).toHaveBeenCalled());
    expect(runSpectral.mock.calls[0]?.[0]).toMatchObject({ paths: {} });
  });

  it('shows catalog loading errors on the home screen', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Open Stripe API' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Couldn’t open that API. The server returned 503.',
    );
  });

  it('opens a repository discovered by the macOS app', async () => {
    const postMessage = vi.fn();
    window.webkit = {
      messageHandlers: { speccyOpenRepository: { postMessage } },
    };
    render(<App />);
    await waitFor(() =>
      expect(window.speccySetDiscoveredRepositories).toBeTypeOf('function'),
    );

    act(() => {
      window.speccySetDiscoveredRepositories?.([
        { name: 'catalog', path: '/code/catalog', documentCount: 2 },
      ]);
    });
    fireEvent.click(screen.getByRole('button', { name: /catalog/ }));

    expect(postMessage).toHaveBeenCalledWith('/code/catalog');
    delete window.webkit;
  });

  it('returns to the homepage from the studio logo', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Explore the sample' }));
    fireEvent.click(screen.getByRole('button', { name: 'Speccy home' }));

    expect(
      screen.getByRole('heading', { name: 'Pick up where you left off.' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /Luma Library API/ }),
    ).toBeTruthy();
    expect(window.location.pathname).toBe('/');
  });

  it('scopes renderer navigation beneath the active reference', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Explore the sample' }));
    const referencePath = window.location.pathname;

    fireEvent.click(screen.getByRole('link', { name: 'Open test operation' }));

    expect(referencePath).toMatch(/^\/references\/Luma%20Library%20API-/);
    expect(window.location.pathname).toBe(
      `${referencePath}/operations/list-companies`,
    );
  });

  it('normalizes a remote import and preserves its source across nested routes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{"openapi":"3.1.0"}'),
      }),
    );
    window.history.replaceState(
      {},
      '',
      '/open?url=https%3A%2F%2Fexample.com%2Fopenapi.yaml',
    );

    render(<App />);
    await screen.findByText('Preview');

    expect(window.location.pathname).toMatch(/^\/references\/openapi.yaml-/);
    expect(new URLSearchParams(window.location.search).get('source')).toBe(
      'https://example.com/openapi.yaml',
    );

    fireEvent.click(screen.getByRole('link', { name: 'Open test operation' }));
    expect(window.location.pathname).toMatch(/\/operations\/list-companies$/);
    expect(new URLSearchParams(window.location.search).get('source')).toBe(
      'https://example.com/openapi.yaml',
    );
  });

  it('opens and switches between recent API references', () => {
    window.localStorage.setItem(
      'speccy-recent-references',
      JSON.stringify([
        {
          id: 'one',
          name: 'Catalog API',
          source: '{"openapi":"3.1.0"}',
          openedAt: 1,
        },
        {
          id: 'two',
          name: 'Billing API',
          source: '{"openapi":"3.1.0"}',
          openedAt: 2,
        },
      ]),
    );
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Catalog API/ }));
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Switch API reference' }),
      { target: { value: 'two' } },
    );

    expect(
      (
        screen.getByRole('combobox', {
          name: 'Switch API reference',
        }) as HTMLSelectElement
      ).value,
    ).toBe('two');
    expect(screen.getByRole('option', { name: 'Billing API' })).toBeTruthy();
  });

  it('reuses an exact duplicate recent reference', async () => {
    render(<App />);
    await waitFor(() => expect(window.speccyLoadSpec).toBeTypeOf('function'));

    act(() => {
      window.speccyLoadSpec?.('{"openapi":"3.1.0"}', 'Catalog API');
      window.speccyLoadSpec?.('{"openapi":"3.1.0"}', 'Catalog API');
    });

    const stored = JSON.parse(
      window.localStorage.getItem('speccy-recent-references') ?? '[]',
    );
    expect(stored).toHaveLength(1);
  });

  it('adds import times when same-name references have different contents', async () => {
    render(<App />);
    await waitFor(() => expect(window.speccyLoadSpec).toBeTypeOf('function'));
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(new Date('2026-08-07T09:15:00Z').getTime())
      .mockReturnValueOnce(new Date('2026-08-07T10:45:00Z').getTime());

    act(() => {
      window.speccyLoadSpec?.('{"openapi":"3.0.0"}', 'Catalog API');
      window.speccyLoadSpec?.('{"openapi":"3.1.0"}', 'Catalog API');
    });

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]?.textContent).toMatch(/^Catalog API — /);
    expect(options[1]?.textContent).toMatch(/^Catalog API — /);
    expect(options[0]?.textContent).not.toBe(options[1]?.textContent);
  });

  it('keeps an opened reference usable when recent storage is full', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    setItem.mockImplementation((key) => {
      if (key === 'speccy-recent-references') {
        throw new DOMException(
          'The quota has been exceeded.',
          'QuotaExceededError',
        );
      }
    });
    render(<App />);

    expect(() =>
      fireEvent.click(
        screen.getByRole('button', { name: 'Explore the sample' }),
      ),
    ).not.toThrow();

    expect(screen.getByText('Preview')).toBeTruthy();
    expect(
      screen.getByRole('combobox', { name: 'Switch API reference' }),
    ).toBeTruthy();
  });

  it('copies a self-contained preview link for a local reference', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Explore the sample' }));

    fireEvent.click(screen.getByRole('button', { name: 'Copy preview link' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    const shared = new URL(writeText.mock.calls[0]![0]);
    expect(shared.searchParams.get('preview')).toBe('1');
    expect(new URLSearchParams(shared.hash.slice(1)).get('source')).toContain(
      '"openapi"',
    );
  });

  it('renders a preview URL without viewer navigation', () => {
    const fragment = new URLSearchParams({
      source: '{"openapi":"3.1.0"}',
      name: 'Catalog API',
    });
    window.history.replaceState({}, '', `/?preview=1#${fragment}`);

    render(<App />);

    expect(screen.getByText('Preview')).toBeTruthy();
    const themePicker = screen.getByRole('button', { name: 'Theme: system' });
    expect(
      document.querySelector('.speccy')?.classList.contains('sp-theme-system'),
    ).toBe(true);
    fireEvent.click(themePicker);
    expect(screen.getByRole('button', { name: 'Theme: dark' })).toBeTruthy();
    expect(
      document.querySelector('.speccy')?.classList.contains('sp-theme-dark'),
    ).toBe(true);
    expect(screen.queryByRole('button', { name: 'Speccy home' })).toBeNull();
  });
});
