import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OpenAPIDocument } from 'speccy-core';
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
                servers: [
                  {
                    url: 'https://{env}.example.com',
                    variables: { env: { default: 'operations' } },
                  },
                ],
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
                  {
                    name: 'empty',
                    in: 'query',
                    allowEmptyValue: true,
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
      'https://operations.example.com/items/.10,20?filter%5Brole%5D=admin&empty=',
      expect.objectContaining({
        headers: expect.objectContaining({ Cookie: 'session=abc' }),
      }),
    );
  });

  it('renders reusable path items', () => {
    render(
      <Speccy
        route={{ page: 'reference', section: 'pathItems' }}
        spec={{
          openapi: '3.1.1',
          info: { title: 'Path item API', version: '1.0.0' },
          components: {
            pathItems: {
              Pets: {
                summary: 'Shared pet operations',
                get: { summary: 'List pets', operationId: 'listPets' },
              },
            },
          },
          paths: { '/pets': { $ref: '#/components/pathItems/Pets' } },
        }}
      />,
    );

    expect(screen.getByText('Shared pet operations')).toBeInTheDocument();
    expect(screen.getByText('GET List pets')).toBeInTheDocument();
  });

  it('renders external documentation, encodings, and complete security schemes', () => {
    const spec: OpenAPIDocument = {
      openapi: '3.1.1',
      info: { title: 'Remaining objects', version: '1.0.0' },
      paths: {
        '/upload': {
          post: {
            operationId: 'upload',
            externalDocs: {
              description: 'Upload guide',
              url: 'https://docs.example.com/upload',
            },
            requestBody: {
              content: {
                'multipart/form-data': {
                  schema: {
                    type: 'object',
                    properties: { file: { type: 'string' } },
                  },
                  encoding: {
                    file: {
                      contentType: 'image/png',
                      headers: {
                        'X-Checksum': { description: 'File checksum' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        securitySchemes: {
          certificate: {
            type: 'mutualTLS',
            description: 'Client certificate',
          },
          oauth: {
            type: 'oauth2',
            flows: {
              authorizationCode: {
                authorizationUrl: 'https://example.com/authorize',
                tokenUrl: 'https://example.com/token',
                refreshUrl: 'https://example.com/refresh',
                scopes: {},
              },
            },
          },
        },
      },
    };
    const { rerender } = render(
      <Speccy
        route={{ page: 'operation', operationId: 'upload' }}
        spec={spec}
      />,
    );

    expect(screen.getByRole('link', { name: 'Upload guide' })).toHaveAttribute(
      'href',
      'https://docs.example.com/upload',
    );
    expect(screen.getByText('Encoding')).toBeInTheDocument();
    expect(screen.getByText(/content type: image\/png/)).toBeInTheDocument();
    expect(screen.getByText('File checksum')).toBeInTheDocument();

    rerender(
      <Speccy
        route={{ page: 'reference', section: 'securitySchemes' }}
        spec={spec}
      />,
    );
    expect(screen.getByText('mutualTLS')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/refresh')).toBeInTheDocument();
  });

  it('renders the remaining metadata, example, link, and XML fields', () => {
    const spec: OpenAPIDocument = {
      openapi: '3.1.1',
      info: {
        title: 'Field coverage API',
        version: '1.0.0',
        termsOfService: 'https://example.com/terms',
        contact: {
          name: 'API support',
          url: 'https://example.com/support',
          email: 'support@example.com',
        },
      },
      servers: [
        {
          url: 'https://{region}.example.com',
          variables: {
            region: { default: 'eu', enum: ['eu', 'us'] },
          },
        },
      ],
      paths: {
        '/pets': {
          get: {
            operationId: 'pets',
            parameters: [
              {
                name: 'limit',
                in: 'query',
                examples: {
                  small: { summary: 'Small page', value: 10 },
                },
              },
            ],
          },
        },
      },
      components: {
        schemas: {
          Pet: {
            type: 'object',
            xml: {
              name: 'pet',
              namespace: 'https://example.com/pets',
              prefix: 'p',
              wrapped: true,
            },
            externalDocs: {
              description: 'Pet schema guide',
              url: 'https://example.com/pet-schema',
            },
          },
        },
        links: {
          PetOwner: {
            operationId: 'owner',
            requestBody: '$response.body#/owner',
            server: { url: 'https://owners.example.com' },
          },
        },
      },
    };
    const { rerender } = render(<Speccy spec={spec} />);

    expect(
      screen.getByRole('link', { name: 'Terms of service' }),
    ).toHaveAttribute('href', 'https://example.com/terms');
    expect(screen.getByRole('link', { name: 'API support' })).toHaveAttribute(
      'href',
      'https://example.com/support',
    );
    expect(screen.getByText('support@example.com')).toBeInTheDocument();
    const apiInformation = screen.getByLabelText('API information');
    expect(apiInformation).toContainElement(screen.getByText('Contact'));
    expect(apiInformation).toContainElement(
      screen.getByText('support@example.com'),
    );
    expect(screen.getByText(/eu, us/)).toBeInTheDocument();

    rerender(
      <Speccy route={{ page: 'operation', operationId: 'pets' }} spec={spec} />,
    );
    expect(screen.getByText('Small page')).toBeInTheDocument();

    rerender(
      <Speccy route={{ page: 'reference', section: 'schemas' }} spec={spec} />,
    );
    expect(
      screen.getByRole('link', { name: 'Pet schema guide' }),
    ).toHaveAttribute('href', 'https://example.com/pet-schema');
    expect(screen.getByText(/XML name: pet/)).toBeInTheDocument();

    rerender(
      <Speccy route={{ page: 'reference', section: 'links' }} spec={spec} />,
    );
    expect(screen.getByText('$response.body#/owner')).toBeInTheDocument();
    expect(screen.getByText('https://owners.example.com')).toBeInTheDocument();
  });

  it('lets an operation parameter override the path parameter it repeats', () => {
    render(
      <Speccy
        route={{ page: 'operation', operationId: 'search' }}
        spec={{
          openapi: '3.1.1',
          info: { title: 'Override API', version: '1.0.0' },
          servers: [{ url: 'https://api.example.com' }],
          paths: {
            '/search': {
              parameters: [
                {
                  name: 'limit',
                  in: 'query',
                  required: true,
                  description: 'Path level limit',
                  schema: { type: 'string', default: 'path-default' },
                },
              ],
              get: {
                operationId: 'search',
                parameters: [
                  {
                    name: 'limit',
                    in: 'query',
                    required: true,
                    description: 'Operation level limit',
                    schema: { type: 'string', default: 'operation-default' },
                  },
                ],
                responses: { '200': { description: 'ok' } },
              },
            },
          },
        }}
      />,
    );

    expect(screen.getAllByLabelText(/limit/)).toHaveLength(1);
    expect(document.body.textContent).toContain('operation-default');
    expect(document.body.textContent).not.toContain('path-default');
  });

  it('lists a multi-tag operation under each of its tags', () => {
    render(
      <Speccy
        spec={{
          openapi: '3.1.1',
          info: { title: 'Tagged API', version: '1.0.0' },
          tags: [{ name: 'Pets' }, { name: 'Search' }],
          paths: {
            '/pets': {
              get: {
                operationId: 'listPets',
                summary: 'List pets',
                tags: ['Pets', 'Search'],
                responses: { '200': { description: 'ok' } },
              },
            },
          },
        }}
      />,
    );

    const navigation = screen.getByLabelText('API reference');
    expect(navigation).toHaveTextContent('Pets');
    expect(navigation).toHaveTextContent('Search');
  });
});
