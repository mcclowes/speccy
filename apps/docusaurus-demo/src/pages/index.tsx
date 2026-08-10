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
      title="OpenAPI reference docs with room to breathe"
      description="Speccy turns an OpenAPI document into clean, searchable reference documentation for React and Docusaurus."
    >
      <main>
        <section className={scoped('home-hero')}>
          <div className={scoped('home-hero-copy')}>
            <span className={scoped('home-kicker')}>
              <i />
              OpenAPI, clearly presented
            </span>
            <h1>
              API docs with
              <br />
              <em>room to breathe.</em>
            </h1>
            <p>
              Speccy turns an OpenAPI document into a calm, searchable
              reference. Drop it into React, publish it with Docusaurus, or use
              the standalone studio.
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
          <ReferencePreview />
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
            Your API, less noisy
          </span>
          <h2>Give the contract some air.</h2>
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

function ReferencePreview() {
  return (
    <div
      className={scoped('preview-shell')}
      aria-label="Speccy API reference preview"
    >
      <aside className={scoped('preview-sidebar')}>
        <div className={scoped('preview-brand')}>
          <span>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3.5 9.5 5 7.75M20.5 9.5 19 7.75M9.5 11.5h5" />
              <circle cx="6.5" cy="13" r="3.5" />
              <circle cx="17.5" cy="13" r="3.5" />
            </svg>
          </span>
          Speccy Books
        </div>
        <small>Resources</small>
        <div className={scoped('preview-tag is-active')}>
          <span>▱</span>Books <i>⌄</i>
        </div>
        <div className={scoped('preview-link is-active')}>
          List books <b>GET</b>
        </div>
        <div className={scoped('preview-link')}>
          Add a book <b>POST</b>
        </div>
        <div className={scoped('preview-tag')}>
          <span>≡</span>Reading lists <i>›</i>
        </div>
      </aside>
      <div className={scoped('preview-content')}>
        <span className={scoped('preview-eyebrow')}>Books</span>
        <h2>List books</h2>
        <div className={scoped('preview-path')}>
          <b>GET</b>
          <code>/books</code>
        </div>
        <p>Returns the books currently available in the catalog.</p>
        <h3>Parameters</h3>
        <div className={scoped('preview-parameter')}>
          <code>limit</code>
          <span>integer</span>
          <small>Maximum books to return</small>
        </div>
        <div className={scoped('preview-response')}>
          <span>Responses</span>
          <b>200</b>
          <i />
        </div>
      </div>
    </div>
  );
}
