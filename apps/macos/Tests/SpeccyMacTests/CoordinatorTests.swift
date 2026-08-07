import Foundation
import Testing
@testable import SpeccyMac

@Suite("JavaScript bridge")
struct CoordinatorTests {
    @Test("encodes source safely for JavaScript")
    @MainActor
    func encodesSource() throws {
        let encoded = try SpeccyWebView.Coordinator.javascriptString("title: \"Hello\"\n")
        #expect(encoded == "\"title: \\\"Hello\\\"\\n\"")
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
