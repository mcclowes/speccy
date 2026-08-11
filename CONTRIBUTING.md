# Contributing to Speccy

Thanks for helping improve Speccy.

## Set up the repository

Install Node.js 22 or newer, clone the repository, and install the locked dependencies:

```sh
npm ci
```

Run the web studio during development:

```sh
npm run dev
```

The [README](README.md) describes the packages, apps, Storybook workflow, visual tests, and native macOS build.

## Make a change

Keep changes focused, and add or update tests alongside the code they cover. Run the full repository check before opening a pull request:

```sh
npm run check
```

For deliberate renderer changes, inspect the Storybook visual diff before updating a baseline:

```sh
npx playwright install chromium
npm run test:visual
```

Run `npm run build:mac` separately when changing the macOS app or its packaged web resources.

## Document package changes

Run `npm run changeset` for changes that affect a published package's consumers. Choose the smallest correct SemVer bump, and describe the change from the consumer's point of view.

Don't add a changeset for private apps, tests, documentation-only changes, or internal refactors that don't change package behavior. The [release checklist](docs/releases.md) explains the rest of the publication process.

## Open a pull request

Explain the problem and the chosen fix. Include tests, screenshots, or reproduction steps where they help a reviewer verify the change. Link any related issues, and call out follow-up work that isn't part of the pull request.

By contributing, you agree that your contribution is licensed under the repository's [MIT License](LICENSE).
