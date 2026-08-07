import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeveloperDiagnostics, InlineDiagnostics, diagnosticsAsCsv, diagnosticsAsText } from './DeveloperDiagnostics';
import type { ApiDiagnostic } from './diagnostics';

const findings: ApiDiagnostic[] = [{
  id: 'missing-description',
  ruleId: 'operation-description',
  source: 'speccy',
  severity: 'warning',
  category: 'documentation',
  message: 'GET /companies has no description.',
  rationale: 'Consumers need to know what the operation does.',
  suggestion: 'Describe the operation.',
  path: ['paths', '/companies', 'get'],
}];

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('developer diagnostics layout', () => {
  it('allows drawer rows and cards to shrink within the viewport', () => {
    const css = readFileSync('src/styles.css', 'utf8');

    for (const selector of ['.sp-diagnostics-drawer', '.sp-diagnostics-list', '.sp-diagnostic-card', '.sp-diagnostic-card-head', '.sp-diagnostic-card footer']) {
      expect(css).toMatch(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{[^}]*min-width: 0;`));
    }
    expect(css).toMatch(/\.sp-diagnostics-drawer \{[^}]*overflow-x: hidden;/);
  });

  it('floats contextual findings above the API health trigger', () => {
    const css = readFileSync('src/styles.css', 'utf8');

    expect(css).toMatch(/\.sp-inline-diagnostics \{[^}]*position: fixed;[^}]*right: 20px;[^}]*bottom: 72px;/);
    expect(css).toMatch(/\.sp-inline-diagnostics \{[^}]*width: min\(380px, calc\(100vw - 40px\)\);[^}]*max-height: calc\(100vh - 112px\);/);
    expect(css).not.toMatch(/\.sp-inline-diagnostics \{[^}]*margin-top:/);
  });

  it('formats every finding for copying and CSV export', () => {
    expect(diagnosticsAsText(findings)).toContain('0 issues, 1 warning, 0 suggestions');
    expect(diagnosticsAsText(findings)).toContain('Suggested fix: Describe the operation.');
    expect(diagnosticsAsCsv(findings)).toContain('"Severity","Source","Rule"');
    expect(diagnosticsAsCsv(findings)).toContain('"paths./companies.get"');
  });

  it('copies all visible findings as AI-friendly text', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<DeveloperDiagnostics diagnostics={findings} storageScope="test" showInlineHints onShowInlineHintsChange={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: /API health:/ }));
    fireEvent.click(screen.getByText('Actions'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy all' }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('GET /companies has no description.'));
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('lets users hide contextual hints and restore them from API health', () => {
    const onHide = vi.fn();
    const onShowInlineHintsChange = vi.fn();
    render(<><InlineDiagnostics diagnostics={findings} onHide={onHide} /><DeveloperDiagnostics diagnostics={findings} storageScope="test" showInlineHints={false} onShowInlineHintsChange={onShowInlineHintsChange} /></>);

    fireEvent.click(screen.getByRole('button', { name: 'Hide hints' }));
    expect(onHide).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: /API health:/ }));
    fireEvent.click(screen.getByText('Actions'));
    fireEvent.click(screen.getByRole('button', { name: 'Show hints' }));
    expect(onShowInlineHintsChange).toHaveBeenCalledWith(true);
  });
});
