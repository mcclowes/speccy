import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Speccy } from './Speccy';

afterEach(() => {
  window.history.replaceState({}, '', '/');
  window.localStorage.clear();
});

describe('operation security schemes', () => {
  it('renders the referenced Swagger API key definition', () => {
    window.history.replaceState({}, '', '/create-connection');
    render(<Speccy spec={{
      swagger: '2.0',
      info: { title: 'Connections API' },
      security: [{ auth_header: [] }],
      securityDefinitions: {
        auth_header: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
          description: 'The word "Basic" followed by a space and your API key.\n\nExample: `Authorization: 123`',
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
    }} />);

    expect(screen.getByRole('heading', { level: 4, name: 'Authorization: API key' })).toBeInTheDocument();
    expect(screen.getByText(/The word "Basic" followed by a space/)).toBeInTheDocument();
    expect(screen.getByText('Authorization: 123')).toBeInTheDocument();
  });
});
