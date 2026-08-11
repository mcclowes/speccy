# API reference

This is a standalone [Speccy](https://github.com/mcclowes/speccy) API reference.

```sh
npm install
npm run dev
```

Configure the site in `speccy.config.ts`. `spec` points to a local YAML or JSON document. To fetch a remote document instead, add `specUrl`; it is fetched during every dev and production build, and `spec` is ignored while it is set.

`npm run build` writes a static site to `dist`. Configure your host to serve `index.html` for unknown paths so direct links to operations work. Example configuration is included for Netlify and Vercel.
