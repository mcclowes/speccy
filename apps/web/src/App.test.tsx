// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
  afterEach(cleanup);

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
});
