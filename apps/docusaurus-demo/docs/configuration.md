---
title: Configuration
description: Configure Speccy's appearance, navigation, and error handling.
---

# Configuration

Pass these options to the React `Speccy` component or to the Docusaurus `OpenAPI` component. Generated Docusaurus routes accept them beneath `renderer`.

| Option                       | Type                                    | Default   | Purpose                                                         |
| ---------------------------- | --------------------------------------- | --------- | --------------------------------------------------------------- |
| `spec`                       | object or string                        | required  | Parsed OpenAPI data, YAML, or JSON                              |
| `basePath`                   | string                                  | `/`       | URL prefix for operation, tag, and reference pages              |
| `theme`                      | `light`, `dark`, `system`, or `inherit` | `system`  | Renderer color theme; `inherit` follows the host page           |
| `accentColor`                | string                                  | `#6d5dfc` | Accent color used for focus and active states                   |
| `showSidebar`                | boolean                                 | `true`    | Show the navigation and filter sidebar                          |
| `singleExpandedSidebarGroup` | boolean                                 | `false`   | Close the previous sidebar group when another group opens       |
| `showThemeToggle`            | boolean                                 | `true`    | Show the persistent light/dark theme control                    |
| `tryIt`                      | boolean                                 | `true`    | Show the request builder and its generated request samples      |
| `parameterPrototype`         | boolean                                 | `true`    | Separate required parameters from optional ones added on demand |
| `showDeveloperHints`         | boolean                                 | `false`   | Show authoring guidance and the API health drawer               |
| `previousSpec`               | object or string                        | none      | Earlier document used to surface potentially breaking changes   |
| `spectralDiagnostics`        | array                                   | none      | Spectral results shown alongside Speccy's built-in guidance     |
| `logo`                       | React node                              | none      | Brand mark beside the API title                                 |
| `className`                  | string                                  | empty     | Extra class on the renderer root                                |
| `onError`                    | function                                | none      | Receive parsing and model errors                                |

Hosts that own routing can also pass `route`, `onNavigate`, and `hrefForRoute` to control navigation instead of letting Speccy write to browser history.

The Docusaurus `OpenAPI` component ships embedding defaults that differ from this table: `showSidebar` and `showThemeToggle` are `false`, and `theme` is `inherit` so the reference follows the site's color mode.

## Theme

`system` follows the visitor’s operating-system preference; `inherit` follows the surrounding page's theme instead. The renderer scopes its theme variables, so it can sit inside a Docusaurus page without changing the surrounding site.

```tsx
<Speccy spec={spec} theme="dark" accentColor="#ff735d" />
```

## Embedded references

Hide the sidebar when the surrounding application already supplies navigation:

```tsx
<Speccy spec={spec} showSidebar={false} />
```

Search and stable endpoint pages are part of the sidebar experience. For a complete reference, keep the sidebar enabled and mount Speccy on its own route.
