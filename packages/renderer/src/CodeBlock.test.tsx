import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CodeBlock } from './CodeBlock';

describe('CodeBlock', () => {
  it('renders shared code presentation with an optional copy action', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const { rerender } = render(
      <CodeBlock
        title="Request sample"
        value="curl /things?key=••••••••"
        copyValue="curl /things?key=secret"
      />,
    );

    expect(screen.getByText('Request sample')).toBeInTheDocument();
    expect(screen.getByText('curl /things?key=••••••••')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(await screen.findByRole('button', { name: 'Copied' })).toHaveClass(
      'is-copied',
    );
    expect(writeText).toHaveBeenCalledWith('curl /things?key=secret');

    rerender(<CodeBlock value="example" />);
    expect(
      screen.getByRole('button', { name: /copied|copy/i }).parentElement,
    ).toHaveClass('sp-code-title-copy-only');

    rerender(<CodeBlock value="example" copyable={false} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('highlights valid JSON without changing non-JSON samples', () => {
    const { container, rerender } = render(
      <CodeBlock
        value={'{"name":"Speccy","count":2,"ready":true,"empty":null}'}
      />,
    );

    expect(container.querySelector('.sp-json-key')).toHaveTextContent('"name"');
    expect(container.querySelector('.sp-json-string')).toHaveTextContent(
      '"Speccy"',
    );
    expect(container.querySelector('.sp-json-number')).toHaveTextContent('2');
    expect(container.querySelectorAll('.sp-json-literal')).toHaveLength(2);
    expect(container.querySelector('code')).toHaveTextContent(
      '{"name":"Speccy","count":2,"ready":true,"empty":null}',
    );

    rerender(<CodeBlock value="curl https://example.com" />);
    expect(container.querySelector('code span')).not.toBeInTheDocument();
  });

  it('renders one numbered line per source line when lineNumbers is set', () => {
    const { container } = render(
      <CodeBlock value={'{\n  "name": "Speccy"\n}'} lineNumbers />,
    );

    expect(container.querySelector('pre')).toHaveClass('sp-code-numbered');
    const lines = container.querySelectorAll('.sp-code-line');
    expect(lines).toHaveLength(3);
    const nameLine = lines[1]!;
    expect(nameLine).toHaveTextContent('"name": "Speccy"');
    expect(nameLine.querySelector('.sp-json-key')).toHaveTextContent('"name"');
  });

  it('truncates long values behind a show-full toggle when truncateLabel is set', () => {
    const value = JSON.stringify(
      { items: Array.from({ length: 40 }, (_, index) => index) },
      null,
      2,
    );
    const { container } = render(
      <CodeBlock value={value} lineNumbers truncateLabel="response" />,
    );

    const clip = container.querySelector('.sp-code-clip');
    expect(clip).toHaveClass('is-truncated');
    const toggle = screen.getByRole('button', { name: 'Show full response' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(clip).not.toHaveClass('is-truncated');
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Show less' }));
    expect(clip).toHaveClass('is-truncated');
  });

  it('leaves short values untouched when truncateLabel is set', () => {
    const { container } = render(
      <CodeBlock
        value={'{\n  "name": "Speccy"\n}'}
        lineNumbers
        truncateLabel="response"
      />,
    );

    expect(container.querySelector('.sp-code-clip')).not.toBeInTheDocument();
    expect(container.querySelector('.sp-code-expand')).not.toBeInTheDocument();
  });

  it('folds and unfolds objects and arrays when collapsibleValue is set', () => {
    const value = {
      supplierRef: { id: '8Ge', name: 'Speccy' },
      tags: ['a', 'b'],
      empty: {},
    };
    const { container } = render(
      <CodeBlock
        value={JSON.stringify(value, null, 2)}
        lineNumbers
        collapsibleValue={value}
      />,
    );

    const expandedLines = container.querySelectorAll('.sp-code-line');
    expect(
      container.querySelector('.sp-code-fold-summary'),
    ).not.toBeInTheDocument();

    const supplierRefLine = screen
      .getByText('"supplierRef"')
      .closest<HTMLElement>('.sp-code-line')!;
    fireEvent.click(
      within(supplierRefLine).getByRole('button', { name: 'Collapse' }),
    );

    expect(
      within(supplierRefLine).getByRole('button', { name: 'Expand' }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(supplierRefLine).toHaveTextContent('2 keys');
    expect(container.querySelectorAll('.sp-code-line').length).toBeLessThan(
      expandedLines.length,
    );
    expect(screen.queryByText('"8Ge"')).not.toBeInTheDocument();

    fireEvent.click(
      within(supplierRefLine).getByRole('button', { name: 'Expand' }),
    );
    expect(screen.getByText('"8Ge"')).toBeInTheDocument();
  });
});
