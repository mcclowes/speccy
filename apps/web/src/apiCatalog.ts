/**
 * ---
 * purpose: Defines the curated public API specifications offered on the studio home screen.
 * related:
 *   - ./App.tsx - Renders the catalog and opens its specifications.
 * ---
 */

export interface CatalogApi {
  name: string;
  description: string;
  sourceUrl: string;
  color: string;
}

export const API_CATALOG: CatalogApi[] = [
  {
    name: 'Stripe',
    description: 'Payments, billing, subscriptions, and connected accounts.',
    sourceUrl:
      'https://raw.githubusercontent.com/stripe/openapi/master/latest/openapi.spec3.json',
    color: '#635bff',
  },
  {
    name: 'GitHub',
    description:
      'Repositories, pull requests, Actions, users, and organizations.',
    sourceUrl:
      'https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.yaml',
    color: '#24292f',
  },
  {
    name: 'DigitalOcean',
    description: 'Compute, storage, networking, databases, and Kubernetes.',
    sourceUrl:
      'https://raw.githubusercontent.com/digitalocean/openapi/main/specification/DigitalOcean-public.v2.yaml',
    color: '#0080ff',
  },
  {
    name: 'Cloudflare',
    description: 'Zones, DNS, security, Workers, and account management.',
    sourceUrl:
      'https://raw.githubusercontent.com/cloudflare/api-schemas/main/openapi.json',
    color: '#f48120',
  },
];
