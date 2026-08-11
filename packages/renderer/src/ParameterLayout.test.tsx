import { readFileSync } from 'node:fs';
import { fireEvent, render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Speccy } from './Speccy';

describe('endpoint parameter layout', () => {
  it('uses an opaque host surface for inherited cards and menus', () => {
    const css = readFileSync('src/styles.css', 'utf8');

    expect(css).toMatch(
      /\.sp-theme-inherit \{[^}]*--sp-surface: var\(\s*--ifm-background-surface-color,/,
    );
  });

  it('allows parameter tooltips to escape the parameter card', () => {
    const css = readFileSync('src/styles.css', 'utf8');

    expect(css).toMatch(/\.sp-endpoint-parameters \{[^}]*overflow: visible;/);
  });

  it('gives the request details split the full endpoint width', () => {
    const css = readFileSync('src/styles.css', 'utf8');

    expect(css).toMatch(
      /\.sp-endpoint-layout \{[^}]*grid-template-columns: minmax\(0, 1fr\);/,
    );
    expect(css).toMatch(
      /\.sp-endpoint-request-grid \{[^}]*grid-template-columns: minmax\(0, 7fr\) minmax\(340px, 5fr\);/,
    );
  });

  it('indents subgroup pages behind a guide without indenting the heading', () => {
    const css = readFileSync('src/styles.css', 'utf8');

    expect(css).toMatch(
      /\.sp-nav-subgroup \{[^}]*margin: 8px 0 10px 8px;[^}]*padding-left: 7px;/,
    );
    expect(css).toMatch(
      /\.sp-nav-subgroup::before \{[^}]*top: 24px;[^}]*border-left: 1px solid/,
    );
    expect(css).toMatch(/\.sp-nav-subgroup > h3 \{[^}]*margin: 0 0 0 -15px;/);
    expect(css).toMatch(
      /\.sp-sidebar \.sp-nav-subgroup > h3 \{[^}]*padding-left: 12px;/,
    );
  });

  it('progressively reveals long parameter groups', () => {
    window.history.replaceState({}, '', '/api/list-companies');
    const parameters = Array.from({ length: 8 }, (_, index) => ({
      name: `filter${index + 1}`,
      in: 'query',
      description: `Filter ${index + 1}`,
      schema: { type: 'string' },
    }));
    const { container } = render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Test API' },
          paths: {
            '/companies': {
              get: {
                summary: 'List companies',
                operationId: 'list-companies',
                parameters,
              },
            },
          },
        }}
        basePath="/api"
        parameterPrototype={false}
      />,
    );

    const documentation =
      container.querySelector<HTMLElement>('.sp-endpoint-main')!;
    const requestHeading = container.querySelector<HTMLElement>(
      '.sp-request-heading',
    )!;
    expect(
      within(requestHeading).getByRole('heading', {
        level: 2,
        name: 'Request',
      }),
    ).toBeInTheDocument();
    expect(requestHeading.nextElementSibling).toHaveClass('sp-endpoint-layout');
    expect(
      within(documentation).getByRole('heading', {
        level: 3,
        name: 'Query parameters',
      }),
    ).toBeInTheDocument();
    expect(within(documentation).getByText('filter5')).toBeInTheDocument();
    expect(
      within(documentation).queryByText('filter6'),
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(documentation).getByRole('button', { name: 'Show 3 more' }),
    );
    expect(within(documentation).getByText('filter8')).toBeInTheDocument();

    fireEvent.click(
      within(documentation).getByRole('button', { name: 'Show fewer' }),
    );
    expect(
      within(documentation).queryByText('filter6'),
    ).not.toBeInTheDocument();
  });

  it('keeps required request fields visible while collapsing optional fields', () => {
    window.history.replaceState({}, '', '/api/get-company');
    const parameters = [
      ...Array.from({ length: 6 }, (_, index) => ({
        name: `required${index + 1}`,
        in: 'query',
        required: true,
        schema: { type: 'string' },
      })),
      { name: 'optional', in: 'query', schema: { type: 'string' } },
    ];
    const { container } = render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Test API' },
          paths: {
            '/companies': {
              get: {
                summary: 'Get company',
                operationId: 'get-company',
                parameters,
              },
            },
          },
        }}
        basePath="/api"
        parameterPrototype={false}
      />,
    );

    const requestBuilder =
      container.querySelector<HTMLElement>('.sp-request-rail')!;
    expect(within(requestBuilder).getByText('required6')).toBeInTheDocument();
    expect(
      within(requestBuilder).queryByText('optional'),
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(requestBuilder).getByRole('button', { name: 'Show 1 more' }),
    );
    expect(within(requestBuilder).getByText('optional')).toBeInTheDocument();
  });

  it('renders one or two optional parameters without a collapsible summary', () => {
    window.history.replaceState({}, '', '/api/list-companies');
    const parameters = [
      { name: 'cursor', in: 'query', schema: { type: 'string' } },
      { name: 'limit', in: 'query', schema: { type: 'integer' } },
    ];
    const { container } = render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Test API' },
          paths: {
            '/companies': {
              get: {
                summary: 'List companies',
                operationId: 'list-companies',
                parameters,
              },
            },
          },
        }}
        basePath="/api"
        parameterPrototype
      />,
    );

    const documentation =
      container.querySelector<HTMLElement>('.sp-endpoint-main')!;
    expect(
      within(documentation).getByRole('button', { name: 'cursor string' }),
    ).toBeVisible();
    expect(
      within(documentation).getByRole('button', { name: 'limit integer' }),
    ).toBeVisible();
    expect(
      within(documentation).queryByRole('button', {
        name: /Pagination, filtering, sorting, and related data/,
      }),
    ).not.toBeInTheDocument();
  });

  it('keeps three optional parameters collapsed', () => {
    window.history.replaceState({}, '', '/api/list-companies');
    const parameters = Array.from({ length: 3 }, (_, index) => ({
      name: `filter${index + 1}`,
      in: 'query',
      schema: { type: 'string' },
    }));
    const { container } = render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Test API' },
          paths: {
            '/companies': {
              get: {
                summary: 'List companies',
                operationId: 'list-companies',
                parameters,
              },
            },
          },
        }}
        basePath="/api"
        parameterPrototype
      />,
    );

    const documentation =
      container.querySelector<HTMLElement>('.sp-endpoint-main')!;
    expect(
      within(documentation).getByRole('button', {
        name: /Pagination, filtering, sorting, and related data/,
      }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(
      within(documentation).queryByText('filter1'),
    ).not.toBeInTheDocument();
  });

  it('uses schema explorers for path and query parameter documentation', () => {
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
                    description: 'Unique identifier for a company.',
                    schema: { type: 'string', format: 'uuid' },
                  },
                  {
                    name: 'include',
                    in: 'query',
                    description: 'Related records to include.',
                    schema: { type: 'string', enum: ['accounts', 'contacts'] },
                  },
                ],
              },
            },
          },
        }}
        basePath="/api"
        parameterPrototype
      />,
    );

    const documentation =
      container.querySelector<HTMLElement>('.sp-endpoint-main')!;
    expect(
      within(documentation).getByRole('region', {
        name: 'Path parameters schema',
      }),
    ).toBeVisible();
    expect(
      within(documentation).getByRole('region', {
        name: 'Query parameters schema',
      }),
    ).toBeVisible();
    expect(
      within(documentation).queryByText('Unique identifier for a company.'),
    ).not.toBeInTheDocument();
    expect(
      documentation.querySelector('.sp-schema-explorer-inspector'),
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(documentation).getByRole('button', {
        name: 'companyId * string · uuid',
      }),
    );

    expect(
      within(documentation).getByText('Unique identifier for a company.'),
    ).toBeVisible();

    fireEvent.click(
      within(documentation).getByRole('button', { name: 'include enum' }),
    );
    expect(
      within(documentation).getByText('Related records to include.'),
    ).toBeVisible();
  });

  it('keeps parameter details compact until requested', () => {
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
                    description: 'Unique identifier for a company.',
                    schema: {
                      type: 'string',
                      format: 'uuid',
                      default: 'company-123',
                    },
                  },
                ],
              },
            },
          },
        }}
        basePath="/api"
        parameterPrototype={false}
      />,
    );

    const parameter = container.querySelector<HTMLElement>(
      '.sp-endpoint-parameter',
    );
    expect(within(parameter!).getByText('string · uuid')).toBeInTheDocument();
    expect(
      within(parameter!).queryByText('Unique identifier for a company.'),
    ).not.toBeInTheDocument();
    expect(within(parameter!).queryByText('Default:')).not.toBeInTheDocument();

    fireEvent.click(
      within(parameter!).getByRole('button', {
        name: 'Show details for companyId',
      }),
    );

    expect(
      within(parameter!).getByText('Unique identifier for a company.'),
    ).toBeInTheDocument();
    expect(within(parameter!).getByText('Default:')).toBeInTheDocument();
    expect(within(parameter!).getByText('"company-123"')).toBeInTheDocument();
  });

  it('summarizes array parameters without rendering a duplicate items row', () => {
    window.history.replaceState({}, '', '/api/list-instruments');
    const { container } = render(
      <Speccy
        spec={{
          openapi: '3.1.0',
          info: { title: 'Test API' },
          paths: {
            '/instruments': {
              get: {
                summary: 'List instruments',
                operationId: 'list-instruments',
                parameters: [
                  {
                    name: 'state',
                    in: 'query',
                    schema: {
                      type: 'array',
                      items: {
                        title: 'InstrumentState',
                        type: 'string',
                        enum: ['ACTIVE', 'BLOCKED', 'DESTROYED', 'NOT_ENABLED'],
                      },
                    },
                  },
                ],
              },
            },
          },
        }}
        basePath="/api"
        parameterPrototype={false}
      />,
    );

    const parameter = container.querySelector<HTMLElement>(
      '.sp-endpoint-parameter',
    )!;
    expect(
      within(parameter).getByText('array<InstrumentState · enum>'),
    ).toBeInTheDocument();
    expect(within(parameter).queryByText('items')).not.toBeInTheDocument();
  });
});
