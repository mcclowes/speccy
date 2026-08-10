import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Speccy } from './Speccy';
import type { SpeccyRoute } from './types';

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
  window.localStorage.clear();
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
  it('shows missing-description hints only when authoring hints are enabled', () => {
    const { rerender } = render(<Speccy spec={spec} />);

    expect(
      screen.queryByText('This API has no description.'),
    ).not.toBeInTheDocument();
    rerender(<Speccy spec={spec} showDeveloperHints />);
    expect(
      screen.getByText('This API has no description.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hide hints' }));
    expect(
      screen.queryByText('This API has no description.'),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /API health:/ }));
    expect(
      screen.getByRole('dialog', { name: 'API health' }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'Ignore this rule' }).length,
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getByLabelText('API health actions'));
    fireEvent.click(screen.getByRole('button', { name: 'Show hints' }));
    expect(screen.getAllByText('This API has no description.')).toHaveLength(2);
  });

  it('shows contextual hints on tag and operation pages', () => {
    const { rerender } = render(
      <Speccy
        spec={spec}
        route={{ page: 'tag', tag: 'companies' }}
        showDeveloperHints
      />,
    );

    expect(
      screen.getByText('Companies has no description.'),
    ).toBeInTheDocument();
    rerender(
      <Speccy
        spec={spec}
        route={{ page: 'operation', operationId: 'get-companies' }}
        showDeveloperHints
      />,
    );
    expect(
      screen.getByText('GET /companies has no description.'),
    ).toBeInTheDocument();
  });

  it('links API health findings to their operation pages', () => {
    const onNavigate = vi.fn();
    render(
      <Speccy
        spec={spec}
        route={{ page: 'overview' }}
        onNavigate={onNavigate}
        hrefForRoute={(route) =>
          route.page === 'operation' ? `/operations/${route.operationId}` : '/'
        }
        showDeveloperHints
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /API health:/ }));
    const finding = screen
      .getByText('GET /companies has no description.')
      .closest<HTMLElement>('.sp-diagnostic-card')!;
    const link = within(finding).getByRole('link', { name: 'View page' });
    expect(link).toHaveAttribute('href', '/operations/get-companies');

    fireEvent.click(link);
    expect(onNavigate).toHaveBeenCalledWith({
      page: 'operation',
      operationId: 'get-companies',
    });
    expect(
      screen.queryByRole('dialog', { name: 'API health' }),
    ).not.toBeInTheDocument();
  });

  it('does not render a default brand icon', () => {
    const { container } = render(<Speccy spec={spec} />);

    expect(container.querySelector('.sp-brand-mark')).not.toBeInTheDocument();
    expect(container.querySelector('.sp-brand')).not.toHaveClass('has-logo');
  });

  it('keeps the taller brand row when a logo is provided', () => {
    const { container } = render(
      <Speccy spec={spec} logo={<span aria-label="Logo">S</span>} />,
    );

    expect(container.querySelector('.sp-brand')).toHaveClass('has-logo');
  });

  it('delegates routing to a controlling host without changing browser history', () => {
    const onNavigate = vi.fn();
    const hrefForRoute = vi.fn((route: SpeccyRoute) =>
      route.page === 'operation'
        ? `/references/catalog/operations/${route.operationId}`
        : '/references/catalog',
    );
    render(
      <Speccy
        spec={spec}
        route={{ page: 'overview' }}
        onNavigate={onNavigate}
        hrefForRoute={hrefForRoute}
      />,
    );

    const operation = within(screen.getByRole('main')).getByRole('link', {
      name: /List companies.*GET.*companies/,
    });
    expect(operation).toHaveAttribute(
      'href',
      '/references/catalog/operations/get-companies',
    );
    fireEvent.click(operation);

    expect(onNavigate).toHaveBeenCalledWith({
      page: 'operation',
      operationId: 'get-companies',
    });
    expect(window.location.pathname).toBe('/');
  });

  it('links to all endpoints above the first tag', () => {
    window.history.replaceState({}, '', '/api/tags/companies');
    render(<Speccy spec={spec} basePath="/api" />);

    const navigation = within(
      screen.getByRole('navigation', { name: 'API reference' }),
    );
    const allEndpoints = navigation.getByRole('link', {
      name: 'All endpoints',
    });
    const firstTag = navigation.getByRole('button', { name: 'Companies' });

    expect(
      allEndpoints.compareDocumentPosition(firstTag) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(firstTag).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(allEndpoints);

    expect(window.location.pathname).toBe('/api');
    expect(allEndpoints).toHaveAttribute('aria-current', 'page');
    expect(firstTag).toHaveAttribute('aria-expanded', 'true');
    expect(
      navigation.getByRole('link', { name: 'Overview' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Test API' }),
    ).toBeInTheDocument();
  });

  it('renders each endpoint on its own route', () => {
    window.history.replaceState({}, '', '/api');
    render(<Speccy spec={spec} basePath="/api" />);

    expect(
      within(screen.getByRole('main')).getByRole('link', {
        name: /List companies.*GET.*companies/,
      }),
    ).toBeInTheDocument();

    const navigation = screen.getByRole('navigation', {
      name: 'API reference',
    });
    fireEvent.click(
      within(navigation).getByRole('button', { name: 'Companies' }),
    );
    fireEvent.click(
      within(navigation).getByRole('link', { name: /List companies/ }),
    );

    expect(window.location.pathname).toBe('/api/get-companies');
    expect(
      within(navigation).getByRole('link', { name: /List companies/ }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      within(navigation).getByRole('button', { name: 'Companies' }),
    ).toHaveClass('is-active');
    expect(
      screen.getByRole('heading', { level: 1, name: 'List companies' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('complementary', { name: 'Request builder' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Test API' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '← API overview' }));
    expect(window.location.pathname).toBe('/api');
    expect(
      screen.getByRole('heading', { name: 'Test API' }),
    ).toBeInTheDocument();
  });

  it('opens an endpoint route directly', () => {
    window.history.replaceState({}, '', '/api/get-companies');
    render(<Speccy spec={spec} basePath="/api" />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'List companies' }),
    ).toBeInTheDocument();
    const tag = screen.getByRole('link', { name: 'Companies' });
    expect(tag).toHaveAttribute('href', '/api/tags/companies');

    fireEvent.click(tag);

    expect(window.location.pathname).toBe('/api/tags/companies');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Companies' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Operations' }),
    ).toBeInTheDocument();
  });

  it('renders an endpoint without request parameters', () => {
    window.history.replaceState({}, '', '/api/get-companies');
    render(<Speccy spec={spec} basePath="/api" />);

    expect(screen.getByText('No request parameters')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This endpoint doesn’t accept query parameters or a request body.',
      ),
    ).toBeInTheDocument();
  });

  it('updates the rendered theme when the theme prop changes', () => {
    const { container, rerender } = render(
      <Speccy spec={spec} theme="light" />,
    );

    expect(container.querySelector('.speccy')).toHaveClass('sp-theme-light');
    rerender(<Speccy spec={spec} theme="dark" />);
    expect(container.querySelector('.speccy')).toHaveClass('sp-theme-dark');
  });

  it('omits the empty request state when the endpoint accepts input', () => {
    window.history.replaceState({}, '', '/api/get-companies');
    render(
      <Speccy
        spec={{
          ...spec,
          paths: {
            '/companies': {
              get: {
                summary: 'List companies',
                parameters: [
                  { name: 'cursor', in: 'query', schema: { type: 'string' } },
                ],
              },
            },
          },
        }}
        basePath="/api"
      />,
    );

    expect(screen.queryByText('No request parameters')).not.toBeInTheDocument();
  });

  it('scrolls a directly opened endpoint into the sidebar viewport', () => {
    const scrollIntoView = vi.mocked(Element.prototype.scrollIntoView);
    scrollIntoView.mockClear();
    window.history.replaceState({}, '', '/api/get-companies');

    render(<Speccy spec={spec} basePath="/api" theme="light" />);

    expect(
      within(
        screen.getByRole('navigation', { name: 'API reference' }),
      ).getByRole('link', { name: /List companies/ }),
    ).toHaveAttribute('aria-current', 'page');
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
  });

  it('dismisses the optional parameter picker from outside clicks and Escape', () => {
    window.history.replaceState({}, '', '/api/get-companies');
    const { container } = render(
      <Speccy
        spec={{
          ...spec,
          paths: {
            '/companies': {
              get: {
                summary: 'List companies',
                parameters: [
                  { name: 'cursor', in: 'query', schema: { type: 'string' } },
                ],
              },
            },
          },
        }}
        basePath="/api"
        parameterPrototype
      />,
    );

    const trigger = screen.getByRole('button', {
      name: /Add optional parameter/,
    });
    expect(trigger).toBe(
      container.querySelector(
        '.sp-parameter-card-header .sp-add-optional-parameter',
      ),
    );
    fireEvent.click(trigger);
    expect(
      screen.getByRole('textbox', { name: 'Find an optional parameter' }),
    ).toBeInTheDocument();

    fireEvent.click(document.body);
    expect(
      screen.queryByRole('textbox', { name: 'Find an optional parameter' }),
    ).not.toBeInTheDocument();

    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(
      screen.queryByRole('textbox', { name: 'Find an optional parameter' }),
    ).not.toBeInTheDocument();
  });

  it('explains when no optional parameters are selected in the request builder', () => {
    window.history.replaceState({}, '', '/api/get-companies');
    render(
      <Speccy
        spec={{
          ...spec,
          paths: {
            '/companies': {
              get: {
                summary: 'List companies',
                parameters: [
                  { name: 'cursor', in: 'query', schema: { type: 'string' } },
                ],
              },
            },
          },
        }}
        basePath="/api"
        parameterPrototype
      />,
    );

    expect(
      screen.getByText(
        'No parameters selected. Add an optional parameter to include it in the request.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Add optional parameter' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'cursor' }));

    expect(
      screen.queryByText(
        'No parameters selected. Add an optional parameter to include it in the request.',
      ),
    ).not.toBeInTheDocument();
  });

  it('labels responses with their standard HTTP status phrase without repeating the description', () => {
    window.history.replaceState({}, '', '/api/get-companies');
    render(
      <Speccy
        spec={{
          ...spec,
          paths: {
            '/companies': {
              get: {
                summary: 'List companies',
                responses: {
                  200: { description: 'OK' },
                  412: {
                    description:
                      'The company data has changed since it was last read.',
                  },
                },
              },
            },
          },
        }}
        basePath="/api"
      />,
    );

    expect(screen.getByText('OK')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '412' }));
    expect(screen.getByText('Precondition Failed')).toBeInTheDocument();
    expect(
      screen.getByText('The company data has changed since it was last read.'),
    ).toBeInTheDocument();
  });

  it('opens a tag overview from an explicit navigation item', () => {
    render(
      <Speccy
        spec={{
          ...spec,
          tags: [
            {
              name: 'Companies',
              description: 'Create and manage companies.',
              'x-longDescription':
                'Use **connections** to synchronize company data.\n\n## Before you begin\n\nCreate a company first.',
            },
          ],
        }}
        basePath="/api"
      />,
    );

    const navigation = within(
      screen.getByRole('navigation', { name: 'API reference' }),
    );
    fireEvent.click(navigation.getByRole('button', { name: 'Companies' }));

    expect(window.location.pathname).toBe('/');
    fireEvent.click(navigation.getByRole('link', { name: 'Overview' }));

    expect(window.location.pathname).toBe('/api/tags/companies');
    expect(navigation.getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(navigation.getByRole('button', { name: 'Companies' })).toHaveClass(
      'is-active',
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Companies' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Create and manage companies.'),
    ).toBeInTheDocument();
    expect(screen.getByText('connections').tagName).toBe('STRONG');
    expect(
      screen.getByRole('heading', { level: 2, name: 'Before you begin' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Operations' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /List companies.*GET.*companies/ }),
    ).toBeInTheDocument();
  });

  it('renders a tag icon in navigation and tag headings', () => {
    render(
      <Speccy
        spec={{
          ...spec,
          tags: [
            {
              name: 'Companies',
              'x-icon': { url: '/icons/companies.svg', alt: 'Company' },
            },
          ],
        }}
        basePath="/api"
      />,
    );

    expect(screen.getAllByRole('img', { name: 'Company' })).toHaveLength(2);

    const navigation = within(
      screen.getByRole('navigation', { name: 'API reference' }),
    );
    const iconTag = navigation.getByRole('button', {
      name: 'Company Companies',
    });
    expect(iconTag).toHaveClass('has-icon');
    fireEvent.click(iconTag);
    fireEvent.click(navigation.getByRole('link', { name: 'Overview' }));

    expect(screen.getAllByRole('img', { name: 'Company' })).toHaveLength(2);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Company Companies' }),
    ).toBeInTheDocument();
  });

  it('marks only navigation tags with icons for taller spacing', () => {
    render(<Speccy spec={spec} />);

    expect(
      within(
        screen.getByRole('navigation', { name: 'API reference' }),
      ).getByRole('button', { name: 'Companies' }),
    ).not.toHaveClass('has-icon');
  });

  it('opens a tag overview route directly', () => {
    window.history.replaceState({}, '', '/api/tags/companies');
    render(<Speccy spec={spec} basePath="/api" />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Companies' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Operations' }),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole('navigation', { name: 'API reference' }),
      ).getByRole('link', { name: 'Overview' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('shows tagged webhooks under their tag and untagged webhooks under Other webhooks', () => {
    render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Webhook API' },
          paths: {},
          'x-tagGroups': [{ name: 'Core API', tags: ['Companies'] }],
          webhooks: {
            companyUpdated: {
              post: { tags: ['Companies'], summary: 'Company updated' },
            },
            systemReady: { post: { summary: 'System ready' } },
          },
        }}
        basePath="/api"
      />,
    );

    const navigation = within(
      screen.getByRole('navigation', { name: 'API reference' }),
    );
    fireEvent.click(navigation.getByRole('button', { name: 'Companies' }));
    expect(
      navigation.getByRole('link', { name: /Company updated/ }),
    ).toBeInTheDocument();
    fireEvent.click(navigation.getByRole('button', { name: 'Other webhooks' }));
    expect(
      navigation.getByRole('link', { name: /System ready/ }),
    ).toBeInTheDocument();

    fireEvent.click(navigation.getByRole('link', { name: /Company updated/ }));
    expect(
      screen.getByRole('heading', { level: 1, name: 'Company updated' }),
    ).toBeInTheDocument();

    fireEvent.click(navigation.getByRole('link', { name: /System ready/ }));
    expect(
      screen.getByRole('heading', { level: 1, name: 'System ready' }),
    ).toBeInTheDocument();
  });

  it('renders a webhook as a read-only event using its webhook name as the title', () => {
    render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Webhook API' },
          paths: {},
          security: [{ apiKey: [] }],
          webhooks: {
            'Account categories updated': {
              post: {
                requestBody: {
                  description:
                    'Triggered when a company’s accounts are categorized.',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          payload: {
                            type: 'object',
                            properties: { quotaRemaining: { type: 'integer' } },
                          },
                        },
                      },
                      example: { payload: { quotaRemaining: 11993 } },
                    },
                  },
                },
                responses: { '204': { description: 'Webhook accepted.' } },
              },
            },
          },
          components: {
            securitySchemes: {
              apiKey: { type: 'apiKey', in: 'header', name: 'Authorization' },
            },
          },
        }}
      />,
    );

    const navigation = within(
      screen.getByRole('navigation', { name: 'API reference' }),
    );
    fireEvent.click(navigation.getByRole('button', { name: 'Other webhooks' }));
    fireEvent.click(
      navigation.getByRole('link', { name: /Account categories updated/ }),
    );

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Account categories updated',
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByTitle('Webhook')).toHaveLength(2);
    expect(screen.queryByText('POST')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Payload' }),
    ).toBeInTheDocument();
    const payloadToggle = screen.getByRole('button', {
      name: 'Expand payload',
    });
    expect(payloadToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('quotaRemaining')).not.toBeVisible();
    fireEvent.click(payloadToggle);
    expect(screen.getByText('quotaRemaining')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    expect(
      screen.queryByRole('complementary', { name: 'Request builder' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Send request' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Authorization: API key'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Responses' }),
    ).toBeInTheDocument();
  });

  it('renders callback methods in declaration order', () => {
    window.history.replaceState({}, '', '/api/source');
    render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Callback API' },
          paths: {
            '/source': {
              get: {
                operationId: 'source',
                summary: 'Source',
                callbacks: {
                  notification: {
                    '{$request.body#/callbackUrl}': {
                      post: { summary: 'Create notification' },
                      get: { summary: 'Inspect notification' },
                    },
                  },
                },
              },
            },
          },
        }}
        basePath="/api"
      />,
    );

    const callback = screen
      .getByRole('heading', { name: 'notification' })
      .closest('.sp-callback')!;
    const operations = [...callback.querySelectorAll('.sp-operation')];
    expect(
      operations.map(
        (operation) =>
          operation.querySelector('.sp-operation-name')?.textContent,
      ),
    ).toEqual(['Create notification', 'Inspect notification']);
    expect(operations.map((operation) => operation.className)).toEqual([
      'sp-operation sp-method-post',
      'sp-operation sp-method-get',
    ]);
  });

  it('updates the request sample from endpoint parameters', () => {
    window.history.replaceState({}, '', '/api/get-company');
    render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Test API' },
          servers: [{ url: 'https://api.example.com' }],
          paths: {
            '/companies/{companyId}': {
              get: {
                tags: ['Companies'],
                summary: 'Get company',
                operationId: 'get-company',
                parameters: [
                  {
                    name: 'companyId',
                    in: 'path',
                    required: true,
                    schema: { type: 'string' },
                  },
                  {
                    name: 'page',
                    in: 'query',
                    schema: { type: 'integer', default: 1 },
                  },
                ],
              },
            },
          },
        }}
        basePath="/api"
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: /companyId/ }), {
      target: { value: 'co 123' },
    });
    expect(
      screen.getByText(
        /https:\/\/api\.example\.com\/companies\/co%20123\?page=1/,
      ),
    ).toBeInTheDocument();
  });

  it('leaves parameter examples out of request inputs', () => {
    window.history.replaceState({}, '', '/api/get-companies');
    render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Test API' },
          servers: [{ url: 'https://api.example.com' }],
          paths: {
            '/companies': {
              get: {
                summary: 'Get companies',
                operationId: 'get-companies',
                parameters: [
                  {
                    name: 'tags',
                    in: 'query',
                    example: 'region=uk && team=invoice-finance',
                    schema: { type: 'string' },
                  },
                  {
                    name: 'cursor',
                    in: 'query',
                    schema: { type: 'string', example: 'next-page' },
                  },
                ],
              },
            },
          },
        }}
        basePath="/api"
      />,
    );

    expect(screen.getByRole('textbox', { name: /tags/ })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: /cursor/ })).toHaveValue('');
    expect(
      screen.getByText(/https:\/\/api\.example\.com\/companies/),
    ).toBeInTheDocument();
  });

  it('masks authorization in the request sample while preserving the copied request', async () => {
    window.history.replaceState({}, '', '/api/get-companies');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Secured API' },
          servers: [{ url: 'https://api.example.com' }],
          security: [{ apiKey: [] }],
          paths: {
            '/companies': {
              get: { summary: 'Get companies', operationId: 'get-companies' },
            },
          },
          components: {
            securitySchemes: {
              apiKey: { type: 'apiKey', in: 'query', name: 'api_key' },
            },
          },
        }}
        basePath="/api"
      />,
    );

    const authorization = screen.getByLabelText('api_key');
    const requestBuilder = screen.getByRole('complementary', {
      name: 'Request builder',
    });
    expect(requestBuilder.parentElement).toHaveClass('sp-endpoint-hero');
    expect(requestBuilder.parentElement).toContainElement(
      screen.getByRole('heading', { level: 1, name: 'Get companies' }),
    );
    expect(requestBuilder.closest('.sp-endpoint-layout')).toBeNull();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Authorization API key' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Use the credential described under Request → Authorization: API key.',
      ),
    ).toBeInTheDocument();
    fireEvent.change(authorization, { target: { value: 'secret token' } });

    expect(
      screen.queryByText(/secret(?:\+|%20| )token/),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/api_key=%E2%80%A2%E2%80%A2/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('api_key=secret+token'),
    );

    expect(authorization).toHaveAttribute('type', 'password');
    expect(authorization).toHaveAttribute('autocomplete', 'off');
    expect(authorization).toHaveAttribute('data-1p-ignore');
    fireEvent.click(screen.getByRole('button', { name: 'Show authorization' }));
    expect(authorization).toHaveAttribute('type', 'text');
    expect(
      screen.getByRole('button', { name: 'Hide authorization' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('places overview connection details beneath the API download', () => {
    window.history.replaceState({}, '', '/api');
    render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Secured API' },
          servers: [
            { url: 'https://api.example.com', description: 'Production' },
          ],
          security: [{ apiKey: [] }],
          paths: {},
          components: {
            securitySchemes: {
              apiKey: { type: 'apiKey', in: 'header', name: 'Authorization' },
            },
          },
        }}
        basePath="/api"
      />,
    );

    const aside = screen.getByRole('complementary');
    expect(aside).toContainElement(
      screen.getByRole('heading', { name: 'Download OpenAPI description' }),
    );
    expect(aside).toContainElement(screen.getByText('https://api.example.com'));
    expect(aside).toContainElement(
      screen.getByRole('button', { name: 'Authorization: API key' }),
    );
  });

  it('selects alternative authorization methods and includes combined credentials', () => {
    window.history.replaceState({}, '', '/api/get-companies');
    render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Secured API' },
          servers: [{ url: 'https://api.example.com' }],
          security: [{ bearerAuth: [] }, { apiKey: [], tenantKey: [] }],
          paths: { '/companies': { get: { operationId: 'get-companies' } } },
          components: {
            securitySchemes: {
              bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                name: 'auth_token',
              },
              apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
              tenantKey: { type: 'apiKey', in: 'query', name: 'tenant_key' },
            },
          },
        }}
        basePath="/api"
        showThemeToggle={false}
      />,
    );

    expect(screen.getByLabelText('auth_token')).toBeInTheDocument();
    expect(screen.queryByLabelText('X-API-Key')).not.toBeInTheDocument();

    fireEvent.change(
      screen.getByRole('combobox', { name: 'Authorization method' }),
      { target: { value: '1' } },
    );
    fireEvent.change(screen.getByLabelText('X-API-Key'), {
      target: { value: 'client-secret' },
    });
    fireEvent.change(screen.getByLabelText('tenant_key'), {
      target: { value: 'tenant-secret' },
    });

    expect(screen.queryByLabelText('auth_token')).not.toBeInTheDocument();
    expect(screen.getByText(/X-API-Key: ••••••••/)).toBeInTheDocument();
    expect(
      screen.getByText(/tenant_key=%E2%80%A2%E2%80%A2/),
    ).toBeInTheDocument();
  });

  it('executes a configured API request and renders its response', async () => {
    window.history.replaceState({}, '', '/api/create-company');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'company-42' }), {
        status: 201,
        statusText: 'Created',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Test API' },
          servers: [{ url: 'https://api.example.com' }],
          paths: {
            '/companies': {
              post: {
                summary: 'Create company',
                operationId: 'create-company',
                parameters: [
                  {
                    name: 'X-Trace-ID',
                    in: 'header',
                    schema: { type: 'string', default: 'trace-1' },
                  },
                ],
                requestBody: {
                  content: {
                    'application/json': { example: { name: 'Acme' } },
                  },
                },
              },
            },
          },
        }}
        basePath="/api"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));

    expect(await screen.findByText('201 Created')).toBeInTheDocument();
    expect(screen.getByText(/"company-42"/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/companies',
      expect.objectContaining({
        method: 'POST',
        body: '{\n  "name": "Acme"\n}',
        headers: {
          'X-Trace-ID': 'trace-1',
          'Content-Type': 'application/json',
        },
      }),
    );
  });

  it('prepopulates the request body from its schema', () => {
    window.history.replaceState({}, '', '/api/create-company');
    render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Test API' },
          paths: {
            '/companies': {
              post: {
                summary: 'Create company',
                operationId: 'create-company',
                requestBody: {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', readOnly: true },
                          name: { type: 'string', example: 'Acme' },
                          active: { type: 'boolean', default: false },
                          tags: { type: 'array', items: { type: 'string' } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }}
        basePath="/api"
      />,
    );

    expect(screen.getByRole('textbox', { name: 'Request body' })).toHaveValue(
      JSON.stringify(
        {
          name: 'Acme',
          active: false,
          tags: ['string'],
        },
        null,
        2,
      ),
    );
    expect(screen.getAllByText(/"name": "Acme"/)).toHaveLength(2);
  });

  it('sizes the request body input to its content', () => {
    window.history.replaceState({}, '', '/api/create-company');
    let scrollHeight = 96;
    const scrollHeightSpy = vi
      .spyOn(HTMLTextAreaElement.prototype, 'scrollHeight', 'get')
      .mockImplementation(() => scrollHeight);
    render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Test API' },
          paths: {
            '/companies': {
              post: {
                summary: 'Create company',
                operationId: 'create-company',
                requestBody: {
                  content: {
                    'application/json': { example: { name: 'Acme' } },
                  },
                },
              },
            },
          },
        }}
        basePath="/api"
        showThemeToggle={false}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Request body' });
    expect(input).toHaveStyle({ height: '96px' });

    scrollHeight = 144;
    fireEvent.change(input, {
      target: { value: '{\n  "name": "Acme",\n  "active": true\n}' },
    });
    expect(input).toHaveStyle({ height: '144px' });
    scrollHeightSpy.mockRestore();
  });

  it('does not execute while a required parameter is missing', () => {
    window.history.replaceState({}, '', '/api/get-company');
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Test API' },
          servers: [{ url: 'https://api.example.com' }],
          paths: {
            '/companies/{companyId}': {
              get: {
                summary: 'Get company',
                operationId: 'get-company',
                parameters: [
                  {
                    name: 'companyId',
                    in: 'path',
                    required: true,
                    schema: { type: 'string' },
                  },
                ],
              },
            },
          },
        }}
        basePath="/api"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));

    expect(
      screen.getByText('Add the required companyId parameter.'),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('clears the request result when navigating to another endpoint', async () => {
    window.history.replaceState({}, '', '/api/get-companies');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new TypeError('Failed to fetch'),
    );
    render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Test API' },
          servers: [{ url: 'https://api.example.com' }],
          paths: {
            '/companies': {
              get: {
                tags: ['Companies'],
                summary: 'List companies',
                operationId: 'get-companies',
              },
            },
            '/customers': {
              get: {
                tags: ['Companies'],
                summary: 'List customers',
                operationId: 'get-customers',
              },
            },
          },
        }}
        basePath="/api"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));
    expect(await screen.findByText('Request failed')).toBeInTheDocument();

    const navigation = within(
      screen.getByRole('navigation', { name: 'API reference' }),
    );
    fireEvent.click(navigation.getByRole('link', { name: /List customers/ }));

    expect(
      screen.getByRole('heading', { level: 1, name: 'List customers' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Request failed')).not.toBeInTheDocument();
  });

  it('highlights parameters in the endpoint path', () => {
    window.history.replaceState({}, '', '/api/get-company');
    render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Test API' },
          paths: {
            '/companies/{companyId}/connections': {
              get: {
                summary: 'Get company connections',
                operationId: 'get-company',
              },
            },
          },
        }}
        basePath="/api"
      />,
    );

    expect(screen.getByText('{companyId}')).toHaveClass('sp-path-parameter');
  });

  it('uses an asterisk for required parameters and response fields', () => {
    window.history.replaceState({}, '', '/api/get-company');
    const { container } = render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Test API' },
          paths: {
            '/companies/{companyId}': {
              get: {
                summary: 'Get company',
                operationId: 'get-company',
                parameters: [
                  {
                    name: 'companyId',
                    in: 'path',
                    required: true,
                    schema: { type: 'string' },
                  },
                ],
                responses: {
                  '200': {
                    description: 'Company found',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          required: ['id'],
                          properties: { id: { type: 'string' } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }}
        basePath="/api"
      />,
    );

    expect(
      [...container.querySelectorAll('.sp-required')].map(
        (indicator) => indicator.textContent,
      ),
    ).toEqual(['*', '*']);
  });

  it('switches between responses in the full-width response section', () => {
    window.history.replaceState({}, '', '/api/get-company');
    const { container } = render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Test API' },
          paths: {
            '/companies/{companyId}': {
              get: {
                summary: 'Get company',
                operationId: 'get-company',
                responses: {
                  '200': {
                    description: 'Company found',
                    headers: {
                      'request-ref': {
                        description: 'A request identifier.',
                        schema: { type: 'string' },
                      },
                    },
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            state: {
                              type: 'string',
                              description: 'The current company state.',
                            },
                          },
                          example: { state: 'generic' },
                        },
                        examples: {
                          found: {
                            summary: 'Found company',
                            value: { state: 'found' },
                          },
                          cached: {
                            summary: 'Cached company',
                            value: { state: 'cached' },
                          },
                        },
                      },
                    },
                  },
                  '404': {
                    description: 'Company missing',
                    content: {
                      'application/json': { example: { state: 'missing' } },
                    },
                  },
                },
              },
            },
          },
        }}
        basePath="/api"
        showThemeToggle={false}
      />,
    );

    expect(screen.getByRole('tab', { name: '200' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tabpanel').parentElement).toHaveClass(
      'sp-response-content',
    );
    expect(
      container.querySelector('.sp-response-summary')?.parentElement,
    ).toHaveClass('sp-response-content');
    const headers = screen.getByText('Headers').closest('.sp-detail-list');
    const responseBody = container.querySelector('.sp-media-list');
    expect(headers?.compareDocumentPosition(responseBody!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(
      screen.getByRole('combobox', { name: 'Response example' }),
    ).toHaveValue('0');
    expect(
      screen.queryByText('The current company state.'),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Show details for state' }),
    );
    expect(screen.getByText('The current company state.')).toBeInTheDocument();
    expect(container.querySelector('.sp-schema-example')).toHaveTextContent(
      'Examplefound',
    );
    expect(screen.getByText(/"found"/)).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Response example' }),
      { target: { value: '1' } },
    );
    expect(container.querySelector('.sp-schema-example')).toHaveTextContent(
      'Examplecached',
    );
    expect(screen.getByText(/"cached"/)).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Response example' }),
      { target: { value: '2' } },
    );
    expect(screen.getByText(/"generic"/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '404' }));

    expect(screen.getByRole('tab', { name: '404' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByText('Company missing')).toBeInTheDocument();
    expect(screen.getAllByText(/"missing"/)).toHaveLength(1);
  });

  it('builds an example response payload from schema property examples', () => {
    window.history.replaceState({}, '', '/api/list-fruit');
    render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Orchard API' },
          paths: {
            '/fruit': {
              get: {
                summary: 'List fruit',
                operationId: 'list-fruit',
                responses: {
                  '200': {
                    description: 'Fruit in the orchard.',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Fruit' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          components: {
            schemas: {
              Fruit: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Apple' },
                  variety: { type: 'string', example: 'Discovery' },
                  pickedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        }}
        basePath="/api"
      />,
    );

    const responseExample = screen
      .getByText('Response example')
      .closest('.sp-code-block');
    expect(responseExample).toBeInTheDocument();
    expect(responseExample?.textContent).toContain('"name": "Apple"');
    expect(responseExample?.textContent).toContain('"variety": "Discovery"');
    expect(responseExample?.textContent).toContain(
      '"pickedAt": "2024-01-01T00:00:00Z"',
    );
  });

  it('collapses and expands endpoint groups', () => {
    const { unmount } = render(<Speccy spec={spec} />);

    const toggle = screen.getByRole('button', { name: 'Companies' });
    const navigation = screen.getByRole('navigation', {
      name: 'API reference',
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(
      within(navigation).queryByRole('link', { name: /List companies/ }),
    ).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(
      within(navigation).getByRole('link', { name: /List companies/ }),
    ).toBeInTheDocument();

    unmount();
    render(<Speccy spec={spec} />);

    expect(screen.getByRole('button', { name: 'Companies' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(
      within(
        screen.getByRole('navigation', { name: 'API reference' }),
      ).getByRole('link', { name: /List companies/ }),
    ).toBeInTheDocument();
  });

  it('allows the active endpoint group to be collapsed', () => {
    window.history.replaceState({}, '', '/api/get-companies');
    render(<Speccy spec={spec} basePath="/api" />);

    const navigation = within(
      screen.getByRole('navigation', { name: 'API reference' }),
    );
    const toggle = navigation.getByRole('button', { name: 'Companies' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(
      navigation.getByRole('link', { name: /List companies/ }),
    ).toHaveAttribute('aria-current', 'page');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(
      navigation.queryByRole('link', { name: /List companies/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'List companies' }),
    ).toBeInTheDocument();
  });

  it('renders configured tag and group order without dropping ungrouped tags', () => {
    render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Grouped API' },
          tags: [{ name: 'Setup' }, { name: 'Sign-in' }, { name: 'Internal' }],
          'x-tagGroups': [
            { name: 'Users & authentication', tags: ['Sign-in', 'Setup'] },
          ],
          paths: {
            '/users': { post: { tags: ['Setup'], summary: 'Register a user' } },
            '/sessions': { post: { tags: ['Sign-in'], summary: 'Sign in' } },
            '/internal': {
              get: { tags: ['Internal'], summary: 'Internal operation' },
            },
          },
        }}
      />,
    );

    const navigation = within(
      screen.getByRole('navigation', { name: 'API reference' }),
    );
    const group = navigation
      .getByRole('heading', { name: 'Users & authentication' })
      .closest('section')!;
    expect(
      within(group)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Sign-in', 'Setup']);
    expect(
      navigation.getByRole('button', { name: 'Internal' }),
    ).toBeInTheDocument();
  });

  it('groups operations within a tag using x-tagSubgroup', () => {
    render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Subgrouped API' },
          tags: [{ name: 'Payments' }],
          paths: {
            '/payments/{paymentId}/archive': {
              post: { tags: ['Payments'], summary: 'Archive payment' },
            },
            '/payments': {
              post: {
                tags: ['Payments'],
                summary: 'Create payment',
                'x-tagSubgroup': 'Payment lifecycle',
              },
              get: {
                tags: ['Payments'],
                summary: 'Get payment',
                'x-tagSubgroup': 'Payment lifecycle',
              },
            },
            '/payments/{paymentId}/events': {
              get: {
                tags: ['Payments'],
                summary: 'List payment events',
                'x-tagSubgroup': 'Reconciliation',
              },
            },
          },
        }}
        showThemeToggle={false}
      />,
    );

    const navigation = within(
      screen.getByRole('navigation', { name: 'API reference' }),
    );
    fireEvent.click(navigation.getByRole('button', { name: 'Payments' }));

    expect(
      navigation.getByRole('heading', { name: 'Payment lifecycle' }),
    ).toBeInTheDocument();
    expect(
      navigation.getByRole('heading', { name: 'Reconciliation' }),
    ).toBeInTheDocument();
    expect(
      navigation.getByRole('link', { name: /Create payment/ }),
    ).toBeInTheDocument();
    expect(
      navigation.getByRole('link', { name: /Get payment/ }),
    ).toBeInTheDocument();
    expect(
      navigation.getByRole('link', { name: /List payment events/ }),
    ).toBeInTheDocument();
    expect(
      navigation.getByRole('link', { name: /Archive payment/ }),
    ).toBeInTheDocument();

    const items = [
      ...navigation.getByRole('button', { name: 'Payments' })
        .nextElementSibling!.children,
    ];
    expect(items.map((item) => item.textContent)).toEqual([
      'Overview',
      'Archive paymentPOST',
      'Payment lifecycleCreate paymentPOSTGet paymentGET',
      'ReconciliationList payment eventsGET',
    ]);
  });

  it('restores authorization and parameter values', () => {
    window.history.replaceState({}, '', '/api/get-company');
    const securedSpec = {
      openapi: '3.1.0',
      info: { title: 'Secured API' },
      servers: [{ url: 'https://api.example.com' }],
      security: [{ bearerAuth: [] }],
      paths: {
        '/companies/{companyId}': {
          get: {
            summary: 'Get company',
            operationId: 'get-company',
            parameters: [
              {
                name: 'companyId',
                in: 'path',
                required: true,
                schema: { type: 'string' },
              },
            ],
          },
        },
      },
      components: {
        securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } },
      },
    };
    const { unmount } = render(<Speccy spec={securedSpec} basePath="/api" />);

    fireEvent.change(screen.getByRole('textbox', { name: /companyId/ }), {
      target: { value: 'company-42' },
    });
    fireEvent.change(screen.getByLabelText('bearerAuth'), {
      target: { value: 'secret-token' },
    });
    unmount();
    render(<Speccy spec={securedSpec} basePath="/api" />);

    expect(screen.getByRole('textbox', { name: /companyId/ })).toHaveValue(
      'company-42',
    );
    expect(screen.getByLabelText('bearerAuth')).toHaveValue('secret-token');
    expect(
      screen.getByText(/Authorization: Bearer ••••••••/),
    ).toBeInTheDocument();
  });

  it('shares parameter and authorization values between endpoints', () => {
    window.history.replaceState({}, '', '/api/get-company');
    render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Secured API' },
          servers: [{ url: 'https://api.example.com' }],
          security: [{ bearerAuth: [] }],
          tags: [{ name: 'Companies' }],
          paths: {
            '/companies/{companyId}': {
              get: {
                tags: ['Companies'],
                summary: 'Get company',
                operationId: 'get-company',
                parameters: [
                  {
                    name: 'companyId',
                    in: 'path',
                    required: true,
                    schema: { type: 'string' },
                  },
                ],
              },
            },
            '/companies/{companyId}/people': {
              get: {
                tags: ['Companies'],
                summary: 'List company people',
                operationId: 'list-company-people',
                parameters: [
                  {
                    name: 'companyId',
                    in: 'path',
                    required: true,
                    schema: { type: 'string' },
                  },
                ],
              },
            },
          },
          components: {
            securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } },
          },
        }}
        basePath="/api"
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: /companyId/ }), {
      target: { value: 'company-42' },
    });
    fireEvent.change(screen.getByLabelText('bearerAuth'), {
      target: { value: 'secret-token' },
    });
    fireEvent.click(
      within(
        screen.getByRole('navigation', { name: 'API reference' }),
      ).getByRole('link', { name: /List company people/ }),
    );

    expect(screen.getByRole('textbox', { name: /companyId/ })).toHaveValue(
      'company-42',
    );
    expect(screen.getByLabelText('bearerAuth')).toHaveValue('secret-token');
  });

  it('filters endpoints in the sidebar without opening full search', () => {
    render(
      <Speccy
        spec={{
          ...spec,
          paths: {
            ...spec.paths,
            '/people': { get: { tags: ['People'], summary: 'List people' } },
          },
        }}
      />,
    );
    const navigation = within(
      screen.getByRole('navigation', { name: 'API reference' }),
    );

    fireEvent.change(
      navigation.getByRole('textbox', { name: 'Filter endpoints' }),
      { target: { value: 'people' } },
    );

    expect(
      navigation.queryByRole('button', { name: 'Companies' }),
    ).not.toBeInTheDocument();
    expect(navigation.getByRole('button', { name: 'People' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(
      navigation.getByRole('link', { name: /List people/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: 'Search API reference' }),
    ).not.toBeInTheDocument();
  });

  it('filters all webhooks across tag groups by operation type', () => {
    render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Webhook API' },
          paths: {
            '/companies': {
              get: { tags: ['Companies'], summary: 'List companies' },
            },
          },
          tags: [{ name: 'Companies' }, { name: 'Payments' }],
          'x-tagGroups': [
            { name: 'Core API', tags: ['Companies'] },
            { name: 'Money movement', tags: ['Payments'] },
          ],
          webhooks: {
            companyUpdated: {
              post: { tags: ['Companies'], summary: 'Company updated' },
            },
            paymentReceived: {
              post: { tags: ['Payments'], summary: 'Payment received' },
            },
            systemReady: { post: { summary: 'System ready' } },
          },
        }}
      />,
    );
    const navigation = within(
      screen.getByRole('navigation', { name: 'API reference' }),
    );

    fireEvent.change(
      navigation.getByRole('textbox', { name: 'Filter endpoints' }),
      { target: { value: 'webhook' } },
    );

    expect(
      navigation.getByRole('heading', { name: 'Core API' }),
    ).toBeInTheDocument();
    expect(
      navigation.getByRole('heading', { name: 'Money movement' }),
    ).toBeInTheDocument();
    expect(
      navigation.getByRole('link', { name: /Company updated/ }),
    ).toBeInTheDocument();
    expect(
      navigation.getByRole('link', { name: /Payment received/ }),
    ).toBeInTheDocument();
    expect(
      navigation.getByRole('link', { name: /System ready/ }),
    ).toBeInTheDocument();
    expect(
      navigation.queryByRole('link', { name: /List companies/ }),
    ).not.toBeInTheDocument();
  });

  it('shows and clears an empty sidebar filter', () => {
    render(<Speccy spec={spec} />);
    const navigation = within(
      screen.getByRole('navigation', { name: 'API reference' }),
    );
    const filter = navigation.getByRole('textbox', {
      name: 'Filter endpoints',
    });

    fireEvent.change(filter, { target: { value: 'no such endpoint' } });
    expect(navigation.getByText('No matching endpoints')).toBeInTheDocument();
    fireEvent.click(navigation.getByRole('button', { name: 'Clear filter' }));

    expect(filter).toHaveValue('');
    expect(
      navigation.getByRole('button', { name: 'Companies' }),
    ).toBeInTheDocument();
  });

  it('opens quick search and navigates to a matching endpoint', () => {
    const scrollIntoView = vi.mocked(Element.prototype.scrollIntoView);
    scrollIntoView.mockClear();
    render(<Speccy spec={spec} />);
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    const search = screen.getByRole('textbox', {
      name: 'Search API reference',
    });
    fireEvent.change(search, {
      target: { value: 'list companies' },
    });
    fireEvent.keyDown(search, { key: 'Enter' });

    expect(window.location.pathname).toBe('/get-companies');
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    expect(
      screen.queryByRole('dialog', { name: 'Search API reference' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'List companies' }),
    ).toBeInTheDocument();
  });

  it('opens quick search with the platform shortcut', () => {
    render(<Speccy spec={spec} />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    expect(
      screen.getByRole('dialog', { name: 'Search API reference' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Search API reference' }),
    ).toHaveFocus();
  });

  it('scrolls the active result into view during keyboard navigation', () => {
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    render(<Speccy spec={spec} />);
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    scrollIntoView.mockClear();

    fireEvent.keyDown(
      screen.getByRole('textbox', { name: 'Search API reference' }),
      { key: 'ArrowDown' },
    );
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: originalScrollIntoView,
    });

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    expect(screen.getByRole('option', { name: /Companies/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('shows an empty search state and closes with Escape', () => {
    render(<Speccy spec={spec} />);
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const search = screen.getByRole('textbox', {
      name: 'Search API reference',
    });

    fireEvent.change(search, { target: { value: 'no such endpoint' } });
    expect(
      screen.getByText('No results for “no such endpoint”.'),
    ).toBeInTheDocument();
    fireEvent.keyDown(search, { key: 'Escape' });

    expect(
      screen.queryByRole('dialog', { name: 'Search API reference' }),
    ).not.toBeInTheDocument();
  });

  it('finds named reusable components', () => {
    render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Components API' },
          paths: {},
          components: { schemas: { CompanyRecord: { type: 'object' } } },
        }}
      />,
    );
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    const search = screen.getByRole('textbox', {
      name: 'Search API reference',
    });
    fireEvent.change(search, { target: { value: 'CompanyRecord' } });

    expect(
      screen.getByRole('option', { name: /CompanyRecord/ }),
    ).toBeInTheDocument();
    fireEvent.keyDown(search, { key: 'Enter' });

    expect(window.location.pathname).toBe('/reference/schemas');
    expect(window.location.hash).toBe('#component-schemas-company-record');
    expect(
      screen.getByRole('heading', { name: 'CompanyRecord' }),
    ).toBeInTheDocument();
  });

  it('renders an on-page index for reusable components', () => {
    render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Components API' },
          paths: {},
          components: {
            schemas: {
              Email: { type: 'string' },
              SensitivePassword: { type: 'object' },
            },
          },
        }}
        route={{ page: 'reference', section: 'schemas' }}
      />,
    );

    const toc = screen.getByRole('navigation', {
      name: 'Schemas on this page',
    });
    expect(within(toc).getByRole('link', { name: 'Email' })).toHaveAttribute(
      'href',
      '#component-schemas-email',
    );
    expect(
      within(toc).getByRole('link', { name: 'SensitivePassword' }),
    ).toHaveAttribute('href', '#component-schemas-sensitive-password');
    expect(
      screen.getByRole('combobox', { name: 'Jump to schemas' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Email' }).closest('article'),
    ).toHaveAttribute('id', 'component-schemas-email');
  });

  it('renders untagged webhooks, reusable components, security, and every media type', () => {
    render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Complete API' },
          servers: [
            { url: 'https://one.example' },
            { url: 'https://two.example', description: 'Sandbox' },
          ],
          paths: {},
          webhooks: {
            event: {
              post: {
                summary: 'Event delivered',
                responses: { '204': { description: 'Accepted' } },
              },
            },
          },
          components: {
            schemas: {
              Pet: {
                type: 'object',
                properties: { name: { type: 'string', writeOnly: true } },
              },
            },
            responses: {
              PetResponse: {
                description: 'A pet',
                content: {
                  'application/json': {
                    schema: { type: 'object' },
                    example: { name: 'Milo' },
                  },
                  'application/xml': { schema: { type: 'string' } },
                },
              },
            },
            securitySchemes: {
              bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
              },
            },
          },
        }}
      />,
    );

    const navigation = within(
      screen.getByRole('navigation', { name: 'API reference' }),
    );
    fireEvent.click(navigation.getByRole('button', { name: 'Other webhooks' }));
    fireEvent.click(navigation.getByRole('link', { name: /Event delivered/ }));
    expect(
      screen.getByRole('heading', { level: 1, name: 'Event delivered' }),
    ).toBeInTheDocument();

    fireEvent.click(navigation.getByRole('button', { name: 'Reference' }));
    fireEvent.click(navigation.getByRole('link', { name: 'Schemas' }));
    expect(window.location.pathname).toBe('/reference/schemas');
    expect(
      screen.getByRole('heading', { name: 'Schemas' }),
    ).toBeInTheDocument();

    fireEvent.click(navigation.getByRole('link', { name: 'Security schemes' }));
    expect(window.location.pathname).toBe('/reference/security-schemes');
    expect(
      screen.getByRole('heading', { name: 'Security schemes' }),
    ).toBeInTheDocument();

    fireEvent.click(navigation.getByRole('link', { name: 'Responses' }));
    expect(screen.getByText('application/json')).toBeInTheDocument();
    expect(screen.getByText('application/xml')).toBeInTheDocument();

    fireEvent.click(navigation.getByRole('link', { name: /Complete API/ }));
    expect(screen.getByText('https://one.example')).toBeInTheDocument();
    expect(screen.getByText('https://two.example')).toBeInTheDocument();
  });

  it('restores a reference page from the URL', () => {
    window.history.replaceState({}, '', '/docs/reference/schemas');
    const referenceSpec = {
      openapi: '3.1.0',
      info: { title: 'Reference API' },
      paths: {},
      components: { schemas: { Pet: { type: 'object' } } },
    };
    const { unmount } = render(
      <Speccy spec={referenceSpec} basePath="/docs" />,
    );

    expect(
      screen.getByRole('heading', { name: 'Schemas' }),
    ).toBeInTheDocument();
    const navigation = within(
      screen.getByRole('navigation', { name: 'API reference' }),
    );
    const toggle = navigation.getByRole('button', { name: 'Reference' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(
      navigation.queryByRole('link', { name: 'Schemas' }),
    ).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(navigation.getByRole('link', { name: 'Schemas' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    unmount();
    render(<Speccy spec={referenceSpec} basePath="/docs" />);

    expect(screen.getByRole('button', { name: 'Reference' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});
