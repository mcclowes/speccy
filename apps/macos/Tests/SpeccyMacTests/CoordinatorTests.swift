import Foundation
import Testing
@testable import SpeccyMac

@Suite("JavaScript bridge")
struct CoordinatorTests {
    @Test("finds Git repositories containing OpenAPI documents")
    func scansRepositories() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        let apiRepo = root.appendingPathComponent("catalog", isDirectory: true)
        let ordinaryRepo = root.appendingPathComponent("website", isDirectory: true)
        try FileManager.default.createDirectory(at: apiRepo.appendingPathComponent(".git"), withIntermediateDirectories: true)
        try FileManager.default.createDirectory(at: ordinaryRepo.appendingPathComponent(".git"), withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        try "openapi: 3.1.0".write(to: apiRepo.appendingPathComponent("openapi.yml"), atomically: true, encoding: .utf8)
        try "{\"name\":\"site\"}".write(to: ordinaryRepo.appendingPathComponent("package.json"), atomically: true, encoding: .utf8)

        let repositories = RepositoryScan.scan(roots: [root.path])

        #expect(repositories == [DiscoveredRepository(name: "catalog", path: apiRepo.path, documentCount: 1)])
    }

    @Test("skips dependency folders while inspecting a repository")
    func skipsDependencies() throws {
        let repo = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        let dependency = repo.appendingPathComponent("node_modules/package", isDirectory: true)
        try FileManager.default.createDirectory(at: dependency, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: repo) }
        try "openapi: 3.1.0".write(to: dependency.appendingPathComponent("api.yaml"), atomically: true, encoding: .utf8)

        #expect(RepositoryScan.openAPIDocuments(in: repo).isEmpty)
    }

    @Test("encodes source safely for JavaScript")
    @MainActor
    func encodesSource() throws {
        let encoded = try SpeccyWebView.Coordinator.javascriptString("title: \"Hello\"\n")
        #expect(encoded == "\"title: \\\"Hello\\\"\\n\"")
    }

    @Test("loads a fragmented document folder")
    @MainActor
    func loadsFragments() throws {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString, isDirectory: true)
        let nested = directory.appendingPathComponent("reference", isDirectory: true)
        try FileManager.default.createDirectory(at: nested, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        try "openapi: 3.1.0".write(to: nested.appendingPathComponent("api.yml"), atomically: true, encoding: .utf8)
        try "components: {}".write(to: nested.appendingPathComponent("common.yaml"), atomically: true, encoding: .utf8)
        try "ignored".write(to: nested.appendingPathComponent("notes.txt"), atomically: true, encoding: .utf8)

        let bundle = try SpeccyWebView.Coordinator.loadFragments(from: directory)

        #expect(bundle.sources.keys.sorted() == ["reference/api.yml", "reference/common.yaml"])
        #expect(bundle.sources["reference/api.yml"] == "openapi: 3.1.0")
    }

    @Test("uses an opened file as the fragment entrypoint")
    @MainActor
    func choosesFileEntrypoint() throws {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let entrypoint = directory.appendingPathComponent("api.json")
        try "{}".write(to: entrypoint, atomically: true, encoding: .utf8)
        try "openapi: 3.1.0".write(
            to: directory.appendingPathComponent("unrelated.yaml"),
            atomically: true,
            encoding: .utf8
        )

        let bundle = try SpeccyWebView.Coordinator.loadFragments(from: entrypoint)

        #expect(bundle.entrypoint == "api.json")
        #expect(bundle.sources == ["api.json": "{}"])
    }

    @Test("resolves bundled web resources without allowing traversal")
    @MainActor
    func resolvesResources() throws {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let index = directory.appendingPathComponent("index.html")
        try Data().write(to: index)

        #expect(WebResourceHandler.resourceURL(
            for: URL(string: "speccy://app/index.html")!,
            in: directory
        ) == index.standardizedFileURL)
        #expect(WebResourceHandler.resourceURL(
            for: URL(string: "speccy://app/../secret.txt")!,
            in: directory
        ) == nil)
    }

    @Test("uses browser-compatible MIME types")
    @MainActor
    func assignsMimeTypes() {
        #expect(WebResourceHandler.mimeType(for: URL(fileURLWithPath: "app.js")) == "text/javascript")
        #expect(WebResourceHandler.mimeType(for: URL(fileURLWithPath: "styles.css")) == "text/css")
    }
}
