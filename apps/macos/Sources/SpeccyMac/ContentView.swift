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
            guard let directory = Bundle.module.url(forResource: "Web", withExtension: nil),
                  let index = Bundle.module.url(forResource: "index", withExtension: "html", subdirectory: "Web") else {
                loadMissingBundlePage()
                return
            }
            webView?.loadFileURL(index, allowingReadAccessTo: directory)
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
