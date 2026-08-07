import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CodeBlock } from './CodeBlock';

describe('CodeBlock', () => {
  it('renders shared code presentation with an optional copy action', async () => {
    const { rerender } = render(<CodeBlock title="Request sample" value="curl /things" />);

    expect(screen.getByText('Request sample')).toBeInTheDocument();
    expect(screen.getByText('curl /things')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();

    rerender(<CodeBlock value="example" copyable={false} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
