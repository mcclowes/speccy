# Create a Speccy reference

Create a standalone, statically deployable API reference:

```sh
npx github:mcclowes/create-speccy-reference my-api-reference
cd my-api-reference
npm install
npm run dev
```

Edit `speccy.config.ts` to choose a local OpenAPI document or a URL fetched at build time. Run `npm run build` to produce static files in `dist`.
