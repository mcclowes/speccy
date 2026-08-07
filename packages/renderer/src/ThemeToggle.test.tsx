import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeToggle } from './ThemeToggle';

afterEach(cleanup);

describe('ThemeToggle', () => {
  it('offers light mode when the current theme is dark', () => {
    const onChange = vi.fn();
    render(<ThemeToggle theme="dark" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Switch to light theme' }));

    expect(onChange).toHaveBeenCalledWith('light');
  });

  it('offers dark mode when the current theme is light', () => {
    const onChange = vi.fn();
    render(<ThemeToggle theme="light" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));

    expect(onChange).toHaveBeenCalledWith('dark');
  });
});
