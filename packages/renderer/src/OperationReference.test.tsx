import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MouseEventHandler } from 'react';
import {
  EndpointStrip,
  OperationCard,
  OperationLink,
  OperationPreview,
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
});
