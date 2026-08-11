/**
 * PROTOTYPE: Three treatments for API-reference links inside documentation,
 * switchable with ?variant=A|B|C. Delete or absorb after choosing a direction.
 */

import { useEffect, useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ApiPath, MethodBadge } from './DesignSystem';
import styles from './OperationReferences.prototype.stories.module.css';

const variants = ['A', 'B', 'C'] as const;
type Variant = (typeof variants)[number];
type Theme = 'light' | 'dark';

const variantNames: Record<Variant, string> = {
  A: 'Prose first',
  B: 'Endpoint strip',
  C: 'Reference card',
};

const operations = {
  create: {
    method: 'post',
    path: '/corporates',
    summary: 'Create a corporate identity',
    description:
      'Creates a corporate identity and its root user within your program.',
  },
  verify: {
    method: 'post',
    path: '/corporates/verification/email/verify',
    summary: 'Verify the root user email',
    description:
      'Confirms the root user email address using the code sent during onboarding.',
  },
  get: {
    method: 'get',
    path: '/corporates/{corporateId}',
    summary: 'Get a corporate',
    description:
      'Returns the corporate profile and its current verification status.',
  },
};

type Operation = (typeof operations)[keyof typeof operations];

function OperationLink({ operation }: { operation: Operation }) {
  return (
    <a className={styles.inlineLink} href="#operation-reference">
      <MethodBadge method={operation.method} compact />
      <ApiPath value={operation.path} wrap />
    </a>
  );
}

function EndpointStrip({ operation }: { operation: Operation }) {
  return (
    <a className={styles.endpointStrip} href="#operation-reference">
      <span className={styles.endpointIdentity}>
        <MethodBadge method={operation.method} />
        <ApiPath value={operation.path} wrap />
      </span>
      <span className={styles.endpointAction}>
        Open reference <span aria-hidden="true">↗</span>
      </span>
    </a>
  );
}

function ReferenceCard({ operation }: { operation: Operation }) {
  return (
    <a className={styles.referenceCard} href="#operation-reference">
      <span className={styles.cardTopline}>
        <MethodBadge method={operation.method} compact />
        <ApiPath value={operation.path} wrap />
      </span>
      <strong>{operation.summary}</strong>
      <span className={styles.cardDescription}>{operation.description}</span>
      <span className={styles.cardAction}>
        View operation <span aria-hidden="true">→</span>
      </span>
    </a>
  );
}

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
          Call <OperationLink operation={operations.create} /> with the root
          user&apos;s details. Save the returned corporate ID for subsequent
          requests.
        </p>
        <p>
          Send the email verification code, then call{' '}
          <OperationLink operation={operations.verify} /> to confirm the root
          user&apos;s address.
        </p>
        <h2>Check the result</h2>
        <p>
          Use <OperationLink operation={operations.get} /> to retrieve the
          corporate and check its current status.
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
        <EndpointStrip operation={operations.create} />
        <p>
          After sending a code to the root user, verify their email address.
        </p>
        <EndpointStrip operation={operations.verify} />
        <h2>Check the result</h2>
        <EndpointStrip operation={operations.get} />
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
          <ReferenceCard operation={operations.create} />
          <ReferenceCard operation={operations.verify} />
          <ReferenceCard operation={operations.get} />
        </div>
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
    variant === 'A' ? VariantA : variant === 'B' ? VariantB : VariantC;

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

export const ThreeDirections: Story = {};
