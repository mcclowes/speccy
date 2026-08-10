---
title: Configuration
description: Configure Speccy's appearance, navigation, and error handling.
---

# Configuration

Pass these options to the React `Speccy` component or to the Docusaurus `OpenAPI` component. Generated Docusaurus routes accept them beneath `renderer`.

| Option                       | Type                         | Default     | Purpose                                                   |
| ---------------------------- | ---------------------------- | ----------- | --------------------------------------------------------- |
| `spec`                       | object or string             | required    | Parsed OpenAPI data, YAML, or JSON                        |
| `basePath`                   | string                       | `/`         | URL prefix for operation, tag, and reference pages        |
| `theme`                      | `light`, `dark`, or `system` | `system`    | Renderer color theme                                      |
| `accentColor`                | string                       | `#6d5dfc`   | Accent color used for focus and active states             |
| `showSidebar`                | boolean                      | `true`      | Show the navigation and filter sidebar                    |
| `singleExpandedSidebarGroup` | boolean                      | `false`     | Close the previous sidebar group when another group opens |
| `defaultExpanded`            | boolean                      | `false`     | Open operation groups on first render                     |
| `logo`                       | React node                   | Speccy mark | Brand mark beside the API title                           |
| `className`                  | string                       | empty       | Extra class on the renderer root                          |
| `onError`                    | function                     | none        | Receive parsing and model errors                          |

## Theme

`system` follows the visitor’s operating-system preference. The renderer scopes its theme variables, so it can sit inside a Docusaurus page without changing the surrounding site.

```tsx
<Speccy spec={spec} theme="dark" accentColor="#ff735d" />
```

## Embedded references

Hide the sidebar when the surrounding application already supplies navigation:

```tsx
<Speccy spec={spec} showSidebar={false} />
```

Search and stable endpoint pages are part of the sidebar experience. For a complete reference, keep the sidebar enabled and mount Speccy on its own route.
