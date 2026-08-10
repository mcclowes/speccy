import type { Meta, StoryObj } from '@storybook/react-vite';
import { CodeBlock } from './CodeBlock';

const jsonValue = JSON.stringify(
  {
    id: 'plink_01J8Y3',
    status: 'open',
    amount: 4200,
    metadata: { invoice: 'INV-2048', retryable: false },
  },
  null,
  2,
);

const meta = {
  title: 'Renderer/Primitives/Code block',
  component: CodeBlock,
  parameters: { layout: 'padded' },
  args: { value: jsonValue },
} satisfies Meta<typeof CodeBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const JSONValue: Story = {};

export const WithTitleAndLineNumbers: Story = {
  args: { title: 'Response', lineNumbers: true },
};

export const CollapsibleJSON: Story = {
  args: {
    title: 'Response',
    collapsibleValue: JSON.parse(jsonValue),
  },
};

export const PlainText: Story = {
  args: {
    copyable: false,
    value: 'HTTP/1.1 204 No Content\nCache-Control: no-store',
  },
};
