import React, { useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {
  EndpointStrip,
  OperationCard,
  OperationPreview,
} from 'docusaurus-plugin-speccy/client';
import {
  SpecDiff,
  Speccy,
  type DiffReport,
  type OpenAPIDocument,
  type SpeccyRoute,
} from 'speccy-renderer';
import styles from './index.module.css';

function scoped(className: string) {
  return className
    .split(' ')
    .flatMap((name) => (name ? [name, styles[name]] : []))
    .filter(Boolean)
    .join(' ');
}

const installCommand = 'npm install speccy-renderer';

const showcaseSpec: OpenAPIDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Orchard API',
    version: '1.4.0',
    description: 'Plan harvests and track fruit from tree to store.',
  },
  tags: [{ name: 'Harvests', description: 'Schedule and monitor picking.' }],
  paths: {
    '/orchards/{orchardId}/harvests': {
      post: {
        tags: ['Harvests'],
        operationId: 'createHarvest',
        summary: 'Schedule a harvest',
        description: 'Creates picking work for an orchard and crop.',
        parameters: [
          {
            name: 'orchardId',
            in: 'path',
            required: true,
            description: 'The orchard to harvest.',
            schema: { type: 'string', example: 'orch_01J7' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['startsAt', 'crop'],
                properties: {
                  startsAt: { type: 'string', format: 'date-time' },
                  crop: { type: 'string', example: 'apple' },
                  crewSize: { type: 'integer', example: 8 },
                },
              },
            },
          },
        },
        responses: {
          '202': {
            description: 'The harvest was scheduled.',
            content: {
              'application/json': {
                example: { id: 'harvest_01K4', status: 'scheduled' },
              },
            },
          },
        },
      },
    },
  },
};

const showcaseDiff: DiffReport = {
  base: { title: 'Orchard API', version: '1.3.0' },
  revision: { title: 'Orchard API', version: '1.4.0' },
  changes: [
    {
      id: 'crew-size-required',
      severity: 'breaking',
      kind: 'changed',
      method: 'post',
      path: '/orchards/{orchardId}/harvests',
      operationId: 'createHarvest',
      scope: { area: 'request-body', label: 'crewSize' },
      location: [
        'paths',
        '/orchards/{orchardId}/harvests',
        'post',
        'requestBody',
      ],
      message: 'crewSize is now required',
      before: { required: ['startsAt', 'crop'] },
      after: { required: ['startsAt', 'crop', 'crewSize'] },
    },
    {
      id: 'harvest-summary',
      severity: 'documentation',
      kind: 'changed',
      method: 'post',
      path: '/orchards/{orchardId}/harvests',
      operationId: 'createHarvest',
      location: ['paths', '/orchards/{orchardId}/harvests', 'post', 'summary'],
      message: 'Operation summary changed',
      before: 'Create a harvest',
      after: 'Schedule a harvest',
    },
  ],
};

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  const studioUrl = siteConfig.customFields?.studioUrl as string | undefined;

  return (
    <Layout
      title="Build, review, and publish OpenAPI"
      description="Speccy gives your OpenAPI contract one place to explore, review, test, and publish."
    >
      <main>
        <section className={scoped('home-hero')}>
          <div className={scoped('home-hero-copy')}>
            <span className={scoped('home-kicker')}>
              <i />
              One contract, every surface
            </span>
            <h1>
              Build, review,
              <br />
              and <em>publish.</em>
            </h1>
            <p>
              Speccy turns an OpenAPI document into a reference people can use,
              a workspace for exploring it, and checks that catch problems
              before they ship.
            </p>
            <div className={scoped('home-actions')}>
              <Link
                className={scoped('home-button home-button-primary')}
                to="/docs/getting-started"
              >
                Get started <span>→</span>
              </Link>
              {studioUrl ? (
                <a
                  className={scoped('home-button home-button-secondary')}
                  href={studioUrl}
                >
                  Open studio
                </a>
              ) : (
                <Link
                  className={scoped('home-button home-button-secondary')}
                  to="/api"
                >
                  View live example
                </Link>
              )}
            </div>
            <div className={scoped('home-install')}>
              <span>$</span>
              <code>{installCommand}</code>
            </div>
          </div>
          <ProductPreview />
        </section>

        <section className={scoped('home-section home-intro')}>
          <div>
            <span className={scoped('home-section-number')}>01</span>
            <h2>Your spec is already the source of truth.</h2>
          </div>
          <p>
            Speccy reads OpenAPI 3.x and Swagger 2 directly. There’s no second
            content model to maintain, no generated Markdown to review, and no
            theme maze between you and your API.
          </p>
        </section>

        <section className={scoped('home-features home-section')}>
          <Feature
            number="02"
            title="Built for readers"
            text="Search, stable routes, focused endpoint pages, and responsive layouts make a large API feel smaller."
          />
          <Feature
            number="03"
            title="Useful requests"
            text="Parameter inputs, authorization, code samples, and live requests sit beside the endpoint they belong to."
          />
          <Feature
            number="04"
            title="One renderer"
            text="React, Docusaurus, the web studio, and the Mac app share the same rendering core and visual language."
          />
        </section>

        <RendererShowcase />

        <section className={scoped('home-section home-ways')}>
          <div className={scoped('home-ways-heading')}>
            <span className={scoped('home-kicker')}>
              <i />
              Choose your surface
            </span>
            <h2>Start where your docs live.</h2>
          </div>
          <div className={scoped('home-way-grid')}>
            <Way
              eyebrow="React"
              title="Own the whole page"
              text="Render any parsed object, YAML string, or JSON string inside your app."
              href="/docs/react-renderer"
            />
            <Way
              eyebrow="Docusaurus"
              title="Publish beside your guides"
              text="Generate reference routes at build time, or embed a spec directly in MDX."
              href="/docs/docusaurus"
            />
            <Way
              eyebrow="Studio"
              title="Inspect before you ship"
              text="Open, paste, or fetch a spec and see the finished reference immediately."
              href={studioUrl ?? '/api'}
            />
          </div>
        </section>

        <section className={scoped('home-cta')}>
          <span className={scoped('home-kicker')}>
            <i />
            One source of truth
          </span>
          <h2>Take your API from spec to shipped.</h2>
          <div className={scoped('home-actions')}>
            <Link
              className={scoped('home-button home-button-primary')}
              to="/docs/getting-started"
            >
              Read the docs <span>→</span>
            </Link>
            <a
              className={scoped('home-button home-button-secondary')}
              href="https://github.com/mcclowes/speccy"
            >
              View on GitHub
            </a>
          </div>
        </section>
      </main>
    </Layout>
  );
}

function RendererShowcase() {
  const [route, setRoute] = useState<SpeccyRoute>({
    page: 'operation',
    operationId: 'createharvest',
  });

  return (
    <section className={scoped('home-renderer')}>
      <div className={scoped('home-renderer-heading')}>
        <div>
          <span className={scoped('home-kicker')}>
            <i />
            The renderer, rendered
          </span>
          <h2>Every Speccy surface, in the open.</h2>
        </div>
        <p>
          Explore the complete renderer, drop focused components into a guide,
          review a contract change, or work with the same model directly in
          code.
        </p>
      </div>

      <ShowcaseRow
        number="01"
        eyebrow="Reference renderer"
        title="The whole API, ready to explore."
        text="Searchable navigation, endpoint detail, examples, schemas, and live requests come from one OpenAPI document."
        href="/docs/react-renderer"
      >
        <div className={scoped('home-renderer-frame')}>
          <Speccy
            className={scoped('home-renderer-speccy')}
            spec={showcaseSpec}
            route={route}
            onNavigate={setRoute}
            hrefForRoute={(nextRoute) =>
              nextRoute.page === 'operation'
                ? `/api/${nextRoute.operationId}`
                : '/api'
            }
            showDeveloperHints={false}
            showThemeToggle={false}
            theme="inherit"
            tryIt={false}
          />
        </div>
      </ShowcaseRow>

      <ShowcaseRow
        number="02"
        eyebrow="React components"
        title="Bring operations into the story."
        text="Use the same method badges, links, cards, and examples inside guides, tutorials, changelogs, or your own React UI."
        href="/docs/operation-components"
        reverse
      >
        <div className={scoped('home-components-demo')}>
          <span className={scoped('home-renderer-file')}>
            harvest-guide.mdx
          </span>
          <h3>Schedule the first harvest</h3>
          <p>
            Find an orchard, then create picking work for the next available
            window.
          </p>
          <EndpointStrip
            method="get"
            path="/orchards"
            href="/api/listorchards"
          />
          <OperationCard
            className={scoped('home-renderer-card')}
            method="post"
            path="/orchards/{orchardId}/harvests"
            summary="Schedule a harvest"
            description="Create picking work for an orchard and crop."
            href="/api/createharvest"
          />
          <OperationPreview
            className={scoped('home-renderer-operation')}
            method="post"
            path="/orchards/{orchardId}/harvests"
            href="/api/createharvest"
            requestExample={
              '{\n  "startsAt": "2026-09-14T07:00:00Z",\n  "crop": "apple",\n  "crewSize": 8\n}'
            }
            responseExample={
              '{\n  "id": "harvest_01K4",\n  "status": "scheduled",\n  "orchardId": "orch_01J7"\n}'
            }
          />
        </div>
      </ShowcaseRow>

      <ShowcaseRow
        number="03"
        eyebrow="CI review"
        title="See contract risk before merge."
        text="Speccy compares the base and revision specs, groups semantic changes by severity, and publishes the same review in GitHub or your terminal."
        href="/docs/ci-review"
      >
        <div className={scoped('home-diff-frame')}>
          <SpecDiff
            className={scoped('home-diff')}
            title="API contract review"
            headingLevel={3}
            report={showcaseDiff}
            theme="system"
            accentColor="#6d5dfc"
          />
        </div>
      </ShowcaseRow>

      <ShowcaseRow
        number="04"
        eyebrow="In-code tooling"
        title="Use the engine without the UI."
        text="Parse, normalize, analyze, and compare OpenAPI documents with typed functions that run in Node, CI, or the browser."
        href="/docs/react-renderer"
        reverse
      >
        <div className={scoped('home-code-demo')}>
          <div className={scoped('home-code-heading')}>
            <span>review.ts</span>
            <i>TypeScript</i>
          </div>
          <pre>
            <code>{`import { analyzeOpenApi, diffSpecs } from 'speccy-core';

const diagnostics = analyzeOpenApi(spec);
const changes = diffSpecs(previous, spec);

return {
  issues: diagnostics.filter(({ severity }) => severity === 'issue'),
  breaking: changes.changes.filter(({ severity }) => severity === 'breaking'),
};`}</code>
          </pre>
          <div className={scoped('home-code-result')}>
            <span>✓ Parsed OpenAPI 3.1</span>
            <span>2 diagnostics</span>
            <strong>1 breaking change</strong>
          </div>
        </div>
      </ShowcaseRow>
    </section>
  );
}

function ShowcaseRow({
  number,
  eyebrow,
  title,
  text,
  href,
  reverse = false,
  children,
}: {
  number: string;
  eyebrow: string;
  title: string;
  text: string;
  href: string;
  reverse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <article
      className={scoped(`home-showcase-row ${reverse ? 'is-reverse' : ''}`)}
    >
      <div className={scoped('home-showcase-copy')}>
        <span className={scoped('home-showcase-number')}>{number}</span>
        <span className={scoped('home-showcase-eyebrow')}>{eyebrow}</span>
        <h3>{title}</h3>
        <p>{text}</p>
        <Link to={href}>Explore {eyebrow.toLowerCase()} →</Link>
      </div>
      <div className={scoped('home-showcase-visual')}>{children}</div>
    </article>
  );
}

function Feature({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <article className={scoped('home-feature')}>
      <span>{number}</span>
      <div className={scoped('home-feature-mark')} />
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function Way({
  eyebrow,
  title,
  text,
  href,
}: {
  eyebrow: string;
  title: string;
  text: string;
  href: string;
}) {
  return (
    <Link className={scoped('home-way')} to={href}>
      <span>{eyebrow}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      <b>
        Explore <i>→</i>
      </b>
    </Link>
  );
}

function ProductPreview() {
  return (
    <div
      className={scoped('preview-shell')}
      aria-label="An OpenAPI contract connected to Speccy’s reference, Studio, and CI tools"
    >
      <div className={scoped('preview-toolbar')}>
        <div className={scoped('preview-brand')}>
          <span>S</span>
          Speccy
        </div>
        <div className={scoped('preview-window-controls')}>
          <i />
          <i />
          <i />
        </div>
      </div>
      <div className={scoped('preview-workspace')}>
        <div className={scoped('preview-source')}>
          <span className={scoped('preview-label')}>Source</span>
          <div className={scoped('preview-source-heading')}>
            <i>YML</i>
            <div>
              <strong>openapi.yaml</strong>
              <small>OpenAPI 3.1</small>
            </div>
            <b>✓</b>
          </div>
          <code>
            <span>openapi:</span> 3.1.0
            <br />
            <span>info:</span>
            <br />
            &nbsp;&nbsp;title: Orchard API
            <br />
            <span>paths:</span>
            <br />
            &nbsp;&nbsp;/orchards:
            <br />
            &nbsp;&nbsp;&nbsp;&nbsp;get: …
          </code>
        </div>
        <div className={scoped('preview-connector')} aria-hidden="true">
          <span />
          <i />
          <span />
        </div>
        <div className={scoped('preview-surfaces')}>
          <PreviewSurface
            name="Reference"
            detail="Searchable docs and live requests"
            accent="GET /orchards"
          />
          <PreviewSurface
            name="Studio"
            detail="Explore and review any spec"
            accent="12 health checks"
          />
          <PreviewSurface
            name="CI review"
            detail="Catch breaking changes in pull requests"
            accent="Ready to merge"
          />
        </div>
      </div>
    </div>
  );
}

function PreviewSurface({
  name,
  detail,
  accent,
}: {
  name: string;
  detail: string;
  accent: string;
}) {
  return (
    <div className={scoped('preview-surface')}>
      <i>✓</i>
      <div>
        <strong>{name}</strong>
        <p>{detail}</p>
        <span>{accent}</span>
      </div>
      <b>→</b>
    </div>
  );
}
