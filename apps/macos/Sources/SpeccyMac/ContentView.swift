/**
 ---
 purpose: Hosts the offline Speccy web bundle and connects native macOS document commands to it.
 related:
   - ./SpeccyApp.swift - Defines the window and application menu commands.
   - ../../../../web/src/App.tsx - Exposes the JavaScript bridge used to open native files.
 ---
 */

import AppKit
import SwiftUI
import UniformTypeIdentifiers
import WebKit

struct ContentView: View {
    var body: some View {
        SpeccyWebView()
            .ignoresSafeArea()
            .background(Color(nsColor: .windowBackgroundColor))
    }
}

struct SpeccyWebView: NSViewRepresentable {
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeNSView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.preferences.setValue(true, forKey: "developerExtrasEnabled")
        configuration.setURLSchemeHandler(context.coordinator.resourceHandler, forURLScheme: WebResourceHandler.appScheme)
        configuration.userContentController.add(context.coordinator, name: Coordinator.openRepositoryMessage)

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.setValue(false, forKey: "drawsBackground")
        context.coordinator.attach(webView)
        context.coordinator.loadApp()
        return webView
    }

    func updateNSView(_ webView: WKWebView, context: Context) {}

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        static let openRepositoryMessage = "speccyOpenRepository"
        private weak var webView: WKWebView?
        private var discoveredRepositories: [String: DiscoveredRepository] = [:]
        let resourceHandler = WebResourceHandler(
            directory: Bundle.module.url(forResource: "Web", withExtension: nil)
        )
        nonisolated(unsafe) private var observers: [NSObjectProtocol] = []

        func attach(_ webView: WKWebView) {
            self.webView = webView
            let center = NotificationCenter.default
            observers = [
                center.addObserver(forName: .speccyOpenDocument, object: nil, queue: .main) { [weak self] _ in
                    Task { @MainActor in self?.openDocument() }
                },
                center.addObserver(forName: .speccyReload, object: nil, queue: .main) { [weak self] _ in
                    Task { @MainActor in self?.webView?.reload() }
                },
                center.addObserver(forName: .speccyPrint, object: nil, queue: .main) { [weak self] _ in
                    Task { @MainActor in self?.printReference() }
                },
            ]
        }

        func loadApp() {
            guard resourceHandler.isAvailable else {
                loadMissingBundlePage()
                return
            }
            webView?.load(URLRequest(url: URL(string: "\(WebResourceHandler.appScheme)://app/index.html")!))
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            Task { await discoverRepositories() }
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.name == Self.openRepositoryMessage,
                  let path = message.body as? String,
                  let repository = discoveredRepositories[path]
            else { return }
            openRepository(at: URL(fileURLWithPath: repository.path))
        }

        func discoverRepositories(roots: [String] = RepositoryScan.defaultRoots) async {
            let repositories = await Task.detached(priority: .utility) {
                RepositoryScan.scan(roots: roots)
            }.value
            discoveredRepositories = Dictionary(uniqueKeysWithValues: repositories.map { ($0.path, $0) })
            guard let webView else { return }
            do {
                _ = try await webView.callAsyncJavaScript(
                    "window.speccyDiscoveredRepositories = repositories; window.speccySetDiscoveredRepositories?.(repositories)",
                    arguments: ["repositories": repositories],
                    contentWorld: .page
                )
            } catch {
                // Discovery is optional; opening files manually remains available.
            }
        }

        func openDocument() {
            let panel = NSOpenPanel()
            panel.title = "Open an OpenAPI document or folder"
            panel.prompt = "Open"
            panel.allowsMultipleSelection = false
            panel.canChooseDirectories = true
            panel.canChooseFiles = true
            panel.allowedContentTypes = Self.supportedTypes
            guard panel.runModal() == .OK, let url = panel.url else { return }

            do {
                let bundle = try Self.loadFragments(from: url)
                let entrypoint = bundle.selectedDirectory ? try chooseEntrypoint(from: bundle.sources) : bundle.entrypoint
                guard let entrypoint else { return }
                guard let webView else { return }
                Task { [weak self, weak webView] in
                    guard let self, let webView else { return }
                    do {
                        try await Self.load(bundle.sources, entrypoint: entrypoint, into: webView)
                    } catch {
                        showError(error)
                    }
                }
            } catch {
                showError(error)
            }
        }

        private func openRepository(at url: URL) {
            do {
                let bundle = try Self.loadFragments(from: url)
                let documentPaths = Set(RepositoryScan.openAPIDocuments(in: url).map { documentURL in
                    String(documentURL.resolvingSymlinksInPath().path.dropFirst(url.resolvingSymlinksInPath().path.count))
                        .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
                })
                let candidates = bundle.sources.keys.filter(documentPaths.contains).sorted()
                let entrypoint = try chooseEntrypoint(from: bundle.sources, candidates: candidates)
                guard let entrypoint, let webView else { return }
                Task { [weak self, weak webView] in
                    guard let self, let webView else { return }
                    do {
                        try await Self.load(bundle.sources, entrypoint: entrypoint, into: webView)
                    } catch {
                        showError(error)
                    }
                }
            } catch {
                showError(error)
            }
        }

        static func load(_ sources: [String: String], entrypoint: String, into webView: WKWebView) async throws {
            _ = try await webView.callAsyncJavaScript(
                "window.speccyLoadSpecBundle?.(sources, entrypoint)",
                arguments: ["sources": sources, "entrypoint": entrypoint],
                contentWorld: .page
            )
        }

        private func chooseEntrypoint(from sources: [String: String], candidates suppliedCandidates: [String]? = nil) throws -> String? {
            let paths = sources.keys.sorted()
            let detectedCandidates = paths.filter { path in
                guard let source = sources[path] else { return false }
                return RepositoryScan.isOpenAPIDocument(source)
            }
            let candidates = suppliedCandidates ?? detectedCandidates
            let choices = candidates.isEmpty ? paths : candidates
            guard !choices.isEmpty else { throw FragmentError.noDocuments }
            if choices.count == 1 { return choices[0] }

            let picker = NSPopUpButton(frame: NSRect(x: 0, y: 0, width: 360, height: 26))
            picker.addItems(withTitles: choices)
            let alert = NSAlert()
            alert.messageText = "Choose the entry OpenAPI document"
            alert.informativeText = "Speccy will resolve references to other YAML and JSON files in this folder."
            alert.accessoryView = picker
            alert.addButton(withTitle: "Open")
            alert.addButton(withTitle: "Cancel")
            return alert.runModal() == .alertFirstButtonReturn ? choices[picker.indexOfSelectedItem] : nil
        }

        func printReference() {
            guard let webView else { return }
            let printInfo = NSPrintInfo.shared
            printInfo.horizontalPagination = .fit
            printInfo.verticalPagination = .automatic
            NSPrintOperation(view: webView, printInfo: printInfo).run()
        }

        private func loadMissingBundlePage() {
            let html = """
            <style>body{font:15px system-ui;padding:12vh 15%;color:#333}code{background:#eee;padding:3px 6px;border-radius:5px}</style>
            <h1>Web bundle missing</h1><p>Run <code>npm run build:mac</code> from the repository root to build Speccy for macOS.</p>
            """
            webView?.loadHTMLString(html, baseURL: nil)
        }

        private func showError(_ error: Error) {
            let alert = NSAlert(error: error)
            alert.messageText = "Couldn’t open this OpenAPI document"
            alert.runModal()
        }

        static var supportedTypes: [UTType] {
            [UTType.json, UTType.yaml, UTType(filenameExtension: "yml")].compactMap { $0 }
        }

        static func javascriptValue<T: Encodable>(_ value: T) throws -> String {
            let data = try JSONEncoder().encode(value)
            guard let encoded = String(data: data, encoding: .utf8) else {
                throw CocoaError(.fileReadInapplicableStringEncoding)
            }
            return encoded
        }

        static func javascriptString(_ value: String) throws -> String {
            try javascriptValue(value)
        }

        struct FragmentBundle: Equatable {
            let sources: [String: String]
            let entrypoint: String
            let selectedDirectory: Bool
        }

        enum FragmentError: LocalizedError {
            case noDocuments

            var errorDescription: String? {
                "This folder doesn't contain any YAML or JSON documents."
            }
        }

        static func loadFragments(from selectedURL: URL) throws -> FragmentBundle {
            let selectedDirectory = try selectedURL.resourceValues(forKeys: [.isDirectoryKey]).isDirectory == true
            let root = (selectedDirectory ? selectedURL : selectedURL.deletingLastPathComponent())
                .resolvingSymlinksInPath()
            let keys: [URLResourceKey] = [.isRegularFileKey, .isDirectoryKey, .isHiddenKey]
            guard let enumerator = FileManager.default.enumerator(
                at: root,
                includingPropertiesForKeys: keys,
                options: [.skipsHiddenFiles, .skipsPackageDescendants]
            ) else { throw FragmentError.noDocuments }

            var sources: [String: String] = [:]
            for case let fileURL as URL in enumerator {
                let values = try fileURL.resourceValues(forKeys: Set(keys))
                guard values.isRegularFile == true, supportedExtensions.contains(fileURL.pathExtension.lowercased()) else { continue }
                let resolvedFileURL = fileURL.resolvingSymlinksInPath()
                let relativePath = String(resolvedFileURL.path.dropFirst(root.path.count)).trimmingCharacters(in: CharacterSet(charactersIn: "/"))
                sources[relativePath] = try String(contentsOf: resolvedFileURL, encoding: .utf8)
            }
            guard !sources.isEmpty else { throw FragmentError.noDocuments }
            let entrypoint = selectedDirectory
                ? sources.keys.sorted().first!
                : selectedURL.lastPathComponent
            return FragmentBundle(sources: sources, entrypoint: entrypoint, selectedDirectory: selectedDirectory)
        }

        private static let supportedExtensions = Set(["yaml", "yml", "json"])

        deinit {
            observers.forEach(NotificationCenter.default.removeObserver)
        }
    }
}

final class WebResourceHandler: NSObject, WKURLSchemeHandler {
    static let appScheme = "speccy"

    private let directory: URL?
    var isAvailable: Bool { directory != nil }

    init(directory: URL?) {
        self.directory = directory
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: any WKURLSchemeTask) {
        guard let requestURL = urlSchemeTask.request.url,
              let directory,
              let resourceURL = Self.resourceURL(for: requestURL, in: directory) else {
            urlSchemeTask.didFailWithError(URLError(.fileDoesNotExist))
            return
        }

        do {
            let data = try Data(contentsOf: resourceURL)
            let response = URLResponse(
                url: requestURL,
                mimeType: Self.mimeType(for: resourceURL),
                expectedContentLength: data.count,
                textEncodingName: nil
            )
            urlSchemeTask.didReceive(response)
            urlSchemeTask.didReceive(data)
            urlSchemeTask.didFinish()
        } catch {
            urlSchemeTask.didFailWithError(error)
        }
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: any WKURLSchemeTask) {}

    static func resourceURL(for requestURL: URL, in directory: URL) -> URL? {
        guard requestURL.scheme == appScheme, requestURL.host == "app" else { return nil }
        let relativePath = String(requestURL.path.drop(while: { $0 == "/" }))
        let root = directory.standardizedFileURL
        let candidate = root.appendingPathComponent(relativePath).standardizedFileURL
        guard candidate.path.hasPrefix(root.path + "/"), FileManager.default.fileExists(atPath: candidate.path) else {
            return nil
        }
        return candidate
    }

    static func mimeType(for url: URL) -> String {
        switch url.pathExtension.lowercased() {
        case "html": "text/html"
        case "css": "text/css"
        case "js": "text/javascript"
        case "json", "map": "application/json"
        case "svg": "image/svg+xml"
        case "png": "image/png"
        default: "application/octet-stream"
        }
    }
}
