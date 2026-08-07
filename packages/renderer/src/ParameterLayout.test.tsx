import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Speccy } from './Speccy';

describe('endpoint parameter layout', () => {
  it('progressively reveals long parameter groups', () => {
    window.history.replaceState({}, '', '/api/list-companies');
    const parameters = Array.from({ length: 8 }, (_, index) => ({
      name: `filter${index + 1}`,
      in: 'query',
      description: `Filter ${index + 1}`,
      schema: { type: 'string' },
    }));
    const { container } = render(<Speccy spec={{
      openapi: '3.1.0',
      info: { title: 'Test API' },
      paths: { '/companies': { get: { summary: 'List companies', operationId: 'list-companies', parameters } } },
    }} basePath="/api" />);

    const documentation = container.querySelector<HTMLElement>('.sp-endpoint-main')!;
    expect(within(documentation).getByRole('heading', { name: 'Query parameters 8' })).toBeInTheDocument();
    expect(within(documentation).getByText('filter5')).toBeInTheDocument();
    expect(within(documentation).queryByText('filter6')).not.toBeInTheDocument();

    fireEvent.click(within(documentation).getByRole('button', { name: 'Show 3 more' }));
    expect(within(documentation).getByText('filter8')).toBeInTheDocument();

    fireEvent.click(within(documentation).getByRole('button', { name: 'Show fewer' }));
    expect(within(documentation).queryByText('filter6')).not.toBeInTheDocument();
  });

  it('keeps required request fields visible while collapsing optional fields', () => {
    window.history.replaceState({}, '', '/api/get-company');
    const parameters = [
      ...Array.from({ length: 6 }, (_, index) => ({ name: `required${index + 1}`, in: 'query', required: true, schema: { type: 'string' } })),
      { name: 'optional', in: 'query', schema: { type: 'string' } },
    ];
    const { container } = render(<Speccy spec={{
      openapi: '3.1.0',
      info: { title: 'Test API' },
      paths: { '/companies': { get: { summary: 'Get company', operationId: 'get-company', parameters } } },
    }} basePath="/api" />);

    const requestBuilder = container.querySelector<HTMLElement>('.sp-request-rail')!;
    expect(within(requestBuilder).getByText('required6')).toBeInTheDocument();
    expect(within(requestBuilder).queryByText('optional')).not.toBeInTheDocument();

    fireEvent.click(within(requestBuilder).getByRole('button', { name: 'Show 1 more' }));
    expect(within(requestBuilder).getByText('optional')).toBeInTheDocument();
  });

  it('renders schema examples in the parameter body, outside the metadata row', () => {
    window.history.replaceState({}, '', '/api/get-company');
    const { container } = render(<Speccy spec={{
      openapi: '3.1.0',
      info: { title: 'Test API' },
      paths: {
        '/companies/{companyId}': {
          get: {
            summary: 'Get company',
            operationId: 'get-company',
            parameters: [{
              name: 'companyId',
              in: 'path',
              description: 'Unique identifier for a company.',
              schema: { type: 'string', format: 'uuid', example: 'company-123' },
            }],
          },
        },
      },
    }} basePath="/api" />);

    const parameter = container.querySelector<HTMLElement>('.sp-endpoint-parameter');
    const metadata = parameter?.querySelector<HTMLElement>('.sp-parameter-name');
    const example = screen.getByText('company-123').closest<HTMLElement>('.sp-example');

    expect(example).toBeInTheDocument();
    expect(parameter).toContainElement(example);
    expect(metadata).not.toContainElement(example);
  });

  it('summarizes array parameters without rendering a duplicate items row', () => {
    window.history.replaceState({}, '', '/api/list-instruments');
    const { container } = render(<Speccy spec={{
      openapi: '3.1.0',
      info: { title: 'Test API' },
      paths: {
        '/instruments': {
          get: {
            summary: 'List instruments',
            operationId: 'list-instruments',
            parameters: [{
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
            }],
          },
        },
      },
    }} basePath="/api" />);

    const parameter = container.querySelector<HTMLElement>('.sp-endpoint-parameter')!;
    expect(within(parameter).getByText('array<InstrumentState · enum>')).toBeInTheDocument();
    expect(within(parameter).queryByText('items')).not.toBeInTheDocument();
  });
});
