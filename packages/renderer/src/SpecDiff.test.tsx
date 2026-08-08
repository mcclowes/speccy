import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createSideBySideDiff, SpecDiff } from './SpecDiff';
import type { DiffReport } from '@speccy/core';

afterEach(cleanup);

const report: DiffReport = {
  base: { title: 'Catalog API', version: '1.0.0' },
  revision: { title: 'Catalog API', version: '2.0.0' },
  changes: [
    {
      id: 'remove-company',
      severity: 'breaking',
      kind: 'removed',
      method: 'get',
      path: '/companies/{id}',
      tag: 'Companies',
      location: ['paths', '/companies/{id}', 'get'],
      message: 'Removed operation GET /companies/{id}',
    },
    {
      id: 'add-filter',
      severity: 'compatible',
      kind: 'added',
      method: 'get',
      path: '/companies',
      tag: 'Companies',
      scope: { area: 'parameters', label: 'Query parameter · status' },
      location: ['paths', '/companies', 'get', 'parameters', 'status'],
      message: 'Added optional query parameter status',
      after: { name: 'status', in: 'query', required: false },
    },
    {
      id: 'edit-description',
      severity: 'documentation',
      kind: 'changed',
      location: ['info', 'description'],
      message: 'Changed API description',
      before: 'Old description',
      after: 'New description',
    },
  ],
};

describe('SpecDiff', () => {
  it('summarizes and groups API changes', () => {
    render(<SpecDiff report={report} />);

    expect(screen.getByRole('heading', { name: 'API changes' })).toBeInTheDocument();
    const summary = screen.getByLabelText('Change summary');
    expect(within(summary).getByText('breaking').previousElementSibling).toHaveTextContent('1');
    expect(within(summary).getByText('compatible').previousElementSibling).toHaveTextContent('1');
    expect(within(summary).getByText('documentation').previousElementSibling).toHaveTextContent('1');
    expect(screen.getByRole('heading', { name: 'Companies' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'General' })).toBeInTheDocument();
    expect(screen.getByText('/companies/{id}')).toBeInTheDocument();
  });

  it('filters changes by severity and exposes structured before and after values', () => {
    render(<SpecDiff report={report} />);

    fireEvent.click(screen.getByRole('button', { name: /Compatible 1/ }));
    expect(screen.getByText('Added optional query parameter status')).toBeInTheDocument();
    expect(screen.queryByText('Removed operation GET /companies/{id}')).not.toBeInTheDocument();
    expect(screen.getByText('Query parameter · status')).toBeInTheDocument();
    const impact = screen.getByLabelText('Operation impact');
    expect(within(impact).getByText('Parameters').parentElement).toHaveTextContent('1 changed');
    expect(within(impact).getByText('Request body').parentElement).toHaveTextContent('Unchanged');
    fireEvent.click(screen.getByText('Added optional query parameter status'));
    expect(screen.getByText('After')).toBeInTheDocument();
    expect(screen.getByText(/"required": false/)).toBeInTheDocument();
  });

  it('aligns unchanged lines and highlights removals and additions', () => {
    expect(createSideBySideDiff(
      'alpha\nremoved\nshared',
      'alpha\nshared\nadded',
    )).toEqual([
      {
        before: { number: 1, text: 'alpha', changed: false },
        after: { number: 1, text: 'alpha', changed: false },
      },
      {
        before: { number: 2, text: 'removed', changed: true },
        after: undefined,
      },
      {
        before: { number: 3, text: 'shared', changed: false },
        after: { number: 2, text: 'shared', changed: false },
      },
      {
        before: undefined,
        after: { number: 3, text: 'added', changed: true },
      },
    ]);
  });

  it('shows an empty state when the selected filter has no matches', () => {
    render(<SpecDiff report={{ ...report, changes: report.changes.filter((change) => change.severity !== 'warning') }} />);
    fireEvent.click(screen.getByRole('button', { name: /Warnings 0/ }));
    expect(screen.getByText('No matching changes.')).toBeInTheDocument();
  });

  it('keeps navigation separate from the disclosure control', () => {
    render(<SpecDiff report={report} hrefForChange={() => '/reference/get-company'} />);

    fireEvent.click(screen.getByText('Added optional query parameter status'));
    expect(screen.getByText('After')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'View operation' })[0]).toHaveAttribute('href', '/reference/get-company');
  });

  it('renders severity, anchors, source locations, and a configurable heading level', () => {
    const sourcedReport: DiffReport = {
      ...report,
      changes: [{
        ...report.changes[0]!,
        source: { base: { source: 'old.yaml', line: 12, column: 4 } },
      }],
    };
    const { container } = render(<SpecDiff report={sourcedReport} headingLevel={3} />);

    expect(screen.getByRole('heading', { level: 3, name: 'API changes' })).toBeInTheDocument();
    expect(container.querySelector('.sp-diff-severity-breaking')).toHaveTextContent('breaking');
    expect(container.querySelector('#remove-company')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Removed operation GET /companies/{id}'));
    expect(screen.getByText('old.yaml:12:4')).toBeInTheDocument();
  });

  it('rejects malformed serialized reports', () => {
    expect(() => render(<SpecDiff report={{ ...report, changes: [{ ...report.changes[0]!, severity: 'urgent' as 'breaking' }] }} />))
      .toThrow('unknown severity "urgent"');
  });

  it('uses the operation-level add or remove change for the whole-operation banner', () => {
    const mixed: DiffReport = {
      ...report,
      changes: [
        { ...report.changes[1]!, method: 'get', path: '/companies' },
        { ...report.changes[0]!, id: 'remove-companies', path: '/companies', scope: { area: 'operation' } },
      ],
    };
    render(<SpecDiff report={mixed} />);
    expect(screen.getByText('The entire operation was removed.')).toBeInTheDocument();
  });
});
