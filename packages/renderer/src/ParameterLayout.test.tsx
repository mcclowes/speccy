import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Speccy } from './Speccy';

describe('endpoint parameter layout', () => {
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
});
