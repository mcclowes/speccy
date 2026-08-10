import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DeveloperDiagnostics,
  InlineDiagnostics,
  diagnosticsAsCsv,
  diagnosticsAsText,
} from './DeveloperDiagnostics';
import type { ApiDiagnostic } from 'speccy-core';

const findings: ApiDiagnostic[] = [
  {
    id: 'missing-description',
    ruleId: 'operation-description',
    source: 'speccy',
    severity: 'warning',
    category: 'documentation',
    message: 'GET /companies has no description.',
    rationale: 'Consumers need to know what the operation does.',
    suggestion: 'Describe the operation.',
    path: ['paths', '/companies', 'get'],
  },
];

const apiFinding: ApiDiagnostic = {
  ...findings[0]!,
  id: 'missing-api-description',
  ruleId: 'info-description',
  message: 'API has no description.',
  path: ['info'],
};

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('developer diagnostics layout', () => {
  it('allows drawer rows and cards to shrink within the viewport', () => {
    const css = readFileSync('src/DeveloperDiagnostics.module.css', 'utf8');

    for (const selector of [
      '.sp-diagnostics-drawer',
      '.sp-diagnostics-list',
      '.sp-diagnostic-card',
      '.sp-diagnostic-card-head',
      '.sp-diagnostic-card footer',
    ]) {
      expect(css).toMatch(
        new RegExp(
          `${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{[^}]*min-width: 0;`,
        ),
      );
    }
    expect(css).toMatch(/\.sp-diagnostics-drawer \{[^}]*overflow-x: hidden;/);
  });

  it('keeps finding cards tall enough to show their content', () => {
    const css = readFileSync('src/DeveloperDiagnostics.module.css', 'utf8');

    expect(css).toMatch(
      /\.sp-diagnostics-list \{[^}]*grid-auto-rows: max-content;/,
    );
  });

  it('floats contextual findings above the API health trigger', () => {
    const css = readFileSync('src/DeveloperDiagnostics.module.css', 'utf8');

    expect(css).toMatch(
      /\.sp-inline-diagnostics \{[^}]*position: fixed;[^}]*right: 20px;[^}]*bottom: 72px;/,
    );
    expect(css).toMatch(
      /\.sp-inline-diagnostics \{[^}]*width: min\(380px, calc\(100vw - 40px\)\);[^}]*max-height: calc\(100vh - 112px\);/,
    );
    expect(css).not.toMatch(/\.sp-inline-diagnostics \{[^}]*margin-top:/);
  });

  it('renders the actions menu with a fixed icon instead of font glyphs', () => {
    render(
      <DeveloperDiagnostics
        diagnostics={findings}
        storageScope="test"
        open
        onOpenChange={() => undefined}
        scope="all"
        onScopeChange={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /API health:/ }));

    const actions = screen.getByLabelText('API health actions');
    expect(actions.querySelector('svg')).toBeInTheDocument();
    expect(actions).not.toHaveTextContent('•••');
  });

  it('formats every finding for copying and CSV export', () => {
    expect(diagnosticsAsText(findings)).toContain(
      '0 issues, 1 warning, 0 suggestions',
    );
    expect(diagnosticsAsText(findings)).toContain(
      'Suggested fix: Describe the operation.',
    );
    expect(diagnosticsAsCsv(findings)).toContain('"Severity","Source","Rule"');
    expect(diagnosticsAsCsv(findings)).toContain('"paths./companies.get"');
  });

  it('copies all visible findings as AI-friendly text', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(
      <DeveloperDiagnostics
        diagnostics={findings}
        storageScope="test"
        open
        onOpenChange={() => undefined}
        scope="all"
        onScopeChange={() => undefined}
      />,
    );

    fireEvent.click(screen.getByLabelText('API health actions'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy all' }));

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('GET /companies has no description.'),
    );
    expect(
      await screen.findByRole('button', { name: 'Copied' }),
    ).toBeInTheDocument();
  });

  it('opens on findings for the current endpoint and allows viewing all API findings', () => {
    const onScopeChange = vi.fn();
    const view = render(
      <DeveloperDiagnostics
        diagnostics={[...findings, apiFinding]}
        currentPageDiagnostics={findings}
        storageScope="test"
        open
        onOpenChange={() => undefined}
        scope="page"
        onScopeChange={onScopeChange}
      />,
    );

    expect(screen.getByRole('tab', { name: /This endpoint/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      screen.getByText('GET /companies has no description.'),
    ).toBeVisible();
    expect(
      screen.queryByText('API has no description.'),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /All API/ }));
    expect(onScopeChange).toHaveBeenCalledWith('all');
    view.rerender(
      <DeveloperDiagnostics
        diagnostics={[...findings, apiFinding]}
        currentPageDiagnostics={findings}
        storageScope="test"
        open
        onOpenChange={() => undefined}
        scope="all"
        onScopeChange={onScopeChange}
      />,
    );

    expect(screen.getByText('API has no description.')).toBeVisible();
  });

  it('collapses contextual hints and opens the full API health overlay', () => {
    const onViewAll = vi.fn();
    render(<InlineDiagnostics diagnostics={findings} onViewAll={onViewAll} />);

    expect(
      screen.getByText('GET /companies has no description.'),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse' }));
    expect(
      screen.queryByText('GET /companies has no description.'),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Expand' }));
    expect(
      screen.getByText('GET /companies has no description.'),
    ).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'View all' }));
    expect(onViewAll).toHaveBeenCalledOnce();
  });
});
