import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MediaContent, SchemaView } from './SchemaView';

afterEach(cleanup);

describe('SchemaView composition', () => {
  it('shows named media examples in an example payload selector', () => {
    render(
      <MediaContent
        content={{
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
        }}
      />,
    );

    expect(
      screen.getByRole('combobox', { name: 'Example payload' }),
    ).toHaveValue('0');
    expect(screen.getByRole('code').textContent).toContain(
      '"reference": "new reference"',
    );
    expect(screen.getByRole('code').textContent).not.toContain(
      '"name": "New name"',
    );

    fireEvent.change(
      screen.getByRole('combobox', { name: 'Example payload' }),
      { target: { value: '1' } },
    );

    expect(screen.getByRole('code').textContent).toContain(
      '"name": "New name"',
    );
    expect(screen.getByRole('code').textContent).not.toContain(
      '"reference": "new reference"',
    );
  });

  it('shows a schema title alongside its type', () => {
    render(<SchemaView schema={{ title: 'Connection', type: 'object' }} />);

    expect(screen.getByText('Connection · object')).toBeInTheDocument();
  });

  it('does not present allOf members as alternatives', () => {
    render(
      <SchemaView
        schema={{
          type: 'array',
          items: {
            allOf: [
              {
                type: 'object',
                properties: { id: { type: 'string' } },
              },
            ],
          },
        }}
      />,
    );

    expect(screen.getByRole('region', { name: 'object schema' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'id string' })).toBeVisible();
    expect(screen.queryByText(/option/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/one of/i)).not.toBeInTheDocument();
  });

  it('uses the schema explorer for fields composed with allOf', () => {
    const { container } = render(
      <SchemaView
        schema={{
          title: 'Banking: Transaction category',
          description: 'A transaction category.',
          allOf: [
            {
              type: 'object',
              required: ['id'],
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
              },
            },
          ],
        }}
      />,
    );

    expect(container.querySelector('.sp-schema-explorer')).toBeInTheDocument();
    expect(container.querySelector('.sp-schema-object')).toBeNull();
    expect(screen.getByRole('button', { name: 'id * string' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'name string' })).toBeVisible();
  });

  it('does not repeat primitive array items beneath the array type', () => {
    render(
      <SchemaView
        name="state"
        summaryOnly
        schema={{
          type: 'array',
          items: {
            title: 'InstrumentState',
            type: 'string',
            enum: ['ACTIVE', 'BLOCKED', 'DESTROYED', 'NOT_ENABLED'],
          },
        }}
      />,
    );

    expect(
      screen.getByText('array<InstrumentState · enum>'),
    ).toBeInTheDocument();
    expect(screen.queryByText('items')).not.toBeInTheDocument();
  });

  it('shows enum values as inline code in field details instead of the type summary', () => {
    const { container } = render(
      <SchemaView
        name="industry"
        schema={{
          title: 'Industry',
          type: 'string',
          enum: ['ACCOUNTING', 'AUDIT', 'FINANCE'],
        }}
      />,
    );

    expect(screen.getByText('Industry · enum')).toBeVisible();
    expect(screen.queryByText('ACCOUNTING')).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Show details for industry' }),
    );

    expect(screen.getByText('ACCOUNTING')).toBeVisible();
    expect(screen.getByText('AUDIT')).toBeVisible();
    expect(screen.getByText('FINANCE')).toBeVisible();
    expect(container.querySelector('.sp-schema-enum')).toHaveTextContent(
      'Enum:ACCOUNTINGAUDITFINANCE',
    );
    expect(container.querySelectorAll('.sp-schema-enum code')).toHaveLength(3);
  });

  it('marks deprecated field rows for subdued styling', () => {
    render(
      <SchemaView
        name="legacyField"
        schema={{
          type: 'string',
          deprecated: true,
        }}
      />,
    );

    expect(
      screen.getByText('legacyField').closest('.sp-schema-head'),
    ).toHaveClass('sp-schema-head-deprecated');
  });

  it('separates constraint labels and values for compact field metadata', () => {
    const { container } = render(
      <SchemaView
        name="username"
        exampleValue="maxmcc"
        schema={{
          type: 'string',
          maxLength: 25,
          pattern: '^[a-zA-Z0-9]+$',
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Show details for username' }),
    );

    const constraints = container.querySelector('.sp-schema-constraints');
    expect(constraints).toHaveTextContent(
      'max length 25pattern ^[a-zA-Z0-9]+$',
    );
    expect(constraints?.querySelectorAll('code')).toHaveLength(2);
    expect(
      screen.getByText('Example').closest('.sp-schema-example'),
    ).toHaveTextContent('Examplemaxmcc');
  });

  it('surfaces array item enum values in the array field details', () => {
    render(
      <SchemaView
        name="state"
        summaryOnly
        schema={{
          type: 'array',
          items: {
            title: 'InstrumentState',
            type: 'string',
            enum: ['ACTIVE', 'BLOCKED'],
          },
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Show details for state' }),
    );

    expect(screen.getByText('ACTIVE')).toBeVisible();
    expect(screen.getByText('BLOCKED')).toBeVisible();
  });

  it('labels alternatives by schema title with a numbered fallback', () => {
    const { rerender } = render(
      <SchemaView
        schema={{
          oneOf: [
            { title: 'LinkedAccount', type: 'object' },
            { title: 'UnknownSenderAccount', type: 'object' },
            { type: 'string' },
          ],
        }}
      />,
    );

    expect(screen.getByText('Accepted shapes')).toBeInTheDocument();
    expect(screen.getByText('Linked Account')).toBeInTheDocument();
    expect(screen.getByText('Unknown Sender Account')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
    expect(screen.queryByText(/one of/i)).not.toBeInTheDocument();

    rerender(<SchemaView schema={{ anyOf: [{ type: 'string' }] }} />);
    expect(screen.queryByText('Accepted shapes')).not.toBeInTheDocument();
    expect(screen.queryByText(/option/i)).not.toBeInTheDocument();
  });

  it('keeps nested fields collapsed until their tree branch opens', () => {
    render(
      <SchemaView
        collapseObjects
        schema={{
          type: 'object',
          properties: {
            result: {
              type: 'object',
              properties: { id: { type: 'string' } },
            },
          },
        }}
      />,
    );

    const nestedToggle = screen.getByRole('button', { name: 'Expand result' });
    expect(screen.getByRole('button', { name: 'result object' })).toBeVisible();
    expect(nestedToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'id string' })).toBeNull();

    fireEvent.click(nestedToggle);
    expect(nestedToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'id string' })).toBeVisible();
  });

  it('identifies a named field schema separately from its type', () => {
    const { container } = render(
      <SchemaView
        schema={{
          type: 'object',
          properties: {
            location: {
              title: 'Location',
              type: 'object',
              properties: { city: { type: 'string' } },
            },
          },
        }}
      />,
    );

    const meta = container.querySelector('.sp-schema-explorer-detail-meta');
    expect(meta).toHaveTextContent('Schema Location');
    expect(meta).toHaveTextContent('object');
    expect(meta).not.toHaveTextContent('Location · object');
  });

  it('labels deprecated fields in the explorer row', () => {
    render(
      <SchemaView
        schema={{
          type: 'object',
          properties: {
            legacyCode: {
              type: 'string',
              deprecated: true,
            },
          },
        }}
      />,
    );

    const field = screen.getByRole('button', {
      name: 'legacyCode Deprecated string',
    });
    expect(field).toBeVisible();
    expect(field.closest('.sp-schema-explorer-row')).toHaveClass(
      'is-deprecated',
    );
  });

  it('keeps required status compact and combines equal length constraints', () => {
    const { container } = render(
      <SchemaView
        schema={{
          type: 'object',
          required: ['countryCode'],
          properties: {
            countryCode: {
              type: 'string',
              minLength: 2,
              maxLength: 2,
            },
          },
        }}
      />,
    );

    expect(
      container.querySelector('.sp-schema-explorer-detail-heading'),
    ).toHaveTextContent('countryCodeRequired');
    expect(
      container.querySelector('.sp-schema-explorer-detail-meta'),
    ).toHaveTextContent('string');
    expect(container.querySelector('.sp-schema-explorer-facts')).toBeNull();
    expect(
      container.querySelector('.sp-schema-explorer-constraints'),
    ).toHaveTextContent('LengthExactly 2 characters');
  });

  it('toggles structure and details from an object row while keeping its icon actions separate', () => {
    render(
      <SchemaView
        collapseObjects
        name="cardNumber"
        schema={{
          type: 'object',
          description: 'The full card number of the card.',
          properties: { token: { type: 'string' } },
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Toggle field cardNumber' }),
    );
    expect(screen.getByText('The full card number of the card.')).toBeVisible();
    expect(screen.getByText('token')).toBeVisible();

    fireEvent.click(
      screen.getByRole('button', { name: 'Collapse cardNumber' }),
    );
    expect(screen.getByText('The full card number of the card.')).toBeVisible();
    expect(screen.queryByText('token')).not.toBeVisible();

    fireEvent.click(
      screen.getByRole('button', { name: 'Hide details for cardNumber' }),
    );
    expect(
      screen.queryByText('The full card number of the card.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('token')).not.toBeVisible();
  });

  it('shows full descriptions when response schema details are visible', () => {
    render(
      <SchemaView
        collapseObjects
        schema={{
          type: 'object',
          description:
            'In Codat, a company represents a business sharing access to their data. Each company can have multiple connections to different data sources.',
          properties: { id: { type: 'string' } },
        }}
      />,
    );

    expect(screen.getByText(/In Codat, a company represents/)).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /Show all/ }),
    ).not.toBeInTheDocument();
  });

  it('keeps selected field details visible while tree branches expand independently', () => {
    render(
      <SchemaView
        collapseObjects
        schema={{
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
        }}
      />,
    );

    expect(
      screen.getByText('Unique identifier for the company.'),
    ).toBeVisible();
    expect(
      screen.getByText('ee2eb431-c0fa-4dc9-93fa-d29781c12bcd'),
    ).toBeVisible();
    const connection = screen.getByRole('button', {
      name: 'connection object',
    });
    fireEvent.click(connection);
    expect(connection).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('The company data connection.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'status string' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Expand connection' }));
    expect(screen.getByRole('button', { name: 'status string' })).toBeVisible();
    expect(screen.getByText('The company data connection.')).toBeVisible();
  });

  it('shows an array item description before its field tree', () => {
    render(
      <SchemaView
        collapseObjects
        schema={{
          type: 'array',
          items: {
            type: 'object',
            description: 'A company returned by the API.',
            properties: { id: { type: 'string' } },
          },
        }}
      />,
    );

    const description = screen.getByText('A company returned by the API.');
    const subfield = screen.getByRole('button', { name: 'id string' });
    expect(
      description.compareDocumentPosition(subfield) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
