import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  ApiPath,
  DisclosureChevron,
  MethodBadge,
  RequiredMark,
} from './DesignSystem';

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

  it('adds wrap opportunities before path separators without splitting parameters', () => {
    const { container } = render(
      <ApiPath
        value="/companies/{companyId}/connections/{connectionId}"
        wrap
      />,
    );

    expect(container.querySelectorAll('wbr')).toHaveLength(4);
    expect(container.querySelector('code')?.innerHTML).not.toContain('/<wbr>');
    expect(container.querySelector('code')?.innerHTML).toContain('<wbr>/');
    expect(screen.getByText('{companyId}')).toHaveClass('sp-path-parameter');
    expect(screen.getByText('{connectionId}')).toHaveClass('sp-path-parameter');
  });

  it('gives structural marks accessible semantics', () => {
    const { container } = render(
      <>
        <RequiredMark />
        <DisclosureChevron />
      </>,
    );
    expect(screen.getByLabelText('Required')).toBeInTheDocument();
    expect(container.querySelector('.sp-disclosure-chevron')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });
});
