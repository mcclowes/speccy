import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

export default function Home() {
  return (
    <Layout title="Speccy demo" description="A Docusaurus demo for Speccy">
      <main className="demo-home">
        <span>Speccy for Docusaurus</span>
        <h1>API docs with room to breathe.</h1>
        <p>This site loads a local OpenAPI document at build time and renders it with the same component as the standalone app.</p>
        <Link className="button button--primary" to="/api">Open the API reference</Link>
      </main>
    </Layout>
  );
}

