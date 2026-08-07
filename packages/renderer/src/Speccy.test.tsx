import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Speccy } from './Speccy';

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});

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
  it('renders each endpoint on its own route', () => {
    window.history.replaceState({}, '', '/api');
    render(<Speccy spec={spec} basePath="/api" />);

    const navigation = screen.getByRole('navigation', { name: 'API reference' });
    fireEvent.click(within(navigation).getByRole('button', { name: 'Companies' }));
    fireEvent.click(within(navigation).getByRole('link', { name: /List companies/ }));

    expect(window.location.pathname).toBe('/api/get-companies');
    expect(within(navigation).getByRole('link', { name: /List companies/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /GET.*companies.*List companies/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByRole('heading', { name: 'Test API' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '← API overview' }));
    expect(window.location.pathname).toBe('/api');
    expect(screen.getByRole('heading', { name: 'Test API' })).toBeInTheDocument();
  });

  it('opens an endpoint route directly', () => {
    window.history.replaceState({}, '', '/api/get-companies');
    render(<Speccy spec={spec} basePath="/api" />);

    expect(screen.getByRole('button', { name: /GET.*companies.*List companies/ })).toHaveAttribute('aria-expanded', 'true');
  });

  it('collapses and expands endpoint groups', () => {
    render(<Speccy spec={spec} />);

    const toggle = screen.getByRole('button', { name: 'Companies' });
    const navigation = screen.getByRole('navigation', { name: 'API reference' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(navigation).queryByRole('link', { name: /List companies/ })).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(navigation).getByRole('link', { name: /List companies/ })).toBeInTheDocument();
  });

  it('reveals matching endpoints while searching', () => {
    render(<Speccy spec={spec} />);
    fireEvent.click(screen.getByRole('button', { name: 'Companies' }));

    fireEvent.change(screen.getByRole('textbox', { name: 'Search endpoints' }), {
      target: { value: 'list companies' },
    });

    expect(screen.getByRole('button', { name: 'Companies' })).toHaveAttribute('aria-expanded', 'true');
    expect(within(screen.getByRole('navigation', { name: 'API reference' })).getByRole('link', { name: /List companies/ })).toBeInTheDocument();
  });

  it('hides tags when no endpoints match the search', () => {
    render(<Speccy spec={spec} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Search endpoints' }), {
      target: { value: 'no such endpoint' },
    });

    expect(screen.queryByRole('button', { name: 'Companies' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Companies' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'API reference' })).getByText('No endpoints found')).toBeInTheDocument();
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
