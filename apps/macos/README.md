# Speccy for macOS

The macOS app wraps the standalone Speccy studio in a native SwiftUI window. The web bundle is stored inside the application, so viewing local OpenAPI files doesn't require a server or an internet connection.

From the repository root:

```sh
npm run build:mac
```

The build script compiles the shared renderer and web studio, copies their production assets into the Swift package, runs the Swift tests, and creates and opens `Speccy.app`. Reopen a built app any time with `open apps/macos/Speccy.app`.

Use File → Open OpenAPI document, or press Command-O, to open `.yaml`, `.yml`, or `.json` files. Opening a single file loads only that file; to make relative `$ref` links to sibling documents work, open a folder instead. When the folder holds more than one candidate document, the app asks which one is the entry point. Command-R reloads the reference, and Command-P prints it.

Whenever the studio finishes loading, at launch and after each reload, the app scans Git repositories under `~/Development`, up to three folders deep, and lists repositories containing OpenAPI JSON or YAML documents on the home screen. Dependency and build folders are skipped.
