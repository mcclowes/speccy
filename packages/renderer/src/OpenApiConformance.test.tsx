import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import openapi30 from '../test-fixtures/openapi-3.0.yaml?raw';
import openapi31 from '../test-fixtures/openapi-3.1.yaml?raw';
import { Speccy } from './Speccy';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe.each([
  {
    version: '3.0.3',
    spec: openapi30,
    operationId: 'getpet',
    operationSummary: 'Get a pet',
  },
  {
    version: '3.1.1',
    spec: openapi31,
    operationId: 'listevents',
    operationSummary: 'List events',
  },
])('OpenAPI $version document coverage', (fixture) => {
  it('parses YAML and renders the overview and operation routes', () => {
    const { rerender } = render(<Speccy spec={fixture.spec} />);

    expect(
      screen.getByRole('heading', {
        name: `OpenAPI ${fixture.version.startsWith('3.0') ? '3.0' : '3.1'} coverage`,
      }),
    ).toBeVisible();

    rerender(
      <Speccy
        route={{ page: 'operation', operationId: fixture.operationId }}
        spec={fixture.spec}
      />,
    );

    expect(
      screen.getByRole('heading', { name: fixture.operationSummary }),
    ).toBeVisible();
  });
});

describe('OpenAPI 3.0 object coverage', () => {
  it.each([
    ['schemas', 'Pet', 'kind'],
    ['parameters', 'PetId', 'Stable pet identifier.'],
    ['requestBodies', 'PetBody', 'Updated pet details.'],
    ['responses', 'PetResponse', 'A single pet.'],
    ['headers', 'RequestId', 'Request correlation identifier.'],
    ['examples', 'Cat', 'A cat'],
    ['links', 'PetOwner', "Find this pet's owner."],
    ['callbacks', 'PetChanged', 'Receive a pet change'],
    ['securitySchemes', 'bearerAuth', 'JWT'],
  ] as const)('renders the %s component section', (section, name, detail) => {
    render(<Speccy route={{ page: 'reference', section }} spec={openapi30} />);

    expect(screen.getByRole('heading', { name })).toBeVisible();
    expect(screen.getByText(detail, { exact: false })).toBeVisible();
  });
});

describe('OpenAPI 3.1 object coverage', () => {
  it.each([
    ['pathItems', 'Events', 'GET List events'],
    ['securitySchemes', 'certificate', 'mutualTLS'],
  ] as const)('renders the %s component section', (section, name, detail) => {
    render(<Speccy route={{ page: 'reference', section }} spec={openapi31} />);

    expect(screen.getByRole('heading', { name })).toBeVisible();
    expect(screen.getByText(detail, { exact: false })).toBeVisible();
  });

  it('renders webhooks and the JSON Schema 2020-12 vocabulary', () => {
    const { rerender } = render(
      <Speccy
        route={{ page: 'reference', section: 'webhooks' }}
        spec={openapi31}
      />,
    );

    expect(screen.getByText('Receive an event')).toBeVisible();

    rerender(
      <Speccy
        route={{ page: 'reference', section: 'schemas' }}
        spec={openapi31}
      />,
    );
    expect(screen.getByText('Any value is allowed.')).toBeVisible();
    expect(screen.getAllByText('No value is allowed.').length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText('content encoding')).toBeVisible();
    expect(screen.getByText('Unevaluated properties')).toBeVisible();
  });
});
