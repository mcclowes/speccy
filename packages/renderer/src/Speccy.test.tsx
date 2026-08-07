import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Speccy } from './Speccy';

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
  it('renders each endpoint on its own route', () => {
    window.history.replaceState({}, '', '/api');
    render(<Speccy spec={spec} basePath="/api" />);

    const navigation = screen.getByRole('navigation', { name: 'API reference' });
    fireEvent.click(within(navigation).getByRole('button', { name: 'Companies' }));
    fireEvent.click(within(navigation).getByRole('link', { name: /List companies/ }));

    expect(window.location.pathname).toBe('/api/get-companies');
    expect(within(navigation).getByRole('link', { name: /List companies/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { level: 1, name: 'List companies' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Request builder' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Test API' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '← API overview' }));
    expect(window.location.pathname).toBe('/api');
    expect(screen.getByRole('heading', { name: 'Test API' })).toBeInTheDocument();
  });

  it('opens an endpoint route directly', () => {
    window.history.replaceState({}, '', '/api/get-companies');
    render(<Speccy spec={spec} basePath="/api" />);

    expect(screen.getByRole('heading', { level: 1, name: 'List companies' })).toBeInTheDocument();
  });

  it('opens a tag overview from an explicit navigation item', () => {
    render(<Speccy spec={{
      ...spec,
      tags: [{ name: 'Companies', description: 'Create and manage companies.' }],
    }} basePath="/api" />);

    const navigation = within(screen.getByRole('navigation', { name: 'API reference' }));
    fireEvent.click(navigation.getByRole('button', { name: 'Companies' }));

    expect(window.location.pathname).toBe('/');
    fireEvent.click(navigation.getByRole('link', { name: 'Overview' }));

    expect(window.location.pathname).toBe('/api/tags/companies');
    expect(navigation.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { level: 1, name: 'Companies' })).toBeInTheDocument();
    expect(screen.getByText('Create and manage companies.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Operations' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /List companies.*GET.*companies/ })).toBeInTheDocument();
  });

  it('opens a tag overview route directly', () => {
    window.history.replaceState({}, '', '/api/tags/companies');
    render(<Speccy spec={spec} basePath="/api" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Companies' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Operations' })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'API reference' })).getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows tagged webhooks under their tag and untagged webhooks in the reference section', () => {
    render(<Speccy spec={{
      openapi: '3.1.0', info: { title: 'Webhook API' }, paths: {},
      webhooks: {
        companyUpdated: { post: { tags: ['Companies'], summary: 'Company updated' } },
        systemReady: { post: { summary: 'System ready' } },
      },
    }} basePath="/api" />);

    const navigation = within(screen.getByRole('navigation', { name: 'API reference' }));
    fireEvent.click(navigation.getByRole('button', { name: 'Companies' }));
    expect(navigation.getByRole('link', { name: /Company updated/ })).toBeInTheDocument();
    expect(navigation.queryByRole('link', { name: /System ready/ })).not.toBeInTheDocument();

    fireEvent.click(navigation.getByRole('link', { name: /Company updated/ }));
    expect(screen.getByRole('heading', { level: 1, name: 'Company updated' })).toBeInTheDocument();

    fireEvent.click(navigation.getByRole('button', { name: 'Reference' }));
    fireEvent.click(navigation.getByRole('link', { name: 'Webhooks' }));
    const content = within(screen.getByRole('main'));
    expect(content.getByText('System ready')).toBeInTheDocument();
    expect(content.queryByText('Company updated')).not.toBeInTheDocument();
  });

  it('updates the request sample from endpoint parameters', () => {
    window.history.replaceState({}, '', '/api/get-company');
    render(<Speccy spec={{
      openapi: '3.1.0', info: { title: 'Test API' }, servers: [{ url: 'https://api.example.com' }],
      paths: { '/companies/{companyId}': { get: {
        tags: ['Companies'], summary: 'Get company', operationId: 'get-company',
        parameters: [
          { name: 'companyId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        ],
      } } },
    }} basePath="/api" />);

    fireEvent.change(screen.getByRole('textbox', { name: /companyId/ }), { target: { value: 'co 123' } });
    expect(screen.getByText(/https:\/\/api\.example\.com\/companies\/co%20123\?page=1/)).toBeInTheDocument();
  });

  it('executes a configured API request and renders its response', async () => {
    window.history.replaceState({}, '', '/api/create-company');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ id: 'company-42' }), {
      status: 201,
      statusText: 'Created',
      headers: { 'Content-Type': 'application/json' },
    }));
    render(<Speccy spec={{
      openapi: '3.1.0', info: { title: 'Test API' }, servers: [{ url: 'https://api.example.com' }],
      paths: { '/companies': { post: {
        summary: 'Create company', operationId: 'create-company',
        parameters: [{ name: 'X-Trace-ID', in: 'header', schema: { type: 'string', default: 'trace-1' } }],
        requestBody: { content: { 'application/json': { example: { name: 'Acme' } } } },
      } } },
    }} basePath="/api" />);

    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));

    expect(await screen.findByText('201 Created')).toBeInTheDocument();
    expect(screen.getByText(/"company-42"/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/companies', expect.objectContaining({
      method: 'POST',
      body: '{\n  "name": "Acme"\n}',
      headers: { 'X-Trace-ID': 'trace-1', 'Content-Type': 'application/json' },
    }));
  });

  it('does not execute while a required parameter is missing', () => {
    window.history.replaceState({}, '', '/api/get-company');
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    render(<Speccy spec={{
      openapi: '3.1.0', info: { title: 'Test API' }, servers: [{ url: 'https://api.example.com' }],
      paths: { '/companies/{companyId}': { get: {
        summary: 'Get company', operationId: 'get-company',
        parameters: [{ name: 'companyId', in: 'path', required: true, schema: { type: 'string' } }],
      } } },
    }} basePath="/api" />);

    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));

    expect(screen.getByText('Add the required companyId parameter.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('clears the request result when navigating to another endpoint', async () => {
    window.history.replaceState({}, '', '/api/get-companies');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    render(<Speccy spec={{
      openapi: '3.1.0', info: { title: 'Test API' }, servers: [{ url: 'https://api.example.com' }],
      paths: {
        '/companies': { get: { tags: ['Companies'], summary: 'List companies', operationId: 'get-companies' } },
        '/customers': { get: { tags: ['Companies'], summary: 'List customers', operationId: 'get-customers' } },
      },
    }} basePath="/api" />);

    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));
    expect(await screen.findByText('Request failed')).toBeInTheDocument();

    const navigation = within(screen.getByRole('navigation', { name: 'API reference' }));
    fireEvent.click(navigation.getByRole('link', { name: /List customers/ }));

    expect(screen.getByRole('heading', { level: 1, name: 'List customers' })).toBeInTheDocument();
    expect(screen.queryByText('Request failed')).not.toBeInTheDocument();
  });

  it('highlights parameters in the endpoint path', () => {
    window.history.replaceState({}, '', '/api/get-company');
    render(<Speccy spec={{
      openapi: '3.1.0', info: { title: 'Test API' },
      paths: { '/companies/{companyId}/connections': { get: {
        summary: 'Get company connections', operationId: 'get-company',
      } } },
    }} basePath="/api" />);

    expect(screen.getByText('{companyId}')).toHaveClass('sp-path-parameter');
  });

  it('switches between responses in the full-width response section', () => {
    window.history.replaceState({}, '', '/api/get-company');
    render(<Speccy spec={{
      openapi: '3.1.0', info: { title: 'Test API' },
      paths: { '/companies/{companyId}': { get: {
        summary: 'Get company', operationId: 'get-company',
        responses: {
          '200': { description: 'Company found', content: { 'application/json': {
            schema: { type: 'object', properties: { state: { type: 'string', description: 'The current company state.' } }, example: { state: 'generic' } },
            examples: {
              found: { summary: 'Found company', value: { state: 'found' } },
              cached: { summary: 'Cached company', value: { state: 'cached' } },
            },
          } } },
          '404': { description: 'Company missing', content: { 'application/json': { example: { state: 'missing' } } } },
        },
      } } },
    }} basePath="/api" />);

    expect(screen.getByRole('tab', { name: '200' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('combobox', { name: 'Response example' })).toHaveValue('0');
    expect(screen.getByText('The current company state.')).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.tagName === 'P' && element.textContent === 'Example: found')).toBeInTheDocument();
    expect(screen.getByText(/"found"/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Response example' }), { target: { value: '1' } });
    expect(screen.getByText((_, element) => element?.tagName === 'P' && element.textContent === 'Example: cached')).toBeInTheDocument();
    expect(screen.getByText(/"cached"/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Response example' }), { target: { value: '2' } });
    expect(screen.getByText(/"generic"/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '404' }));

    expect(screen.getByRole('tab', { name: '404' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Company missing')).toBeInTheDocument();
    expect(screen.getAllByText(/"missing"/)).toHaveLength(1);
  });

  it('collapses and expands endpoint groups', () => {
    const { unmount } = render(<Speccy spec={spec} />);

    const toggle = screen.getByRole('button', { name: 'Companies' });
    const navigation = screen.getByRole('navigation', { name: 'API reference' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(navigation).queryByRole('link', { name: /List companies/ })).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(navigation).getByRole('link', { name: /List companies/ })).toBeInTheDocument();

    unmount();
    render(<Speccy spec={spec} />);

    expect(screen.getByRole('button', { name: 'Companies' })).toHaveAttribute('aria-expanded', 'true');
    expect(within(screen.getByRole('navigation', { name: 'API reference' })).getByRole('link', { name: /List companies/ })).toBeInTheDocument();
  });

  it('renders Redocly tag groups above their tags', () => {
    render(<Speccy spec={{
      openapi: '3.1.0', info: { title: 'Grouped API' },
      tags: [{ name: 'Setup' }, { name: 'Sign-in' }, { name: 'Internal' }],
      'x-tagGroups': [{ name: 'Users & authentication', tags: ['Setup', 'Sign-in'] }],
      paths: {
        '/users': { post: { tags: ['Setup'], summary: 'Register a user' } },
        '/sessions': { post: { tags: ['Sign-in'], summary: 'Sign in' } },
        '/internal': { get: { tags: ['Internal'], summary: 'Internal operation' } },
      },
    }} />);

    const navigation = within(screen.getByRole('navigation', { name: 'API reference' }));
    expect(navigation.getByRole('heading', { name: 'Users & authentication' })).toBeInTheDocument();
    expect(navigation.getByRole('button', { name: 'Setup' })).toBeInTheDocument();
    expect(navigation.getByRole('button', { name: 'Sign-in' })).toBeInTheDocument();
    expect(navigation.queryByRole('button', { name: 'Internal' })).not.toBeInTheDocument();
  });

  it('restores authorization and parameter values', () => {
    window.history.replaceState({}, '', '/api/get-company');
    const securedSpec = {
      openapi: '3.1.0', info: { title: 'Secured API' }, servers: [{ url: 'https://api.example.com' }],
      security: [{ bearerAuth: [] }],
      paths: { '/companies/{companyId}': { get: {
        summary: 'Get company', operationId: 'get-company',
        parameters: [{ name: 'companyId', in: 'path', required: true, schema: { type: 'string' } }],
      } } },
      components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } } },
    };
    const { unmount } = render(<Speccy spec={securedSpec} basePath="/api" />);

    fireEvent.change(screen.getByRole('textbox', { name: /companyId/ }), { target: { value: 'company-42' } });
    fireEvent.change(screen.getByLabelText('bearerAuth'), { target: { value: 'secret-token' } });
    unmount();
    render(<Speccy spec={securedSpec} basePath="/api" />);

    expect(screen.getByRole('textbox', { name: /companyId/ })).toHaveValue('company-42');
    expect(screen.getByLabelText('bearerAuth')).toHaveValue('secret-token');
    expect(screen.getByText(/Authorization: Bearer secret-token/)).toBeInTheDocument();
  });

  it('opens quick search and navigates to a matching endpoint', () => {
    render(<Speccy spec={spec} />);
    fireEvent.click(screen.getByRole('button', { name: 'Search API reference' }));

    const search = screen.getByRole('textbox', { name: 'Search API reference' });
    fireEvent.change(search, {
      target: { value: 'list companies' },
    });
    fireEvent.keyDown(search, { key: 'Enter' });

    expect(window.location.pathname).toBe('/get-companies');
    expect(screen.queryByRole('dialog', { name: 'Search API reference' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'List companies' })).toBeInTheDocument();
  });

  it('opens quick search with the platform shortcut', () => {
    render(<Speccy spec={spec} />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    expect(screen.getByRole('dialog', { name: 'Search API reference' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Search API reference' })).toHaveFocus();
  });

  it('shows an empty search state and closes with Escape', () => {
    render(<Speccy spec={spec} />);
    fireEvent.click(screen.getByRole('button', { name: 'Search API reference' }));
    const search = screen.getByRole('textbox', { name: 'Search API reference' });

    fireEvent.change(search, { target: { value: 'no such endpoint' } });
    expect(screen.getByText('No results for “no such endpoint”.')).toBeInTheDocument();
    fireEvent.keyDown(search, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: 'Search API reference' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search API reference' })).toHaveFocus();
  });

  it('finds named reusable components', () => {
    render(<Speccy spec={{
      openapi: '3.1.0', info: { title: 'Components API' }, paths: {},
      components: { schemas: { CompanyRecord: { type: 'object' } } },
    }} />);
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    const search = screen.getByRole('textbox', { name: 'Search API reference' });
    fireEvent.change(search, { target: { value: 'CompanyRecord' } });

    expect(screen.getByRole('option', { name: /CompanyRecord/ })).toBeInTheDocument();
    fireEvent.keyDown(search, { key: 'Enter' });

    expect(window.location.pathname).toBe('/reference/schemas');
    expect(screen.getByRole('heading', { name: 'CompanyRecord' })).toBeInTheDocument();
  });

  it('renders webhooks, reusable components, security, and every media type', () => {
    render(<Speccy spec={{
      openapi: '3.1.0', info: { title: 'Complete API' },
      servers: [{ url: 'https://one.example' }, { url: 'https://two.example', description: 'Sandbox' }],
      paths: {},
      webhooks: { event: { post: { summary: 'Event delivered', responses: { '204': { description: 'Accepted' } } } } },
      components: {
        schemas: { Pet: { type: 'object', properties: { name: { type: 'string', writeOnly: true } } } },
        responses: { PetResponse: { description: 'A pet', content: {
          'application/json': { schema: { type: 'object' }, example: { name: 'Milo' } },
          'application/xml': { schema: { type: 'string' } },
        } } },
        securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      },
    }} />);

    const navigation = within(screen.getByRole('navigation', { name: 'API reference' }));
    fireEvent.click(navigation.getByRole('button', { name: 'Reference' }));
    fireEvent.click(navigation.getByRole('link', { name: 'Webhooks' }));
    expect(window.location.pathname).toBe('/reference/webhooks');
    expect(screen.getByRole('heading', { name: 'Webhooks' })).toBeInTheDocument();
    expect(screen.getByText('Event delivered')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Schemas' })).not.toBeInTheDocument();

    fireEvent.click(navigation.getByRole('link', { name: 'Schemas' }));
    expect(window.location.pathname).toBe('/reference/schemas');
    expect(screen.getByRole('heading', { name: 'Schemas' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Webhooks' })).not.toBeInTheDocument();

    fireEvent.click(navigation.getByRole('link', { name: 'Security schemes' }));
    expect(window.location.pathname).toBe('/reference/security-schemes');
    expect(screen.getByRole('heading', { name: 'Security schemes' })).toBeInTheDocument();

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
      openapi: '3.1.0', info: { title: 'Reference API' }, paths: {},
      components: { schemas: { Pet: { type: 'object' } } },
    };
    const { unmount } = render(<Speccy spec={referenceSpec} basePath="/docs" />);

    expect(screen.getByRole('heading', { name: 'Schemas' })).toBeInTheDocument();
    const navigation = within(screen.getByRole('navigation', { name: 'API reference' }));
    const toggle = navigation.getByRole('button', { name: 'Reference' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(navigation.queryByRole('link', { name: 'Schemas' })).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(navigation.getByRole('link', { name: 'Schemas' })).toHaveAttribute('aria-current', 'page');

    unmount();
    render(<Speccy spec={referenceSpec} basePath="/docs" />);

    expect(screen.getByRole('button', { name: 'Reference' })).toHaveAttribute('aria-expanded', 'true');
  });
});
