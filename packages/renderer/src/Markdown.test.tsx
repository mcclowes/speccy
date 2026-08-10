import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Markdown } from './Markdown';
import { Speccy } from './Speccy';

describe('Markdown', () => {
  it('renders links, headings, and GitHub-flavored tables', () => {
    const { container } = render(
      <Markdown>{`[Explore](https://example.com)\n\n## Endpoints\n\n| Name | Description |\n| :- | :- |\n| Companies | **Manage** companies |`}</Markdown>,
    );

    expect(screen.getByRole('link', { name: 'Explore' })).toHaveAttribute(
      'href',
      'https://example.com',
    );
    expect(
      screen.getByRole('heading', { name: 'Endpoints', level: 2 }),
    ).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Manage').tagName).toBe(
      'STRONG',
    );
    expect(container).not.toHaveTextContent('| :- | :- |');
  });

  it('does not render raw HTML from a spec', () => {
    const { container } = render(
      <Markdown>{'<script>unsafe()</script><b>hidden HTML</b>'}</Markdown>,
    );

    expect(container.querySelector('script')).not.toBeInTheDocument();
    expect(container.querySelector('b')).not.toBeInTheDocument();
  });

  it('does not display Markdown HTML comments', () => {
    const { container } = render(
      <Markdown>
        {
          'Before\n\n<!-- Start Codat Tags Table -->\n\n`<!-- example -->`\n\nAfter'
        }
      </Markdown>,
    );

    expect(container).toHaveTextContent('Before');
    expect(container).toHaveTextContent('After');
    expect(container).not.toHaveTextContent('Start Codat Tags Table');
    expect(container).toHaveTextContent('<!-- example -->');
  });

  it('renders Docusaurus admonitions with default and custom titles', () => {
    const { container } = render(
      <Markdown>{`:::note
Default title
:::

:::warning[Check **this** first]
Keep the [nested Markdown](https://example.com) intact.
:::`}</Markdown>,
    );

    const note = container.querySelector('.sp-admonition-note');
    const warning = container.querySelector('.sp-admonition-warning');

    expect(note?.tagName).toBe('ASIDE');
    expect(within(note as HTMLElement).getByText('Note')).toHaveClass(
      'sp-admonition-title',
    );
    expect(warning?.tagName).toBe('ASIDE');
    expect(within(warning as HTMLElement).getByText('this')).toHaveProperty(
      'tagName',
      'STRONG',
    );
    expect(
      within(warning as HTMLElement).getByRole('link', {
        name: 'nested Markdown',
      }),
    ).toHaveAttribute('href', 'https://example.com');
  });

  it.each(['note', 'tip', 'info', 'warning', 'danger'])(
    'supports the %s admonition type',
    (type) => {
      const { container } = render(
        <Markdown>{`:::${type}\nContent\n:::`}</Markdown>,
      );

      expect(
        container.querySelector(`.sp-admonition-${type}`),
      ).toHaveTextContent('Content');
    },
  );

  it('renders every OpenAPI description field as Markdown', () => {
    render(
      <Speccy
        defaultExpanded
        parameterPrototype={false}
        spec={{
          openapi: '3.1.0',
          info: {
            title: 'Markdown API',
            description: '[Info](https://example.com/info)',
          },
          tags: [
            { name: 'Things', description: '[Tag](https://example.com/tag)' },
          ],
          paths: {
            '/things': {
              post: {
                tags: ['Things'],
                summary: 'Create thing',
                description: '[Operation](https://example.com/operation)',
                parameters: [
                  {
                    name: 'filter',
                    in: 'query',
                    description: '[Parameter](https://example.com/parameter)',
                  },
                ],
                requestBody: {
                  description: '[Request](https://example.com/request)',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'string',
                        description: '[Schema](https://example.com/schema)',
                      },
                    },
                  },
                },
                responses: {
                  '200': {
                    description: '[Response](https://example.com/response)',
                  },
                },
              },
            },
          },
        }}
      />,
    );

    for (const name of ['Info', 'Tag']) {
      expect(screen.getByRole('link', { name })).toHaveAttribute(
        'href',
        `https://example.com/${name.toLowerCase()}`,
      );
    }

    const navigation = screen.getByRole('navigation', {
      name: 'API reference',
    });
    fireEvent.click(within(navigation).getByRole('button', { name: 'Things' }));
    fireEvent.click(
      within(navigation).getByRole('link', { name: /Create thing/ }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Show details for filter' }),
    );

    for (const name of [
      'Operation',
      'Parameter',
      'Request',
      'Response',
      'Schema',
    ]) {
      expect(screen.getByRole('link', { name })).toHaveAttribute(
        'href',
        `https://example.com/${name.toLowerCase()}`,
      );
    }
  });
});
