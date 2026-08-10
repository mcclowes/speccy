import type { Meta, StoryObj } from '@storybook/react-vite';
import type { SchemaObject } from 'speccy-core';
import { MediaContent, SchemaView } from './SchemaView';

const paymentSchema: SchemaObject = {
  type: 'object',
  required: ['amount', 'currency'],
  properties: {
    amount: {
      type: 'integer',
      minimum: 1,
      maximum: 1000000,
      description: 'Amount in the currency minor unit.',
      example: 4200,
    },
    currency: { type: 'string', enum: ['GBP', 'EUR', 'USD'], default: 'GBP' },
    reference: {
      type: 'string',
      minLength: 1,
      maxLength: 64,
      nullable: true,
      example: 'INV-2048',
    },
    customer: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          description: 'Receipt destination.',
        },
        marketingConsent: { type: 'boolean', readOnly: true },
      },
    },
  },
};

const meta = {
  title: 'Renderer/Data display/Schema view',
  component: SchemaView,
  parameters: { layout: 'padded' },
  args: { schema: paymentSchema },
} satisfies Meta<typeof SchemaView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ObjectSchema: Story = {};

export const NamedCollapsedObject: Story = {
  args: { name: 'payment', required: true, collapseObjects: true },
};

export const EnumField: Story = {
  args: {
    name: 'status',
    required: true,
    schema: {
      type: 'string',
      enum: ['open', 'paid', 'expired'],
      description: 'Current payment-link state.',
    },
  },
};

export const Alternatives: Story = {
  args: {
    schema: {
      oneOf: [
        {
          title: 'CardPayment',
          type: 'object',
          properties: { cardToken: { type: 'string' } },
        },
        {
          title: 'BankPayment',
          type: 'object',
          properties: { accountId: { type: 'string' } },
        },
      ],
    },
  },
};

export const MediaTypes: Story = {
  render: () => (
    <MediaContent
      content={{
        'application/json': {
          schema: paymentSchema,
          examples: {
            standard: {
              summary: 'Standard payment',
              value: { amount: 4200, currency: 'GBP' },
            },
            invoiced: {
              summary: 'With a reference',
              value: { amount: 9900, currency: 'EUR', reference: 'INV-2048' },
            },
          },
        },
      }}
    />
  ),
};
