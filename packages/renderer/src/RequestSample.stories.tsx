import type { Meta, StoryObj } from '@storybook/react-vite';
import { RequestSample } from './RequestSample';

const meta = {
  title: 'Renderer/Data display/Request sample',
  component: RequestSample,
  parameters: { layout: 'padded' },
  args: {
    request: {
      method: 'POST',
      url: 'https://api.northstar.example/v1/payment-links',
      headers: [
        'Authorization: Bearer sk_example',
        'Content-Type: application/json',
      ],
      body: JSON.stringify(
        { amount: 4200, currency: 'GBP', reference: 'INV-2048' },
        null,
        2,
      ),
    },
    storageKey: 'storybook-request-language',
  },
} satisfies Meta<typeof RequestSample>;

export default meta;
type Story = StoryObj<typeof meta>;

export const POSTWithBody: Story = {};

export const GETWithoutBody: Story = {
  args: {
    request: {
      method: 'GET',
      url: 'https://api.northstar.example/v1/payment-links?status=open',
      headers: ['Authorization: Bearer sk_example'],
    },
    storageKey: 'storybook-request-language-get',
  },
};
