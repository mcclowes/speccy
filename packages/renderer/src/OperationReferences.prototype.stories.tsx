/**
 * PROTOTYPE: Four treatments for API-reference links inside documentation,
 * switchable with ?variant=A|B|C|D. Delete or absorb after choosing a direction.
 */

import { useEffect, useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  EndpointStrip,
  OperationCard,
  OperationLink,
  OperationPreview,
} from './docs';
import styles from './OperationReferences.prototype.stories.module.css';

const variants = ['A', 'B', 'C', 'D'] as const;
type Variant = (typeof variants)[number];
type Theme = 'light' | 'dark';

const variantNames: Record<Variant, string> = {
  A: 'Prose first',
  B: 'Endpoint strip',
  C: 'Reference card',
  D: 'Operation preview',
};

const requestExample = JSON.stringify(
  {
    profileId: '10001',
    tag: 'customer-123',
    rootUser: {
      name: 'Alex',
      surname: 'Morgan',
      email: 'alex@example.com',
      mobile: { countryCode: '+44', number: '7700900123' },
      companyPosition: 'DIRECTOR',
      dateOfBirth: { year: 1990, month: 1, day: 1 },
    },
    company: {
      name: 'Example Studio Ltd',
      tradingName: 'Example Studio',
      type: 'PRIVATE_LIMITED_COMPANY',
      industry: 'SOFTWARE_SERVICES',
      website: 'https://example.com',
      registrationNumber: '12345678',
      registrationCountry: 'GB',
      registeredAddress: {
        addressLine1: '20 Example Street',
        city: 'London',
        postCode: 'EC1A 1AA',
        country: 'GB',
      },
      expectedMonthlySpend: {
        currency: 'GBP',
        amount: 250000,
      },
    },
  },
  null,
  2,
);

const responseExample = JSON.stringify(
  {
    id: 'f51dca47-44a9-4bd5-9d89-33a9ad63d6e4',
    profileId: '10001',
    tag: 'customer-123',
    rootUser: {
      id: 'c3a0a4cf-6243-49ea-aa5d-2b92acb2d9f4',
      email: 'alex@example.com',
      state: 'ACTIVE',
    },
    company: {
      name: 'Example Studio Ltd',
      type: 'PRIVATE_LIMITED_COMPANY',
      registrationNumber: '12345678',
    },
    verification: {
      email: 'PENDING',
      mobile: 'PENDING',
      dueDiligence: 'NOT_STARTED',
    },
    createdAt: '2026-08-11T09:42:17Z',
  },
  null,
  2,
);

const operations = {
  create: {
    method: 'post',
    path: '/corporates',
    summary: 'Create a corporate identity',
    description:
      'Creates a corporate identity and its root user within your program.',
    href: '#operation-reference',
  },
  verify: {
    method: 'post',
    path: '/corporates/verification/email/verify',
    summary: 'Verify the root user email',
    description:
      'Confirms the root user email address using the code sent during onboarding.',
    href: '#operation-reference',
  },
  get: {
    method: 'get',
    path: '/corporates/{corporateId}',
    summary: 'Get a corporate',
    description:
      'Returns the corporate profile and its current verification status.',
    href: '#operation-reference',
  },
};

function DocsFrame({ children }: { children: ReactNode }) {
  return (
    <main className={styles.docsFrame}>
      <div className={styles.breadcrumbs}>
        Identities / Corporate onboarding
      </div>
      <h1>Create a corporate identity</h1>
      <p className={styles.lead}>
        Create the corporate, verify its root user, and then collect the details
        required for due diligence.
      </p>
      {children}
    </main>
  );
}

function VariantA() {
  return (
    <DocsFrame>
      <section className={styles.prose}>
        <h2>Create the corporate</h2>
        <p>
          Call <OperationLink {...operations.create} /> with the root
          user&apos;s details. Save the returned corporate ID for subsequent
          requests.
        </p>
        <p>
          Send the email verification code, then call{' '}
          <OperationLink {...operations.verify} /> to confirm the root
          user&apos;s address.
        </p>
        <h2>Check the result</h2>
        <p>
          Use <OperationLink {...operations.get} /> to retrieve the corporate
          and check its current status.
        </p>
      </section>
    </DocsFrame>
  );
}

function VariantB() {
  return (
    <DocsFrame>
      <section className={styles.prose}>
        <h2>Create the corporate</h2>
        <p>
          Submit the root user&apos;s details and save the corporate ID returned
          in the response.
        </p>
        <EndpointStrip {...operations.create} />
        <p>
          After sending a code to the root user, verify their email address.
        </p>
        <EndpointStrip {...operations.verify} />
        <h2>Check the result</h2>
        <EndpointStrip {...operations.get} />
      </section>
    </DocsFrame>
  );
}

function VariantC() {
  return (
    <DocsFrame>
      <section className={styles.prose}>
        <h2>Onboarding operations</h2>
        <p>
          These operations cover the first part of corporate onboarding. Open an
          operation for its schema, examples, and possible responses.
        </p>
        <div className={styles.cardGrid}>
          <OperationCard {...operations.create} />
          <OperationCard {...operations.verify} />
          <OperationCard {...operations.get} />
        </div>
      </section>
    </DocsFrame>
  );
}

function VariantD() {
  return (
    <DocsFrame>
      <section className={styles.prose}>
        <h2>Create the corporate</h2>
        <p>
          Submit the root user and company details. The response includes the
          corporate ID required by the rest of the onboarding flow.
        </p>
        <OperationPreview
          {...operations.create}
          requestExample={requestExample}
          responseExample={responseExample}
        />
        <p>
          Save the returned ID, then continue by verifying the root user&apos;s
          email address.
        </p>
      </section>
    </DocsFrame>
  );
}

function readVariant(): Variant {
  const value = new URLSearchParams(window.location.search).get('variant');
  return variants.includes(value as Variant) ? (value as Variant) : 'A';
}

function readTheme(): Theme {
  return new URLSearchParams(window.location.search).get('theme') === 'dark'
    ? 'dark'
    : 'light';
}

function Prototype() {
  const [variant, setVariant] = useState<Variant>(readVariant);
  const [theme, setTheme] = useState<Theme>(readTheme);

  function update(nextVariant: Variant, nextTheme = theme) {
    const params = new URLSearchParams(window.location.search);
    params.set('variant', nextVariant);
    params.set('theme', nextTheme);
    window.history.replaceState(null, '', `?${params.toString()}`);
    setVariant(nextVariant);
    setTheme(nextTheme);
  }

  function cycle(offset: number) {
    const index = variants.indexOf(variant);
    update(variants[(index + offset + variants.length) % variants.length]!);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, [contenteditable="true"]')) return;
      if (event.key === 'ArrowLeft') cycle(-1);
      if (event.key === 'ArrowRight') cycle(1);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const VariantComponent =
    variant === 'A'
      ? VariantA
      : variant === 'B'
        ? VariantB
        : variant === 'C'
          ? VariantC
          : VariantD;

  return (
    <div
      className={`speccy ${theme === 'dark' ? 'sp-theme-dark' : 'sp-theme-light'} ${styles.prototype}`}
    >
      <VariantComponent />
      {process.env.NODE_ENV !== 'production' && (
        <nav className={styles.switcher} aria-label="Prototype variants">
          <button
            type="button"
            onClick={() => cycle(-1)}
            aria-label="Previous variant"
          >
            ←
          </button>
          <span>
            <strong>{variant}</strong> · {variantNames[variant]}
          </span>
          <button
            type="button"
            onClick={() => cycle(1)}
            aria-label="Next variant"
          >
            →
          </button>
          <span className={styles.switcherDivider} />
          <button
            type="button"
            onClick={() =>
              update(variant, theme === 'light' ? 'dark' : 'light')
            }
          >
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
        </nav>
      )}
    </div>
  );
}

const meta = {
  title: 'Prototypes/Operation references',
  parameters: { layout: 'fullscreen' },
  render: () => <Prototype />,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// Keep the original export name because Storybook derives bookmarked story IDs
// from it. The visible name can change without breaking those URLs.
export const ThreeDirections: Story = { name: 'Four directions' };
