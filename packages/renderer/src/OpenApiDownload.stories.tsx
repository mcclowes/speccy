import type { Meta, StoryObj } from '@storybook/react-vite';
import type { OpenAPIDocument } from 'speccy-core';
import { OpenApiDownload } from './OpenApiDownload';

const document: OpenAPIDocument = {
  openapi: '3.1.0',
  info: { title: 'Northstar payments', version: '2026-08-01' },
  paths: {},
};

const meta = {
  title: 'Renderer/Actions/OpenAPI download',
  component: OpenApiDownload,
  parameters: { layout: 'padded' },
  args: { document },
} satisfies Meta<typeof OpenApiDownload>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithIntegrations: Story = {
  args: {
    openApiUrl: '/openapi.yaml',
    postmanCollectionUrl: 'https://www.postman.com/example/collection',
  },
};
