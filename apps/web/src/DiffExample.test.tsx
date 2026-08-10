// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DiffExample } from './DiffExample';

afterEach(cleanup);

describe('DiffExample', () => {
  it('shows a representative API version comparison', () => {
    render(<DiffExample />);

    expect(screen.getByText(/Luma Library API 1.4.0/)).toBeTruthy();
    expect(screen.getByText(/Luma Library API 2.0.0/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Breaking 3' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Warnings 2' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Compatible 3' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Documentation 1' }),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Books' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Loans' })).toBeTruthy();
  });
});
