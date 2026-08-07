import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CodeBlock } from './CodeBlock';

describe('CodeBlock', () => {
  it('renders shared code presentation with an optional copy action', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const { rerender } = render(<CodeBlock title="Request sample" value="curl /things?key=••••••••" copyValue="curl /things?key=secret" />);

    expect(screen.getByText('Request sample')).toBeInTheDocument();
    expect(screen.getByText('curl /things?key=••••••••')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith('curl /things?key=secret');

    rerender(<CodeBlock value="example" />);
    expect(screen.getByRole('button', { name: /copied|copy/i }).parentElement).toHaveClass('sp-code-title-copy-only');

    rerender(<CodeBlock value="example" copyable={false} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
