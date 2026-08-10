import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Speccy } from './Speccy';

afterEach(() => {
  window.history.replaceState({}, '', '/');
  window.localStorage.clear();
});

describe('operation security schemes', () => {
  it('renders alternative schemes as OR and combined schemes as AND', () => {
    window.history.replaceState({}, '', '/secured-operation');
    render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Secured API' },
          security: [{ bearerAuth: [] }, { apiKey: [], tenantKey: [] }],
          components: {
            securitySchemes: {
              bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                description: 'Authenticate as a user.',
              },
              apiKey: {
                type: 'apiKey',
                name: 'X-API-Key',
                in: 'header',
                description: 'Authenticate the client.',
              },
              tenantKey: {
                type: 'apiKey',
                name: 'X-Tenant-Key',
                in: 'header',
                description: 'Select the tenant.',
              },
            },
          },
          paths: {
            '/secured': {
              get: {
                operationId: 'secured-operation',
                parameters: [
                  {
                    in: 'query',
                    name: 'page',
                    schema: { type: 'integer' },
                  },
                ],
              },
            },
          },
        }}
        showThemeToggle={false}
      />,
    );

    const toggle = screen.getByRole('button', { name: 'Authorization' });
    expect(toggle.closest('.sp-endpoint-request-details')).not.toBeNull();
    fireEvent.click(toggle);
    const authorization = within(toggle.closest('section')!);

    expect(authorization.getByText('or')).toBeInTheDocument();
    expect(authorization.getByText('and')).toBeInTheDocument();
    expect(authorization.getByText('Bearer')).toBeInTheDocument();
    expect(authorization.getAllByText('API key')).toHaveLength(2);
  });

  it('renders the referenced Swagger API key definition', () => {
    window.history.replaceState({}, '', '/create-connection');
    render(
      <Speccy
        spec={{
          swagger: '2.0',
          info: { title: 'Connections API' },
          security: [{ auth_header: [] }],
          securityDefinitions: {
            auth_header: {
              type: 'apiKey',
              name: 'Authorization',
              in: 'header',
              description:
                'The word "Basic" followed by a space and your API key.\n\nExample: `Authorization: 123`',
            },
          },
          paths: {
            '/companies/{companyId}/connections': {
              post: {
                operationId: 'create-connection',
                summary: 'Create connection',
              },
            },
          },
        }}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 4, name: 'Authorization: API key' }),
    ).toBeInTheDocument();
    const toggle = screen.getByRole('button', {
      name: 'Authorization: API key',
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle.querySelector('.sp-security-lock')).toBeInTheDocument();
    expect(toggle.querySelector('.sp-security-info')).toHaveTextContent('?');
    expect(toggle.querySelector('.sp-security-info')).toHaveAttribute(
      'data-tooltip',
      'Show authorization details',
    );
    expect(
      screen.queryByText(/The word "Basic" followed by a space/),
    ).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle.querySelector('.sp-security-info')).toHaveAttribute(
      'data-tooltip',
      'Hide authorization details',
    );
    expect(
      screen.getByText(/The word "Basic" followed by a space/),
    ).toBeInTheDocument();
    expect(screen.getByText('Authorization: 123')).toBeInTheDocument();
  });
});
