import type { Meta, StoryObj } from '@storybook/react-vite';
import type { SchemaObject } from 'speccy-core';
import { SchemaView } from './SchemaView';

const transactionCategorySchema: SchemaObject = {
  title: 'TransactionCategory',
  type: 'object',
  description:
    'A hierarchical category associated with a transaction for greater contextual meaning.',
  required: ['id', 'name', 'hasChildren', 'status'],
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      description: 'Unique identifier for this transaction category.',
      example: '65b36c4f-7b3a-4b1e-9b16-8cadf489eec7',
    },
    name: {
      type: 'string',
      description:
        'Human-readable name shown alongside categorized transactions.',
      example: 'Food and dining',
    },
    parentId: {
      type: 'string',
      format: 'uuid',
      nullable: true,
      description:
        'Identifier of the parent category. Root categories have no parent.',
    },
    hasChildren: {
      type: 'boolean',
      description:
        'Whether this category contains one or more child categories.',
      example: true,
    },
    status: {
      title: 'TransactionCategoryStatus',
      type: 'string',
      enum: ['active', 'inactive', 'archived'],
      description: 'Current lifecycle status of the transaction category.',
      example: 'active',
    },
    merchant: {
      title: 'Merchant',
      type: 'object',
      description: 'Normalized merchant information attached to the category.',
      required: ['displayName'],
      properties: {
        displayName: {
          type: 'string',
          description: 'Normalized merchant name suitable for display.',
          example: 'The Good Grocer',
        },
        website: {
          type: 'string',
          format: 'uri',
          nullable: true,
          description: 'Canonical website for the merchant, when known.',
        },
        location: {
          title: 'Location',
          type: 'object',
          description: 'Location associated with the transaction.',
          required: ['countryCode'],
          properties: {
            city: {
              type: 'string',
              description: 'City reported by the payment network.',
              example: 'London',
            },
            countryCode: {
              type: 'string',
              description: 'Two-letter country code for the merchant location.',
              minLength: 2,
              maxLength: 2,
              example: 'GB',
            },
          },
        },
      },
    },
    aliases: {
      type: 'array',
      items: { type: 'string' },
      description: 'Alternative labels that can resolve to this category.',
      example: ['Restaurants', 'Eating out'],
    },
    legacyCode: {
      type: 'string',
      nullable: true,
      deprecated: true,
      description: 'Legacy category code. Use id for new integrations.',
    },
  },
};

const meta = {
  title: 'Renderer/Data display/Schema explorer',
  component: SchemaView,
  parameters: { layout: 'padded' },
  args: { schema: transactionCategorySchema },
} satisfies Meta<typeof SchemaView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InteractiveTree: Story = {};
