import type { Meta, StoryObj } from '@storybook/react-vite';
import { Speccy } from './Speccy';
import type { OpenAPIDocument } from './types';

const exampleSpec: OpenAPIDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Northstar payments',
    version: '2026-08-01',
    description: 'Create payment links, collect funds, and track settlement from one API.',
  },
  servers: [{ url: 'https://api.northstar.example/v1', description: 'Production' }],
  security: [{ bearerAuth: [] }],
  tags: [
    { name: 'Payment links', description: 'Hosted checkout sessions for one-time payments.' },
    { name: 'Settlements', description: 'Transfers from your balance to a bank account.' },
  ],
  paths: {
    '/payment-links': {
      post: {
        tags: ['Payment links'],
        summary: 'Create a payment link',
        operationId: 'createPaymentLink',
        description: 'Creates a hosted checkout page that expires after 24 hours.',
        parameters: [
          { name: 'Idempotency-Key', in: 'header', required: true, description: 'A unique key for this request.', schema: { type: 'string' }, example: 'order_8f391' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PaymentLinkRequest' },
              example: { amount: 4200, currency: 'GBP', reference: 'INV-2048' },
            },
          },
        },
        responses: {
          '201': {
            description: 'The payment link was created.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentLink' } } },
          },
          '422': { description: 'The request could not be processed.' },
        },
      },
    },
    '/payment-links/{paymentLinkId}': {
      get: {
        tags: ['Payment links'],
        summary: 'Get a payment link',
        operationId: 'getPaymentLink',
        parameters: [
          { name: 'paymentLinkId', in: 'path', required: true, description: 'The payment link identifier.', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'The payment link.' }, '404': { description: 'No payment link was found.' } },
      },
    },
    '/settlements': {
      get: {
        tags: ['Settlements'],
        summary: 'List settlements',
        operationId: 'listSettlements',
        responses: { '200': { description: 'A page of settlements.' } },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', description: 'Use a server-side API token.' },
    },
    schemas: {
      PaymentLinkRequest: {
        type: 'object',
        required: ['amount', 'currency'],
        properties: {
          amount: { type: 'integer', description: 'Amount in the currency minor unit.', example: 4200 },
          currency: { type: 'string', enum: ['GBP', 'EUR', 'USD'], example: 'GBP' },
          reference: { type: 'string', example: 'INV-2048' },
        },
      },
      PaymentLink: {
        type: 'object',
        required: ['id', 'url', 'status'],
        properties: {
          id: { type: 'string', example: 'plink_01J8Y3' },
          url: { type: 'string', format: 'uri', example: 'https://pay.northstar.example/plink_01J8Y3' },
          status: { type: 'string', enum: ['open', 'paid', 'expired'] },
        },
      },
    },
  },
};

const meta = {
  title: 'Renderer/Speccy',
  component: Speccy,
  parameters: {
    docs: {
      description: {
        component: 'The complete OpenAPI reference renderer in representative routes and themes.',
      },
    },
  },
  args: {
    spec: exampleSpec,
    showSidebar: true,
    showThemeToggle: false,
  },
} satisfies Meta<typeof Speccy>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OverviewLight: Story = {
  args: {
    theme: 'light',
    route: { page: 'overview' },
  },
};

export const EndpointLight: Story = {
  args: {
    theme: 'light',
    route: { page: 'operation', operationId: 'create-payment-link' },
  },
};

export const EndpointDark: Story = {
  args: {
    accentColor: '#9c8cff',
    theme: 'dark',
    route: { page: 'operation', operationId: 'create-payment-link' },
  },
};
