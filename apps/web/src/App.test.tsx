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
    fireEvent.click(screen.getByRole('button', { name: 'Edit source' }));
    const rendersBeforeTyping = previewRender.mock.calls.length;

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '{ "openapi": "3.1.0" }' } });

    expect(previewRender).toHaveBeenCalledTimes(rendersBeforeTyping);
  });

  it('rerenders the preview when the draft is applied', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit source' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '{ "openapi": "3.1.0" }' } });
    const rendersBeforeApply = previewRender.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: 'Render changes' }));

    expect(previewRender).toHaveBeenCalledTimes(rendersBeforeApply + 1);
  });
});
