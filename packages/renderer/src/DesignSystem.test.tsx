import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiPath, DisclosureChevron, MethodBadge, RequiredMark } from './DesignSystem';

describe('design system primitives', () => {
  it('presents HTTP methods and webhook labels consistently', () => {
    const { rerender } = render(<MethodBadge method="post" />);
    expect(screen.getByText('POST')).toHaveClass('sp-method-badge');
    rerender(<MethodBadge method="post" webhook />);
    expect(screen.getByText('Webhook')).toBeInTheDocument();
  });

  it('highlights path parameters', () => {
    render(<ApiPath value="/users/{userId}" />);
    expect(screen.getByText('{userId}')).toHaveClass('sp-path-parameter');
  });

  it('gives structural marks accessible semantics', () => {
    const { container } = render(<><RequiredMark /><DisclosureChevron /></>);
    expect(screen.getByLabelText('Required')).toBeInTheDocument();
    expect(container.querySelector('.sp-disclosure-chevron')).toHaveAttribute('aria-hidden', 'true');
  });
});
