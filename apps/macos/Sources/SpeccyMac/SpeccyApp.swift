/**
 ---
 purpose: Declares the macOS app scene, its menu commands, and the notification names those commands post.
 related:
   - ./ContentView.swift - Observes these notifications and drives the embedded web view.
   - ../../scripts/build-app.sh - Bundles the web build and packages this app.
 ---
 */

import SwiftUI

@main
struct SpeccyApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .frame(minWidth: 920, minHeight: 640)
        }
        .defaultSize(width: 1360, height: 880)
        .commands {
            CommandGroup(replacing: .newItem) {
                Button("Open OpenAPI document…") {
                    NotificationCenter.default.post(name: .speccyOpenDocument, object: nil)
                }
                .keyboardShortcut("o")
            }
            CommandGroup(after: .toolbar) {
                Button("Reload reference") {
                    NotificationCenter.default.post(name: .speccyReload, object: nil)
                }
                .keyboardShortcut("r")
                Button("Print reference…") {
                    NotificationCenter.default.post(name: .speccyPrint, object: nil)
                }
                .keyboardShortcut("p")
            }
        }
    }
}

extension Notification.Name {
    static let speccyOpenDocument = Notification.Name("speccy.openDocument")
    static let speccyReload = Notification.Name("speccy.reload")
    static let speccyPrint = Notification.Name("speccy.print")
}
