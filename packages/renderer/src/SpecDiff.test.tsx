import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SpecDiff, type DiffReport } from './SpecDiff';

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

    fireEvent.click(screen.getByText('Added optional query parameter status'));
    expect(screen.getByText('After')).toBeInTheDocument();
    expect(screen.getByText(/"required": false/)).toBeInTheDocument();
  });

  it('shows an empty state when the selected filter has no matches', () => {
    render(<SpecDiff report={{ ...report, changes: report.changes.filter((change) => change.severity !== 'warning') }} />);
    fireEvent.click(screen.getByRole('button', { name: /Warnings 0/ }));
    expect(screen.getByText('No warning changes.')).toBeInTheDocument();
  });
});
