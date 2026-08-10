import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Speccy } from './Speccy';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe('OpenAPI 3.1.1 conformance', () => {
  it('renders 3.1 metadata and expands server variables', () => {
    render(
      <Speccy
        spec={{
          openapi: '3.1.1',
          jsonSchemaDialect: 'https://json-schema.org/draft/2020-12/schema',
          info: {
            title: 'Conformance API',
            summary: 'A compact API summary.',
            version: '1.0.0',
            license: {
              name: 'Apache 2.0',
              identifier: 'Apache-2.0',
            },
          },
          externalDocs: {
            description: 'Integration guide',
            url: 'https://docs.example.com/integrate',
          },
          servers: [
            {
              url: 'https://{region}.example.com/{version}',
              description: 'Regional API',
              variables: {
                region: {
                  default: 'eu',
                  enum: ['eu', 'us'],
                  description: 'Deployment region',
                },
                version: { default: 'v1' },
              },
            },
          ],
          paths: {},
        }}
      />,
    );

    expect(screen.getByText('A compact API summary.')).toBeInTheDocument();
    expect(screen.getByText('Apache-2.0')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Integration guide' }),
    ).toHaveAttribute('href', 'https://docs.example.com/integrate');
    expect(screen.getByText('https://eu.example.com/v1')).toBeInTheDocument();
    expect(screen.getByText(/Deployment region/)).toBeInTheDocument();
  });

  it('renders boolean schemas', () => {
    render(
      <Speccy
        route={{ page: 'reference', section: 'schemas' }}
        spec={{
          openapi: '3.1.1',
          info: { title: 'Boolean schemas', version: '1.0.0' },
          components: {
            schemas: {
              Anything: true,
              Never: false,
            },
          },
        }}
      />,
    );

    expect(screen.getByText('Any value is allowed.')).toBeInTheDocument();
    expect(screen.getByText('No value is allowed.')).toBeInTheDocument();
  });

  it('renders JSON Schema 2020-12 types, constraints, and annotations', () => {
    render(
      <Speccy
        route={{ page: 'reference', section: 'schemas' }}
        spec={{
          openapi: '3.1.1',
          info: { title: 'JSON Schema vocabulary', version: '1.0.0' },
          components: {
            schemas: {
              Identifier: {
                $schema: 'https://json-schema.org/draft/2020-12/schema',
                $id: 'https://example.com/identifier',
                type: ['string', 'null'],
                const: 'fixed',
                minLength: 2,
                maxLength: 12,
                contentEncoding: 'base64',
                contentMediaType: 'text/plain',
                examples: ['fixed', null],
              },
            },
          },
        }}
      />,
    );

    expect(screen.getByText('string | null')).toBeInTheDocument();
    expect(screen.getByText('const')).toBeInTheDocument();
    expect(screen.getAllByText('"fixed"')).not.toHaveLength(0);
    expect(screen.getByText('content encoding')).toBeInTheDocument();
    expect(screen.getByText('base64')).toBeInTheDocument();
    expect(screen.getByText('Examples')).toBeInTheDocument();
  });

  it('renders JSON Schema 2020-12 applicators', () => {
    render(
      <Speccy
        route={{ page: 'reference', section: 'schemas' }}
        spec={{
          openapi: '3.1.1',
          info: { title: 'JSON Schema applicators', version: '1.0.0' },
          components: {
            schemas: {
              Rules: {
                prefixItems: [{ type: 'string' }, { type: 'integer' }],
                contains: { const: 'required' },
                minContains: 1,
                maxContains: 2,
                patternProperties: { '^x-': { type: 'string' } },
                dependentSchemas: {
                  card: { required: ['billingAddress'] },
                },
                propertyNames: { pattern: '^[a-z]+$' },
                if: { required: ['card'] },
                then: { required: ['billingAddress'] },
                else: true,
                not: { required: ['forbidden'] },
                unevaluatedProperties: false,
                unevaluatedItems: true,
              },
            },
          },
        }}
      />,
    );

    for (const label of [
      'Prefix item 1',
      'Contains',
      'Pattern ^x-',
      'Depends on card',
      'Property names',
      'If',
      'Then',
      'Else',
      'Not',
      'Unevaluated properties',
      'Unevaluated items',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('serializes styled parameters in executable requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 204,
      statusText: 'No Content',
      text: vi.fn().mockResolvedValue(''),
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <Speccy
        route={{ page: 'operation', operationId: 'inspect' }}
        parameterPrototype={false}
        spec={{
          openapi: '3.1.1',
          info: { title: 'Serialization API', version: '1.0.0' },
          servers: [{ url: 'https://api.example.com' }],
          paths: {
            '/items/{coordinates}': {
              get: {
                operationId: 'inspect',
                parameters: [
                  {
                    name: 'coordinates',
                    in: 'path',
                    required: true,
                    style: 'label',
                    schema: { type: 'array' },
                  },
                  {
                    name: 'filter',
                    in: 'query',
                    style: 'deepObject',
                    schema: { type: 'object' },
                  },
                  {
                    name: 'session',
                    in: 'cookie',
                    schema: { type: 'string' },
                  },
                ],
                responses: { '204': { description: 'No content' } },
              },
            },
          },
        }}
      />,
    );

    fireEvent.change(screen.getAllByLabelText(/coordinates/)[0]!, {
      target: { value: '["10","20"]' },
    });
    fireEvent.change(screen.getAllByLabelText(/filter/)[0]!, {
      target: { value: '{"role":"admin"}' },
    });
    fireEvent.change(screen.getAllByLabelText(/session/)[0]!, {
      target: { value: 'abc' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/items/.10,20?filter%5Brole%5D=admin',
      expect.objectContaining({
        headers: expect.objectContaining({ Cookie: 'session=abc' }),
      }),
    );
  });
});
