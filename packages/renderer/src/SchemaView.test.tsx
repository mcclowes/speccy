import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SchemaView } from './SchemaView';

afterEach(cleanup);

describe('SchemaView composition', () => {
  it('shows a schema title alongside its type', () => {
    render(<SchemaView schema={{ title: 'Connection', type: 'object' }} />);

    expect(screen.getByText('Connection · object')).toBeInTheDocument();
  });

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

  it('hides named field details without hiding the field structure', () => {
    render(<SchemaView collapseObjects schema={{
      type: 'object',
      properties: {
        id: {
          type: 'string',
          format: 'uuid',
          description: 'Unique identifier for the company.',
          example: 'ee2eb431-c0fa-4dc9-93fa-d29781c12bcd',
        },
        connection: {
          type: 'object',
          description: 'The company data connection.',
          properties: { status: { type: 'string' } },
        },
      },
    }} />);

    expect(screen.getByText('id')).toBeVisible();
    expect(screen.getByText('connection')).toBeVisible();
    expect(screen.getByText('id').closest('.sp-schema-head')).toHaveClass('sp-schema-head-named');
    expect(screen.getByText('id').closest('.sp-schema-head')).toHaveRole('button');
    expect(screen.queryByText('Unique identifier for the company.')).not.toBeInTheDocument();

    const idDetailsButton = screen.getByRole('button', { name: 'Show details for id' });
    expect(idDetailsButton.querySelector('.sp-schema-details-toggle')).toHaveAttribute('data-tooltip', 'Show field details');

    fireEvent.click(idDetailsButton);
    expect(screen.getByText('Unique identifier for the company.').closest('.sp-schema-field-details')).toHaveClass('sp-schema-field-details-named');
    expect(screen.getByText('ee2eb431-c0fa-4dc9-93fa-d29781c12bcd')).toBeVisible();
    const openIdDetailsButton = screen.getByRole('button', { name: 'Hide details for id' });
    expect(openIdDetailsButton).toHaveAttribute('aria-expanded', 'true');
    expect(openIdDetailsButton.querySelector('.sp-schema-details-toggle')).toHaveAttribute('data-tooltip', 'Hide field details');

    fireEvent.click(screen.getByRole('button', { name: 'Show details for connection' }));
    expect(screen.getByText('The company data connection.')).toBeVisible();
    expect(screen.queryByText('status')).not.toBeVisible();
  });
});
