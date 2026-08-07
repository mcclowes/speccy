import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SchemaView } from './SchemaView';

afterEach(cleanup);

describe('SchemaView composition', () => {
  it('does not present allOf members as alternatives', () => {
    render(<SchemaView schema={{
      type: 'array',
      items: {
        allOf: [{
          type: 'object',
          properties: { id: { type: 'string' } },
        }],
      },
    }} />);

    expect(screen.getByText('array<object>')).toBeInTheDocument();
    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.queryByText(/option/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/one of/i)).not.toBeInTheDocument();
  });

  it('labels genuine alternatives and omits a meaningless label for one choice', () => {
    const { rerender } = render(<SchemaView schema={{
      oneOf: [{ type: 'string' }, { type: 'integer' }],
    }} />);

    expect(screen.getByText('one of 1')).toBeInTheDocument();
    expect(screen.getByText('one of 2')).toBeInTheDocument();

    rerender(<SchemaView schema={{ anyOf: [{ type: 'string' }] }} />);
    expect(screen.queryByText(/any of/i)).not.toBeInTheDocument();
  });

  it('opens structural response objects while nested named objects start collapsed', () => {
    const { container } = render(<SchemaView collapseObjects schema={{
      type: 'object',
      properties: {
        result: {
          type: 'object',
          properties: { id: { type: 'string' } },
        },
      },
    }} />);

    const root = container.querySelector('details');
    const nested = root!.querySelector('details');
    expect(root).toHaveAttribute('open');
    expect(screen.getByText('result')).toBeVisible();
    expect(nested).not.toHaveAttribute('open');
    expect(screen.queryByText('id')).not.toBeVisible();

    fireEvent.click(root!.querySelector('summary')!);
    expect(root).not.toHaveAttribute('open');
    fireEvent.click(root!.querySelector('summary')!);

    fireEvent.click(nested!.querySelector('summary')!);
    expect(screen.getByText('id')).toBeVisible();
  });

  it('collapses long descriptions in response schemas', () => {
    render(<SchemaView collapseObjects schema={{
      type: 'object',
      description: "In Codat, a company represents a business sharing access to their data. Each company can have multiple connections to different data sources.",
      properties: { id: { type: 'string' } },
    }} />);

    const toggle = screen.getByRole('button', { name: 'Show all…' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true');
  });
});
