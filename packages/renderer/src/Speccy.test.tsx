import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Speccy } from './Speccy';

afterEach(cleanup);

const spec = {
  openapi: '3.1.0',
  info: { title: 'Test API' },
  paths: {
    '/companies': {
      get: { tags: ['Companies'], summary: 'List companies' },
    },
  },
};

describe('Speccy navigation', () => {
  it('collapses and expands endpoint groups', () => {
    render(<Speccy spec={spec} />);

    const toggle = screen.getByRole('button', { name: 'Companies' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /List companies/ })).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: /List companies/ })).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /List companies/ })).toBeInTheDocument();
  });

  it('reveals matching endpoints while searching', () => {
    render(<Speccy spec={spec} />);
    fireEvent.click(screen.getByRole('button', { name: 'Companies' }));

    fireEvent.change(screen.getByRole('textbox', { name: 'Search endpoints' }), {
      target: { value: 'list companies' },
    });

    expect(screen.getByRole('button', { name: 'Companies' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /List companies/ })).toBeInTheDocument();
  });

  it('hides tags when no endpoints match the search', () => {
    render(<Speccy spec={spec} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Search endpoints' }), {
      target: { value: 'no such endpoint' },
    });

    expect(screen.queryByRole('button', { name: 'Companies' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Companies' })).not.toBeInTheDocument();
    expect(screen.getByText('No endpoints match “no such endpoint”.')).toBeInTheDocument();
  });

  it('clears the search', () => {
    render(<Speccy spec={spec} />);
    const search = screen.getByRole('textbox', { name: 'Search endpoints' });

    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'no such endpoint' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(search).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Companies' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
  });
});
