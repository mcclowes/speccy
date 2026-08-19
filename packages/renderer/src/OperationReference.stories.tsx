import type { Meta, StoryObj } from '@storybook/react-vite';
import type { OpenAPIDocument } from 'speccy-core';
import {
  EndpointStrip,
  OperationCard,
  OperationLink,
  OperationPreview,
  OperationReferenceProvider,
} from './docs';

const spec: OpenAPIDocument = {
  openapi: '3.1.0',
  info: { title: 'Identities', version: '2026-08-01' },
  paths: {
    '/corporates': {
      post: {
        operationId: 'createCorporate',
        summary: 'Create a corporate identity',
        parameters: [
          {
            name: 'idempotency-ref',
            in: 'header',
            example: 'corporate-2026-08-11-001',
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              example: {
                profileId: '10001',
                tag: 'customer-123',
                rootUser: {
                  name: 'Alex',
                  surname: 'Morgan',
                  email: 'alex@example.com',
                  mobile: { countryCode: '+44', number: '7700900123' },
                  companyPosition: 'DIRECTOR',
                },
                company: {
                  name: 'Example Studio Ltd',
                  type: 'PRIVATE_LIMITED_COMPANY',
                  registrationNumber: '12345678',
                  registrationCountry: 'GB',
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                example: {
                  id: 'f51dca47-44a9-4bd5-9d89-33a9ad63d6e4',
                  profileId: '10001',
                  rootUser: { email: 'alex@example.com', state: 'ACTIVE' },
                  verification: {
                    email: 'PENDING',
                    dueDiligence: 'NOT_STARTED',
                  },
                  createdAt: '2026-08-11T09:42:17Z',
                },
              },
            },
          },
        },
      },
    },
    '/corporates/{corporateId}': {
      get: {
        operationId: 'getCorporate',
        summary: 'Get a corporate',
        parameters: [
          { name: 'corporateId', in: 'path', example: 'corp_01HZX' },
          { name: 'expand', in: 'query', schema: { default: 'rootUser' } },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                example: {
                  id: 'corp_01HZX',
                  verification: { email: 'VERIFIED' },
                },
              },
            },
          },
        },
      },
    },
  },
};

const createCorporate = {
  method: 'post',
  path: '/corporates',
  summary: 'Create a corporate identity',
  description:
    'Creates a corporate identity and its root user within your program.',
  href: '#create-corporate',
};

const getCorporate = {
  method: 'get',
  path: '/corporates/{corporateId}',
  summary: 'Get a corporate',
  description:
    'Returns the corporate profile and its current verification status.',
  href: '#get-corporate',
};

const meta = {
  title: 'Renderer/Docs/Operation references',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Link: Story = {
  render: () => (
    <p style={{ maxWidth: 640 }}>
      Call <OperationLink {...createCorporate} /> with the root user&apos;s
      details, then use <OperationLink {...getCorporate} /> to check its
      verification status.
    </p>
  ),
};

export const Strip: Story = {
  render: () => <EndpointStrip {...createCorporate} />,
};

export const Card: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16, maxWidth: 640 }}>
      <OperationCard {...createCorporate} />
      <OperationCard {...getCorporate} />
    </div>
  ),
};

export const Preview: Story = {
  render: () => (
    <div style={{ maxWidth: 760 }}>
      <OperationPreview
        {...createCorporate}
        requestValues={{
          headers: { 'idempotency-ref': 'corporate-2026-08-11-001' },
        }}
        requestExample={{
          profileId: '10001',
          tag: 'customer-123',
          rootUser: { name: 'Alex', surname: 'Morgan' },
        }}
        responseExample={{ id: 'f51dca47-44a9-4bd5-9d89-33a9ad63d6e4' }}
      />
    </div>
  ),
};

export const DerivedFromSpec: Story = {
  name: 'Derived from spec',
  render: () => (
    <OperationReferenceProvider spec={spec} basePath="/api">
      <div style={{ display: 'grid', gap: 24, maxWidth: 760 }}>
        <p>
          Start with <OperationLink operationId="createCorporate" />, then poll{' '}
          <OperationLink operationId="getCorporate" />.
        </p>
        <OperationPreview operationId="createCorporate" />
        <OperationPreview operationId="getCorporate" />
      </div>
    </OperationReferenceProvider>
  ),
};
