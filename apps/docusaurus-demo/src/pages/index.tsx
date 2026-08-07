import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

const installCommand = 'npm install @speccy/renderer';

export default function Home() {
  return (
    <Layout title="OpenAPI reference docs with room to breathe" description="Speccy turns an OpenAPI document into clean, searchable reference documentation for React and Docusaurus.">
      <main>
        <section className="home-hero">
          <div className="home-hero-copy">
            <span className="home-kicker"><i />OpenAPI, clearly presented</span>
            <h1>API docs with<br /><em>room to breathe.</em></h1>
            <p>Speccy turns an OpenAPI document into a calm, searchable reference. Drop it into React, publish it with Docusaurus, or use the standalone studio.</p>
            <div className="home-actions">
              <Link className="home-button home-button-primary" to="/docs/getting-started">Get started <span>→</span></Link>
              <Link className="home-button home-button-secondary" to="/api">View live example</Link>
            </div>
            <div className="home-install"><span>$</span><code>{installCommand}</code></div>
          </div>
          <ReferencePreview />
        </section>

        <section className="home-section home-intro">
          <div><span className="home-section-number">01</span><h2>Your spec is already the source of truth.</h2></div>
          <p>Speccy reads OpenAPI 3.x and Swagger 2 directly. There’s no second content model to maintain, no generated Markdown to review, and no theme maze between you and your API.</p>
        </section>

        <section className="home-features home-section">
          <Feature number="02" title="Built for readers" text="Search, stable routes, focused endpoint pages, and responsive layouts make a large API feel smaller." />
          <Feature number="03" title="Useful requests" text="Parameter inputs, authorization, code samples, and live requests sit beside the endpoint they belong to." />
          <Feature number="04" title="One renderer" text="React, Docusaurus, the web studio, and the Mac app share the same rendering core and visual language." />
        </section>

        <section className="home-section home-ways">
          <div className="home-ways-heading"><span className="home-kicker"><i />Choose your surface</span><h2>Start where your docs live.</h2></div>
          <div className="home-way-grid">
            <Way eyebrow="React" title="Own the whole page" text="Render any parsed object, YAML string, or JSON string inside your app." href="/docs/react-renderer" />
            <Way eyebrow="Docusaurus" title="Publish beside your guides" text="Generate reference routes at build time, or embed a spec directly in MDX." href="/docs/docusaurus" />
            <Way eyebrow="Studio" title="Inspect before you ship" text="Open, paste, or fetch a spec and see the finished reference immediately." href="/api" />
          </div>
        </section>

        <section className="home-cta">
          <span className="home-kicker"><i />Your API, less noisy</span>
          <h2>Give the contract some air.</h2>
          <div className="home-actions">
            <Link className="home-button home-button-primary" to="/docs/getting-started">Read the docs <span>→</span></Link>
            <a className="home-button home-button-secondary" href="https://github.com/mcclowes/speccy">View on GitHub</a>
          </div>
        </section>
      </main>
    </Layout>
  );
}

function Feature({ number, title, text }: { number: string; title: string; text: string }) {
  return <article className="home-feature"><span>{number}</span><div className="home-feature-mark" /><h3>{title}</h3><p>{text}</p></article>;
}

function Way({ eyebrow, title, text, href }: { eyebrow: string; title: string; text: string; href: string }) {
  return <Link className="home-way" to={href}><span>{eyebrow}</span><h3>{title}</h3><p>{text}</p><b>Explore <i>→</i></b></Link>;
}

function ReferencePreview() {
  return (
    <div className="preview-shell" aria-label="Speccy API reference preview">
      <aside className="preview-sidebar">
        <div className="preview-brand">
          <span><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3.5 9.5 5 7.75M20.5 9.5 19 7.75M9.5 11.5h5" /><circle cx="6.5" cy="13" r="3.5" /><circle cx="17.5" cy="13" r="3.5" /></svg></span>
          Speccy Books
        </div>
        <small>Resources</small>
        <div className="preview-tag is-active"><span>▱</span>Books <i>⌄</i></div>
        <div className="preview-link is-active">List books <b>GET</b></div>
        <div className="preview-link">Add a book <b>POST</b></div>
        <div className="preview-tag"><span>≡</span>Reading lists <i>›</i></div>
      </aside>
      <div className="preview-content">
        <span className="preview-eyebrow">Books</span>
        <h2>List books</h2>
        <div className="preview-path"><b>GET</b><code>/books</code></div>
        <p>Returns the books currently available in the catalog.</p>
        <h3>Parameters</h3>
        <div className="preview-parameter"><code>limit</code><span>integer</span><small>Maximum books to return</small></div>
        <div className="preview-response"><span>Responses</span><b>200</b><i /></div>
      </div>
    </div>
  );
}
