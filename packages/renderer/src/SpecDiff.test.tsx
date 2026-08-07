import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createSideBySideDiff, SpecDiff, type DiffReport } from './SpecDiff';

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
    expect(screen.getByText('No other changes were reported for this operation.')).toBeInTheDocument();

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
    expect(screen.getByText('No warning changes.')).toBeInTheDocument();
  });
});
