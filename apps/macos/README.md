# Speccy for macOS

The macOS app wraps the standalone Speccy studio in a native SwiftUI window. The web bundle is stored inside the application, so viewing local OpenAPI files doesn't require a server or an internet connection.

From the repository root:

```sh
npm run build:mac
open apps/macos/Speccy.app
```

The build script compiles the shared renderer and web studio, copies their production assets into the Swift package, runs the Swift tests, and creates `Speccy.app`.

Use File → Open OpenAPI document, or press Command-O, to open `.yaml`, `.yml`, or `.json` files. Opening a single file loads only that file; to make relative `$ref` links to sibling documents work, open a folder instead and choose its entry OpenAPI document. Command-R reloads the reference, and Command-P prints it.

On launch, the app scans Git repositories under `~/Development`, up to three folders deep, and lists repositories containing OpenAPI JSON or YAML documents on the home screen. Dependency and build folders are skipped.
