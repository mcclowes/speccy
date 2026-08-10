import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Parameter, RequestBody, ResponseObject } from 'speccy-core';
import { ParameterDetails, RequestBodyDetails, ResponseDetails } from './ResourceDetails';

const parameter: Parameter = { name: 'customerId', in: 'path', required: true, description: 'The customer to retrieve.', schema: { type: 'string', format: 'uuid', example: 'cus_123' } };
const requestBody: RequestBody = { required: true, description: 'The payment to create.', content: { 'application/json': { schema: { type: 'object', required: ['amount'], properties: { amount: { type: 'integer', example: 4200 }, currency: { type: 'string', enum: ['GBP', 'USD'] } } } } } };
const response: ResponseObject = { description: 'The created payment.', headers: { 'Request-Id': { description: 'Trace identifier.', schema: { type: 'string' } } }, content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string', enum: ['created'] } } }, example: { id: 'pay_123', status: 'created' } } } };

const meta = { title: 'Design system/Resource details', parameters: { layout: 'padded' } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const ParameterExample: Story = { render: () => <ParameterDetails parameter={parameter} /> };
export const CompactParameter: Story = { render: () => <ParameterDetails parameter={parameter} density="compact" summaryOnly /> };
export const RequestBodyExample: Story = { render: () => <RequestBodyDetails body={requestBody} title="Request body" /> };
export const ResponseExample: Story = { render: () => <ResponseDetails response={response} /> };
