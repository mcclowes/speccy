import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Speccy } from './Speccy';

afterEach(cleanup);

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
});
