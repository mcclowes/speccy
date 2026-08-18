import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MouseEventHandler } from 'react';
import {
  EndpointStrip,
  OperationCard,
  OperationLink,
  OperationPreview,
  OperationReferenceProvider,
} from './OperationReference';

const operation = {
  method: 'post',
  path: '/corporates/{corporateId}',
  href: '/api/create-corporate',
};

afterEach(cleanup);

describe('operation references', () => {
  it('renders an inline operation link with portable navigation', () => {
    const onClick: MouseEventHandler<HTMLAnchorElement> = vi.fn((event) =>
      event.preventDefault(),
    );
    render(<OperationLink {...operation} onClick={onClick} />);

    const link = screen.getByRole('link', { name: /POST.*corporateId/ });
    expect(link).toHaveAttribute('href', operation.href);
    expect(link).toHaveClass('speccy', 'sp-operation-reference');

    fireEvent.click(link);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders endpoint strips and described cards', () => {
    const { rerender } = render(<EndpointStrip {...operation} />);
    expect(screen.getByText('Open reference').closest('a')).toHaveAttribute(
      'href',
      operation.href,
    );

    rerender(
      <OperationCard
        {...operation}
        summary="Create a corporate identity"
        description="Creates the identity and its root user."
      />,
    );
    expect(screen.getByText('Create a corporate identity')).toBeInTheDocument();
    expect(
      screen.getByText('Creates the identity and its root user.'),
    ).toBeInTheDocument();
  });

  it('switches operation previews between request and response examples', () => {
    render(
      <OperationPreview
        {...operation}
        requestExample={'{"name":"Example"}'}
        responseExample={'{"id":"corporate-1"}'}
      />,
    );

    expect(screen.getByText('Path')).toBeInTheDocument();
    expect(screen.getByText('/corporates/{corporateId}')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy path' })).toHaveClass(
      'sp-copy-compact',
    );
    expect(screen.getByRole('button', { name: 'Copy body' })).toHaveClass(
      'sp-copy-compact',
    );
    expect(screen.getByText('"Example"')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Response' }));
    expect(screen.getByText('"corporate-1"')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Response' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('renders a request-only preview without redundant tabs', () => {
    render(
      <OperationPreview {...operation} requestExample={'{"enabled":true}'} />,
    );

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.getByText('true')).toBeInTheDocument();
  });

  it('derives request parameters, headers, body, and response from the spec', () => {
    render(
      <OperationPreview
        {...operation}
        spec={{
          openapi: '3.1.0',
          paths: {
            [operation.path]: {
              post: {
                parameters: [
                  { name: 'corporateId', in: 'path', example: 'corp-1' },
                  { name: 'expand', in: 'query', schema: { default: true } },
                  { name: 'X-Tenant', in: 'header', example: 'tenant-1' },
                ],
                requestBody: {
                  content: {
                    'application/json': { example: { name: 'Custom Ltd' } },
                  },
                },
                responses: {
                  '201': {
                    content: {
                      'application/json': { example: { id: 'corp-1' } },
                    },
                  },
                },
              },
            },
          },
        }}
      />,
    );

    expect(screen.getByText('/corporates/corp-1')).toBeInTheDocument();
    expect(screen.getByText('Query parameters')).toBeInTheDocument();
    expect(screen.getByText('Headers')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.queryByText('"pathParameters"')).not.toBeInTheDocument();
    expect(screen.getByText('"Custom Ltd"')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Response' }));
    expect(screen.getByText('"corp-1"')).toBeInTheDocument();
  });

  it('merges structured request overrides over derived values', () => {
    render(
      <OperationPreview
        {...operation}
        spec={{
          paths: {
            [operation.path]: {
              post: {
                parameters: [
                  { name: 'corporateId', in: 'path', example: 'derived-id' },
                  { name: 'expand', in: 'query', example: 'owners' },
                  { name: 'X-Tenant', in: 'header', example: 'tenant-1' },
                ],
                requestBody: {
                  content: { 'application/json': { example: { old: true } } },
                },
              },
            },
          },
        }}
        requestValues={{
          path: { corporateId: 'custom-id' },
          query: { page: 2 },
          headers: { 'X-Tenant': 'tenant-2' },
          body: { name: 'Custom Ltd' },
        }}
      />,
    );

    expect(screen.getByText('/corporates/custom-id')).toBeInTheDocument();
    expect(screen.getByText('"expand"')).toBeInTheDocument();
    expect(screen.getByText('"page"')).toBeInTheDocument();
    expect(screen.getByText('"tenant-2"')).toBeInTheDocument();
    expect(screen.getByText('"Custom Ltd"')).toBeInTheDocument();
    expect(screen.queryByText('"old"')).not.toBeInTheDocument();
  });

  it('uses requestExample as a body override and always renders the path', () => {
    const { rerender } = render(
      <OperationPreview
        {...operation}
        spec={{
          paths: {
            [operation.path]: {
              post: {
                requestBody: {
                  content: { 'application/json': { example: { old: true } } },
                },
              },
            },
          },
        }}
        requestExample={'{"override":true}'}
      />,
    );
    expect(screen.getByText('"override"')).toBeInTheDocument();
    expect(screen.queryByText('"old"')).not.toBeInTheDocument();

    rerender(<OperationPreview {...operation} />);
    expect(screen.getByText('Path')).toBeInTheDocument();
    expect(screen.getByText(operation.path)).toBeInTheDocument();
    expect(screen.queryByText('Body')).not.toBeInTheDocument();
  });
});

describe('operation references resolved from an OpenAPI document', () => {
  const spec = {
    openapi: '3.1.0',
    paths: {
      '/corporates': {
        post: {
          operationId: 'corporateCreate',
          requestBody: {
            content: {
              'application/json': { example: { name: 'Custom Ltd' } },
            },
          },
          responses: {
            '200': {
              content: { 'application/json': { example: { id: 'corp-1' } } },
            },
          },
        },
      },
      '/managed_cards#prepaid': {
        post: { operationId: 'prepaidManagedCardCreate', responses: {} },
      },
      '/managed_cards#debit': {
        post: { operationId: 'debitManagedCardCreate', responses: {} },
      },
      '/stepup/challenges/otp/{channel}': {
        post: { operationId: 'stepupSCAChallenge', responses: {} },
      },
    },
    webhooks: {
      '/managed_cards/authorisation_request': {
        post: { operationId: 'authorisationForwarding', responses: {} },
      },
    },
  };

  it('derives href from the operation id when spec is passed directly', () => {
    render(<OperationLink method="post" path="/corporates" spec={spec} />);
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/api/corporatecreate',
    );
  });

  it('honours basePath and keeps an explicit href', () => {
    const { rerender } = render(
      <EndpointStrip
        method="post"
        path="/corporates"
        spec={spec}
        basePath="/reference"
      />,
    );
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/reference/corporatecreate',
    );

    rerender(
      <EndpointStrip
        method="post"
        path="/corporates"
        spec={spec}
        href="/custom"
      />,
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', '/custom');
  });

  it('resolves through an enclosing provider and derives examples', () => {
    render(
      <OperationReferenceProvider spec={spec}>
        <OperationPreview method="post" path="/corporates" />
      </OperationReferenceProvider>,
    );

    expect(
      screen.getByRole('link', { name: /Open API reference/ }),
    ).toHaveAttribute('href', '/api/corporatecreate');
    expect(screen.getByText('"Custom Ltd"')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Response' }));
    expect(screen.getByText('"corp-1"')).toBeInTheDocument();
  });

  it('picks a variant with a #fragment and displays the plain path', () => {
    render(
      <OperationReferenceProvider spec={spec}>
        <OperationLink method="post" path="/managed_cards#debit" />
      </OperationReferenceProvider>,
    );

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/api/debitmanagedcardcreate');
    expect(link).toHaveTextContent('/managed_cards');
    expect(link).not.toHaveTextContent('#debit');
  });

  it('matches by operationId and keeps the given display path', () => {
    render(
      <OperationReferenceProvider spec={spec}>
        <EndpointStrip
          method="post"
          path="/stepup/challenges/otp/SMS"
          operationId="stepupSCAChallenge"
        />
        <OperationLink operationId="authorisationForwarding" />
      </OperationReferenceProvider>,
    );

    const [strip, webhook] = screen.getAllByRole('link');
    expect(strip).toHaveAttribute('href', '/api/stepupscachallenge');
    expect(strip).toHaveTextContent('/stepup/challenges/otp/SMS');
    expect(webhook).toHaveAttribute(
      'href',
      '/api/webhook-authorisationforwarding',
    );
    expect(webhook).toHaveTextContent('/managed_cards/authorisation_request');
  });

  it('searches named sources in order and selects one with the api prop', () => {
    const backoffice = {
      openapi: '3.1.0',
      paths: {
        '/access_token': { post: { operationId: 'requestAccessToken' } },
      },
    };
    render(
      <OperationReferenceProvider
        apis={[
          { name: 'multi', spec, basePath: '/api' },
          { name: 'backoffice', spec: backoffice, basePath: '/api/backoffice' },
        ]}
      >
        <OperationLink method="post" path="/access_token" />
        <OperationLink method="post" path="/access_token" api="backoffice" />
      </OperationReferenceProvider>,
    );

    const [searched, named] = screen.getAllByRole('link');
    expect(searched).toHaveAttribute(
      'href',
      '/api/backoffice/requestaccesstoken',
    );
    expect(named).toHaveAttribute('href', '/api/backoffice/requestaccesstoken');
  });

  it('formats object examples as JSON', () => {
    render(
      <OperationPreview
        method="post"
        path="/corporates"
        href="/api/corporatecreate"
        requestExample={{ name: 'Object Ltd' }}
        responseExample={{ id: 'corp-2' }}
      />,
    );

    expect(screen.getByText('"Object Ltd"')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Response' }));
    expect(screen.getByText('"corp-2"')).toBeInTheDocument();
  });
});
