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
    expect(await screen.findByRole('button', { name: 'Copied' })).toHaveClass('is-copied');
    expect(writeText).toHaveBeenCalledWith('curl /things?key=secret');

    rerender(<CodeBlock value="example" />);
    expect(screen.getByRole('button', { name: /copied|copy/i }).parentElement).toHaveClass('sp-code-title-copy-only');

    rerender(<CodeBlock value="example" copyable={false} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('highlights valid JSON without changing non-JSON samples', () => {
    const { container, rerender } = render(<CodeBlock value={'{"name":"Speccy","count":2,"ready":true,"empty":null}'} />);

    expect(container.querySelector('.sp-json-key')).toHaveTextContent('"name"');
    expect(container.querySelector('.sp-json-string')).toHaveTextContent('"Speccy"');
    expect(container.querySelector('.sp-json-number')).toHaveTextContent('2');
    expect(container.querySelectorAll('.sp-json-literal')).toHaveLength(2);
    expect(container.querySelector('code')).toHaveTextContent('{"name":"Speccy","count":2,"ready":true,"empty":null}');

    rerender(<CodeBlock value="curl https://example.com" />);
    expect(container.querySelector('code span')).not.toBeInTheDocument();
  });
});
