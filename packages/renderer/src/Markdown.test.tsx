import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CollapsibleMarkdown, Markdown } from './Markdown';
import { Speccy } from './Speccy';

describe('CollapsibleMarkdown', () => {
  it('only offers to expand long descriptions', () => {
    const { container, rerender } = render(<CollapsibleMarkdown className="sp-schema-description">Short response.</CollapsibleMarkdown>);
    expect(container.firstChild).toHaveClass('sp-schema-description');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    rerender(
      <CollapsibleMarkdown>
        A connection represents a company's connection to a data source and allows you to synchronize data (pull and/or push) with that source.
      </CollapsibleMarkdown>,
    );
    const toggle = screen.getByRole('button', { name: 'Show all…' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('Markdown', () => {
  it('renders links, headings, and GitHub-flavored tables', () => {
    const { container } = render(
      <Markdown>{`[Explore](https://example.com)\n\n## Endpoints\n\n| Name | Description |\n| :- | :- |\n| Companies | **Manage** companies |`}</Markdown>,
    );

    expect(screen.getByRole('link', { name: 'Explore' })).toHaveAttribute('href', 'https://example.com');
    expect(screen.getByRole('heading', { name: 'Endpoints', level: 2 })).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Manage').tagName).toBe('STRONG');
    expect(container).not.toHaveTextContent('| :- | :- |');
  });

  it('does not render raw HTML from a spec', () => {
    const { container } = render(<Markdown>{'<script>unsafe()</script><b>hidden HTML</b>'}</Markdown>);

    expect(container.querySelector('script')).not.toBeInTheDocument();
    expect(container.querySelector('b')).not.toBeInTheDocument();
  });

  it('does not display Markdown HTML comments', () => {
    const { container } = render(<Markdown>{'Before\n\n<!-- Start Codat Tags Table -->\n\n`<!-- example -->`\n\nAfter'}</Markdown>);

    expect(container).toHaveTextContent('Before');
    expect(container).toHaveTextContent('After');
    expect(container).not.toHaveTextContent('Start Codat Tags Table');
    expect(container).toHaveTextContent('<!-- example -->');
  });

  it('renders every OpenAPI description field as Markdown', () => {
    render(<Speccy defaultExpanded spec={{
      openapi: '3.1.0',
      info: { title: 'Markdown API', description: '[Info](https://example.com/info)' },
      tags: [{ name: 'Things', description: '[Tag](https://example.com/tag)' }],
      paths: {
        '/things': {
          post: {
            tags: ['Things'],
            summary: 'Create thing',
            description: '[Operation](https://example.com/operation)',
            parameters: [{ name: 'filter', in: 'query', description: '[Parameter](https://example.com/parameter)' }],
            requestBody: {
              description: '[Request](https://example.com/request)',
              content: { 'application/json': { schema: { type: 'string', description: '[Schema](https://example.com/schema)' } } },
            },
            responses: { '200': { description: '[Response](https://example.com/response)' } },
          },
        },
      },
    }} />);

    for (const name of ['Info', 'Tag']) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', `https://example.com/${name.toLowerCase()}`);
    }

    const navigation = screen.getByRole('navigation', { name: 'API reference' });
    fireEvent.click(within(navigation).getByRole('button', { name: 'Things' }));
    fireEvent.click(within(navigation).getByRole('link', { name: /Create thing/ }));

    for (const name of ['Operation', 'Parameter', 'Request', 'Response', 'Schema']) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', `https://example.com/${name.toLowerCase()}`);
    }
  });
});
