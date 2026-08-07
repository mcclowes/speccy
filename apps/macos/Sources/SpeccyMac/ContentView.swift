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

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.setValue(false, forKey: "drawsBackground")
        context.coordinator.attach(webView)
        context.coordinator.loadApp()
        return webView
    }

    func updateNSView(_ webView: WKWebView, context: Context) {}

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate {
        private weak var webView: WKWebView?
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

        func openDocument() {
            let panel = NSOpenPanel()
            panel.title = "Open an OpenAPI document"
            panel.prompt = "Open"
            panel.allowsMultipleSelection = false
            panel.allowedContentTypes = Self.supportedTypes
            guard panel.runModal() == .OK, let url = panel.url else { return }

            do {
                let source = try String(contentsOf: url, encoding: .utf8)
                let sourceJSON = try Self.javascriptString(source)
                let nameJSON = try Self.javascriptString(url.lastPathComponent)
                webView?.evaluateJavaScript("window.speccyLoadSpec?.(\(sourceJSON), \(nameJSON))")
            } catch {
                showError(error)
            }
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

        static func javascriptString(_ value: String) throws -> String {
            let data = try JSONEncoder().encode(value)
            guard let encoded = String(data: data, encoding: .utf8) else {
                throw CocoaError(.fileReadInapplicableStringEncoding)
            }
            return encoded
        }

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
