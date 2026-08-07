// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const { previewRender } = vi.hoisted(() => ({ previewRender: vi.fn() }));

vi.mock('../../../packages/renderer/src/Speccy', () => ({
  Speccy: () => {
    previewRender();
    return <div>Preview</div>;
  },
}));

describe('source editor', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    previewRender.mockClear();
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('does not rerender the preview while editing a draft', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Explore the sample' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit source' }));
    const rendersBeforeTyping = previewRender.mock.calls.length;

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '{ "openapi": "3.1.0" }' } });

    expect(previewRender).toHaveBeenCalledTimes(rendersBeforeTyping);
  });

  it('rerenders the preview when the draft is applied', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Explore the sample' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit source' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '{ "openapi": "3.1.0" }' } });
    const rendersBeforeApply = previewRender.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: 'Render changes' }));

    expect(previewRender).toHaveBeenCalledTimes(rendersBeforeApply + 1);
  });

  it('returns to the homepage from the studio logo', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Explore the sample' }));
    fireEvent.click(screen.getByRole('button', { name: 'Speccy home' }));

    expect(screen.getByRole('heading', { name: 'Pick up where you left off.' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Luma Library API/ })).toBeTruthy();
  });

  it('opens and switches between recent API references', () => {
    window.localStorage.setItem('speccy-recent-references', JSON.stringify([
      { id: 'one', name: 'Catalog API', source: '{"openapi":"3.1.0"}', openedAt: 1 },
      { id: 'two', name: 'Billing API', source: '{"openapi":"3.1.0"}', openedAt: 2 },
    ]));
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Catalog API/ }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Switch API reference' }), { target: { value: 'two' } });

    expect((screen.getByRole('combobox', { name: 'Switch API reference' }) as HTMLSelectElement).value).toBe('two');
    expect(screen.getByRole('option', { name: 'Billing API' })).toBeTruthy();
  });

  it('reuses an exact duplicate recent reference', async () => {
    render(<App />);
    await waitFor(() => expect(window.speccyLoadSpec).toBeTypeOf('function'));

    act(() => {
      window.speccyLoadSpec?.('{"openapi":"3.1.0"}', 'Catalog API');
      window.speccyLoadSpec?.('{"openapi":"3.1.0"}', 'Catalog API');
    });

    const stored = JSON.parse(window.localStorage.getItem('speccy-recent-references') ?? '[]');
    expect(stored).toHaveLength(1);
  });

  it('adds import times when same-name references have different contents', async () => {
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(new Date('2026-08-07T09:15:00Z').getTime())
      .mockReturnValueOnce(new Date('2026-08-07T10:45:00Z').getTime());
    render(<App />);
    await waitFor(() => expect(window.speccyLoadSpec).toBeTypeOf('function'));

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
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      }
    });
    render(<App />);

    expect(() => fireEvent.click(screen.getByRole('button', { name: 'Explore the sample' }))).not.toThrow();

    expect(screen.getByText('Preview')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Switch API reference' })).toBeTruthy();
  });

  it('copies a self-contained preview link for a local reference', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Explore the sample' }));

    fireEvent.click(screen.getByRole('button', { name: 'Copy preview link' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    const shared = new URL(writeText.mock.calls[0]![0]);
    expect(shared.searchParams.get('preview')).toBe('1');
    expect(new URLSearchParams(shared.hash.slice(1)).get('source')).toContain('"openapi"');
  });

  it('renders a preview URL without studio navigation or editing controls', () => {
    const fragment = new URLSearchParams({ source: '{"openapi":"3.1.0"}', name: 'Catalog API' });
    window.history.replaceState({}, '', `/?preview=1#${fragment}`);

    render(<App />);

    expect(screen.getByText('Preview')).toBeTruthy();
    const themePicker = screen.getByRole('button', { name: 'Theme: system' });
    fireEvent.click(themePicker);
    expect(screen.getByRole('button', { name: 'Theme: dark' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Speccy home' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit source' })).toBeNull();
  });
});
