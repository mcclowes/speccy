import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DiffReport } from 'speccy-core';
import { SpecDiff } from './SpecDiff';

const report: DiffReport = {
  base: { title: 'Northstar payments', version: '1.4.0' },
  revision: { title: 'Northstar payments', version: '2.0.0' },
  changes: [
    {
      id: 'remove-payment-link',
      severity: 'breaking',
      kind: 'removed',
      method: 'delete',
      path: '/payment-links/{id}',
      tag: 'Payment links',
      location: ['paths', '/payment-links/{id}', 'delete'],
      message: 'Removed operation DELETE /payment-links/{id}',
    },
    {
      id: 'add-status-filter',
      severity: 'compatible',
      kind: 'added',
      method: 'get',
      path: '/payment-links',
      tag: 'Payment links',
      scope: { area: 'parameters', label: 'Query parameter · status' },
      location: ['paths', '/payment-links', 'get', 'parameters', 'status'],
      message: 'Added optional query parameter status',
      after: { name: 'status', in: 'query', required: false, schema: { type: 'string' } },
    },
    {
      id: 'change-description',
      severity: 'documentation',
      kind: 'changed',
      location: ['info', 'description'],
      message: 'Clarified the API description',
      before: 'Create and manage payments.',
      after: 'Create payment links, collect funds, and track settlement.',
    },
  ],
};

const meta = {
  title: 'Renderer/Data display/Spec diff',
  component: SpecDiff,
  parameters: { layout: 'fullscreen' },
  args: { report },
} satisfies Meta<typeof SpecDiff>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MixedChanges: Story = {};

export const Dark: Story = {
  args: { theme: 'dark', accentColor: '#9c8cff' },
};

export const NoChanges: Story = {
  args: { report: { ...report, changes: [] } },
};
