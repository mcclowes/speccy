import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MediaContent, SchemaView } from './SchemaView';

afterEach(cleanup);

describe('SchemaView composition', () => {
  it('does not wrap endpoint request body schemas in a second border', () => {
    const css = readFileSync('src/styles.css', 'utf8');

    expect(css).toMatch(
      /:is\(\.sp-request-body, \.sp-endpoint-responses\) \.sp-media\s*\{[^}]*padding:\s*0;[^}]*border:\s*0;/s,
    );
  });

  it('keeps the field inspector sticky within long schemas', () => {
    const css = readFileSync('src/SchemaExplorer.module.css', 'utf8');

    expect(css).toMatch(/\.sp-schema-explorer-shell \{[^}]*overflow: clip;/);
    expect(css).toMatch(
      /\.sp-schema-explorer-description:global\(\.sp-markdown\) \{[^}]*font-size: 0\.6875rem;/,
    );
    expect(css).toMatch(
      /\.sp-schema-explorer-details \{[^}]*position: sticky;[^}]*top: 24px;/,
    );
  });

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

  it('presents multiple media types as alternative body representations', () => {
    const { container } = render(
      <MediaContent
        title="Body"
        content={{
          'application/json': {
            schema: {
              type: 'object',
              properties: { count: { type: 'number' } },
            },
          },
          'application/pdf': {
            schema: { type: 'string', format: 'binary' },
          },
        }}
      />,
    );

    expect(screen.getByText('Body')).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Media type' })).toHaveValue(
      '0',
    );
    expect(screen.getByRole('button', { name: 'count number' })).toBeVisible();
    expect(container.querySelectorAll('.sp-media')).toHaveLength(1);

    fireEvent.change(screen.getByRole('combobox', { name: 'Media type' }), {
      target: { value: '1' },
    });

    expect(screen.getByText('string · binary')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'count number' }),
    ).not.toBeInTheDocument();
  });

  it('shows a schema title alongside its type', () => {
    render(<SchemaView schema={{ title: 'Connection', type: 'object' }} />);

    expect(screen.getByText('Connection · object')).toBeInTheDocument();
  });

  it('presents root primitive schemas with their descriptive details', () => {
    const { container } = render(
      <SchemaView
        schema={{
          title: 'DataIntegrityDetails',
          type: 'string',
          description: 'Explains the integrity issue found in the data.',
          minLength: 1,
          enum: ['complete', 'partial'],
        }}
      />,
    );

    expect(container.querySelector('.sp-schema-primitive')).toBeInTheDocument();
    expect(screen.getByText('DataIntegrityDetails · enum')).toBeVisible();
    expect(
      screen.getByText('Explains the integrity issue found in the data.'),
    ).toBeVisible();
    expect(screen.getByText('complete')).toBeVisible();
    expect(screen.getByText('partial')).toBeVisible();
    expect(container.querySelector('.sp-schema-constraints')).toHaveTextContent(
      'min length 1',
    );
  });

  it('shows the active response value for a root primitive schema', () => {
    const { container } = render(
      <SchemaView
        schema={{ title: 'DataIntegrityDetails', type: 'string' }}
        exampleValue="The records do not reconcile."
      />,
    );

    expect(container.querySelector('.sp-schema-primitive')).toBeInTheDocument();
    expect(
      screen.getByText('Example').closest('.sp-schema-example'),
    ).toHaveTextContent('ExampleThe records do not reconcile.');
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

  it('shows accepted shapes for a composed field in the explorer inspector', () => {
    render(
      <SchemaView
        schema={{
          title: 'OutgoingWireTransfer',
          type: 'object',
          properties: {
            destination: {
              oneOf: [
                {
                  title: 'SEPABeneficiary',
                  type: 'object',
                  properties: { iban: { type: 'string' } },
                },
                {
                  title: 'FasterPaymentsBeneficiary',
                  type: 'object',
                  properties: { sortCode: { type: 'string' } },
                },
              ],
            },
          },
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'destination object' }));

    expect(screen.getByText('Accepted shapes')).toBeVisible();
    expect(screen.getByText('SEPA Beneficiary')).toBeVisible();
    expect(screen.getByText('Faster Payments Beneficiary')).toBeVisible();
    expect(screen.getByText('iban')).toBeVisible();
    fireEvent.click(
      screen.getByText('Faster Payments Beneficiary').closest('summary')!,
    );
    expect(screen.getByText('sortCode')).toBeVisible();
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

    fireEvent.click(
      screen.getByRole('button', { name: 'location Location · object' }),
    );
    const meta = container.querySelector('.sp-schema-explorer-detail-meta');
    expect(meta).toHaveTextContent('Schema Location');
    expect(meta).toHaveTextContent('object');
    expect(meta).not.toHaveTextContent('Location · object');
  });

  it('separates a field model from its non-shrinking primitive type', () => {
    const { container } = render(
      <SchemaView
        schema={{
          type: 'object',
          properties: {
            location: { title: 'Location', type: 'object' },
          },
        }}
      />,
    );

    const rowType = container.querySelector('.sp-schema-explorer-type');
    expect(
      rowType?.querySelector('.sp-schema-explorer-model'),
    ).toHaveTextContent('Location');
    expect(
      rowType?.querySelector('.sp-schema-explorer-primitive'),
    ).toHaveTextContent('object');
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

    fireEvent.click(
      screen.getByRole('button', { name: 'countryCode * string' }),
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

  it('lists unequal length bounds as separate rows with distinct keys', () => {
    const errors: string[] = [];
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation((...args) => {
        errors.push(args.join(' '));
      });

    const { container } = render(
      <SchemaView
        schema={{
          type: 'object',
          properties: {
            reference: { type: 'string', minLength: 3, maxLength: 50 },
          },
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'reference string' }));
    expect(
      container.querySelector('.sp-schema-explorer-constraints'),
    ).toHaveTextContent(
      'LengthAt least 3 charactersLengthAt most 50 characters',
    );
    expect(errors.join(' ')).not.toContain('same key');

    consoleError.mockRestore();
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
      screen.queryByText('Unique identifier for the company.'),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector('.sp-schema-explorer-inspector'),
    ).not.toBeInTheDocument();
    const id = screen.getByRole('button', { name: 'id string · uuid' });
    fireEvent.click(id);
    expect(id).toHaveAttribute('aria-pressed', 'true');
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
    expect(screen.getByRole('button', { name: 'status string' })).toBeVisible();

    fireEvent.click(
      screen.getByRole('button', { name: 'Collapse connection' }),
    );
    expect(screen.queryByRole('button', { name: 'status string' })).toBeNull();
    expect(screen.getByText('The company data connection.')).toBeVisible();
  });

  it('expands a collapsed object row and shows its details on click', () => {
    render(
      <SchemaView
        collapseObjects
        schema={{
          type: 'object',
          properties: {
            _links: {
              type: 'object',
              description: 'Hypermedia links.',
              properties: { self: { type: 'string' } },
            },
          },
        }}
      />,
    );

    const row = screen.getByRole('button', { name: '_links object' });
    expect(screen.queryByRole('button', { name: 'self string' })).toBeNull();

    fireEvent.click(row);
    expect(row).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Hypermedia links.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'self string' })).toBeVisible();

    fireEvent.click(row);
    expect(row).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText('Hypermedia links.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'self string' })).toBeVisible();
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

  it('uses object examples to populate otherwise empty response schemas', () => {
    render(
      <SchemaView
        schema={{ title: 'ErrorMessage', type: 'object' }}
        exampleValue={{
          statusCode: 401,
          service: 'PublicApi',
          error: 'Unauthorized',
        }}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'statusCode number' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'service string' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'error string' })).toBeVisible();
  });

  it('renders boolean schemas in nested properties and array items', () => {
    render(
      <SchemaView
        schema={{
          type: 'object',
          properties: {
            forbidden: false,
            values: { type: 'array', items: true },
          },
        }}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'forbidden never' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'values array<any>' }),
    ).toBeVisible();
  });

  it('shows every accepted shape for a root oneOf instead of only the first', () => {
    render(
      <SchemaView
        schema={{
          oneOf: [
            {
              title: 'CardPayment',
              type: 'object',
              properties: { pan: { type: 'string' } },
            },
            {
              title: 'BankPayment',
              type: 'object',
              properties: { iban: { type: 'string' } },
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('Card Payment')).toBeVisible();
    expect(screen.getByText('Bank Payment')).toBeVisible();
  });

  it('reaches XML and external documentation on a field that has nothing else', () => {
    render(
      <SchemaView
        collapseObjects
        schema={{
          type: 'object',
          properties: {
            tagged: {
              type: 'string',
              xml: { name: 'TaggedXml', attribute: true },
              externalDocs: {
                url: 'https://example.com/field',
                description: 'Field guide',
              },
            },
          },
          xml: { name: 'Root' },
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: /details for tagged/i }),
    );

    expect(screen.getByText(/TaggedXml/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Field guide' })).toHaveAttribute(
      'href',
      'https://example.com/field',
    );
  });

  it('names the discriminator property and its mapped values', () => {
    render(
      <SchemaView
        schema={{
          oneOf: [
            {
              title: 'Cat',
              type: 'object',
              properties: { kind: { const: 'cat' } },
            },
            {
              title: 'Dog',
              type: 'object',
              properties: { kind: { const: 'dog' } },
            },
          ],
          discriminator: {
            propertyName: 'kind',
            mapping: {
              feline: '#/components/schemas/Cat',
              canine: '#/components/schemas/Dog',
            },
          },
        }}
      />,
    );

    expect(screen.getByText(/Selected by/)).toBeVisible();
    expect(screen.getByText('feline')).toBeVisible();
    expect(screen.getByText('canine')).toBeVisible();
  });

  it('names the discriminator property in the explorer', () => {
    render(
      <SchemaView
        schema={{
          type: 'object',
          properties: { id: { type: 'string' } },
          oneOf: [
            {
              title: 'Cat',
              type: 'object',
              properties: { kind: { const: 'cat' } },
            },
            {
              title: 'Dog',
              type: 'object',
              properties: { kind: { const: 'dog' } },
            },
          ],
          discriminator: { propertyName: 'kind' },
        }}
      />,
    );

    expect(screen.getByText(/Selected by/)).toHaveTextContent('kind');
  });

  it('keeps root alternatives visible alongside shared properties', () => {
    render(
      <SchemaView
        schema={{
          type: 'object',
          properties: { id: { type: 'string' } },
          oneOf: [
            { title: 'Alpha', properties: { alpha: { type: 'string' } } },
            { title: 'Beta', properties: { beta: { type: 'string' } } },
          ],
        }}
      />,
    );

    expect(screen.getByText('Alpha')).toBeVisible();
    expect(screen.getByText('Beta')).toBeVisible();
  });

  it('does not invent fields from a generated example when the schema is composed', () => {
    render(
      <SchemaView
        schema={{
          oneOf: [
            { title: 'Alpha', properties: { alpha: { type: 'string' } } },
            { title: 'Beta', properties: { beta: { type: 'string' } } },
          ],
        }}
        exampleValue={{ alpha: 'only from the first branch' }}
      />,
    );

    expect(screen.getByText('Beta')).toBeVisible();
  });

  it('shows additional properties beside declared properties', () => {
    render(
      <SchemaView
        schema={{
          type: 'object',
          properties: { id: { type: 'string' } },
          additionalProperties: { type: 'number' },
        }}
      />,
    );

    expect(
      screen.getByRole('button', { name: /additionalProperties number/ }),
    ).toBeVisible();
  });

  it('reports a closed object', () => {
    render(
      <SchemaView
        schema={{
          type: 'object',
          properties: { id: { type: 'string' } },
          additionalProperties: false,
        }}
      />,
    );

    expect(screen.getByText(/No other properties/i)).toBeVisible();
  });

  it('shows pattern properties beside declared properties', () => {
    render(
      <SchemaView
        schema={{
          type: 'object',
          properties: { id: { type: 'string' } },
          patternProperties: { '^x-': { type: 'string' } },
        }}
      />,
    );

    expect(screen.getByRole('button', { name: /\^x- string/ })).toBeVisible();
  });

  it('keeps conditional applicators visible on a schema that also has properties', () => {
    render(
      <SchemaView
        schema={{
          type: 'object',
          properties: { id: { type: 'string' } },
          if: { required: ['id'] },
          then: { required: ['name'] },
          not: { type: 'null' },
          unevaluatedProperties: false,
        }}
      />,
    );

    for (const label of ['If', 'Then', 'Not', 'Unevaluated properties'])
      expect(screen.getByText(label)).toBeVisible();
  });

  it('types a const field from its literal instead of calling it an object', () => {
    render(
      <SchemaView
        schema={{
          type: 'object',
          properties: {
            kind: { const: 'cat' },
            legs: { const: 4 },
          },
        }}
      />,
    );

    expect(screen.getByRole('button', { name: 'kind string' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'legs number' })).toBeVisible();
  });

  it('labels a schema with no type information as any', () => {
    render(
      <SchemaView schema={{ format: 'date-time', description: 'A moment.' }} />,
    );

    expect(screen.getByText('any · date-time')).toBeVisible();
  });

  it('still infers object and array from structural keywords', () => {
    render(
      <SchemaView
        schema={{
          type: 'object',
          properties: {
            nested: { properties: { a: { type: 'string' } } },
            list: { items: { type: 'string' } },
          },
        }}
      />,
    );

    expect(screen.getByRole('button', { name: 'nested object' })).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'list array<string>' }),
    ).toBeVisible();
  });
});
