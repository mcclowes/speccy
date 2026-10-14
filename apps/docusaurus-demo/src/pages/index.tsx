import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './index.module.css';

function scoped(className: string) {
  return className
    .split(' ')
    .flatMap((name) => (name ? [name, styles[name]] : []))
    .filter(Boolean)
    .join(' ');
}

const installCommand = 'npm install speccy-renderer';

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
