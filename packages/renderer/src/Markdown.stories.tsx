import type { Meta, StoryObj } from '@storybook/react-vite';
import { Markdown } from './Markdown';

const meta = {
  title: 'Renderer/Primitives/Markdown',
  component: Markdown,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Markdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RichContent: Story = {
  args: {
    children: '## Create a payment link\n\nUse an **idempotency key** for safe retries.\n\n- Amounts use the currency minor unit.\n- Links expire after 24 hours.\n\n| Status | Meaning |\n| --- | --- |\n| `open` | Ready for payment |\n| `paid` | Payment complete |',
  },
};

export const Admonitions: Story = {
  args: {
    children: ':::warning[Keep tokens private]\nNever expose a server-side API token in browser code.\n:::\n\n:::tip\nReuse the same idempotency key when retrying a request.\n:::',
  },
};
