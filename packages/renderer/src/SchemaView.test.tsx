import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MediaContent, SchemaView } from './SchemaView';

afterEach(cleanup);

describe('SchemaView composition', () => {
  it('shows named media examples in an example payload selector', () => {
    render(<MediaContent content={{
      'application/json': {
        examples: {
          updateTags: {
            summary: 'Update tags',
            value: { tags: { reference: 'new reference' } },
          },
          updateName: {
            summary: 'Update name',
            value: { name: 'New name' },
          },
        },
      },
    }} />);

    expect(screen.getByRole('combobox', { name: 'Example payload' })).toHaveValue('0');
    expect(screen.getByRole('code').textContent).toContain('"reference": "new reference"');
    expect(screen.getByRole('code').textContent).not.toContain('"name": "New name"');

    fireEvent.change(screen.getByRole('combobox', { name: 'Example payload' }), { target: { value: '1' } });

    expect(screen.getByRole('code').textContent).toContain('"name": "New name"');
    expect(screen.getByRole('code').textContent).not.toContain('"reference": "new reference"');
  });

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

  it('does not repeat primitive array items beneath the array type', () => {
    render(<SchemaView name="state" summaryOnly schema={{
      type: 'array',
      items: {
        title: 'InstrumentState',
        type: 'string',
        enum: ['ACTIVE', 'BLOCKED', 'DESTROYED', 'NOT_ENABLED'],
      },
    }} />);

    expect(screen.getByText('array<InstrumentState · enum>')).toBeInTheDocument();
    expect(screen.queryByText('items')).not.toBeInTheDocument();
  });

  it('shows enum values in field details instead of the type summary', () => {
    render(<SchemaView name="industry" schema={{
      title: 'Industry',
      type: 'string',
      enum: ['ACCOUNTING', 'AUDIT', 'FINANCE'],
    }} />);

    expect(screen.getByText('Industry · enum')).toBeVisible();
    expect(screen.queryByText('ACCOUNTING')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show details for industry' }));

    expect(screen.getByText('ACCOUNTING')).toBeVisible();
    expect(screen.getByText('AUDIT')).toBeVisible();
    expect(screen.getByText('FINANCE')).toBeVisible();
  });

  it('marks deprecated field rows for subdued styling', () => {
    render(<SchemaView name="legacyField" schema={{
      type: 'string',
      deprecated: true,
    }} />);

    expect(screen.getByText('legacyField').closest('.sp-schema-head')).toHaveClass('sp-schema-head-deprecated');
  });

  it('separates constraint labels and values for compact field metadata', () => {
    const { container } = render(<SchemaView name="username" exampleValue="maxmcc" schema={{
      type: 'string',
      maxLength: 25,
      pattern: '^[a-zA-Z0-9]+$',
    }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Show details for username' }));

    const constraints = container.querySelector('.sp-schema-constraints');
    expect(constraints).toHaveTextContent('max length 25pattern ^[a-zA-Z0-9]+$');
    expect(constraints?.querySelectorAll('code')).toHaveLength(2);
    expect(screen.getByText('Example').closest('.sp-schema-example')).toHaveTextContent('Examplemaxmcc');
  });

  it('surfaces array item enum values in the array field details', () => {
    render(<SchemaView name="state" summaryOnly schema={{
      type: 'array',
      items: {
        title: 'InstrumentState',
        type: 'string',
        enum: ['ACTIVE', 'BLOCKED'],
      },
    }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Show details for state' }));

    expect(screen.getByText('ACTIVE')).toBeVisible();
    expect(screen.getByText('BLOCKED')).toBeVisible();
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
    const nested = container.querySelector('.sp-schema-object-shell details');
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

  it('shows full descriptions when response schema details are visible', () => {
    render(<SchemaView collapseObjects schema={{
      type: 'object',
      description: "In Codat, a company represents a business sharing access to their data. Each company can have multiple connections to different data sources.",
      properties: { id: { type: 'string' } },
    }} />);

    expect(screen.getByText(/In Codat, a company represents/)).toBeVisible();
    expect(screen.queryByRole('button', { name: /Show all/ })).not.toBeInTheDocument();
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

  it('shows an object field description before its subfields', () => {
    render(<SchemaView collapseObjects schema={{
      type: 'array',
      items: {
        type: 'object',
        description: 'A company returned by the API.',
        properties: { id: { type: 'string' } },
      },
    }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Show details for items' }));
    fireEvent.click(screen.getByText('items').closest('summary')!);

    const description = screen.getByText('A company returned by the API.');
    const subfield = screen.getByText('id');
    expect(description.compareDocumentPosition(subfield) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
