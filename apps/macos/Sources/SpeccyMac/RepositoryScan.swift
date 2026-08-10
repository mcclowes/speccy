/**
 ---
 purpose: Finds nearby Git repositories containing OpenAPI entry documents without indexing the whole Mac.
 related:
   - ./ContentView.swift - Publishes scan results to the web studio and opens a selected repository.
 ---
 */

import Foundation

struct DiscoveredRepository: Codable, Equatable, Sendable {
    let name: String
    let path: String
    let documentCount: Int
}

enum RepositoryScan {
    static let defaultRoots = ["~/Development"]
    static let skippedDirectoryNames: Set<String> = [
        ".build", ".next", ".swiftpm", "DerivedData", "Library", "Pods",
        "build", "coverage", "dist", "node_modules", "target", "vendor",
    ]

    nonisolated static func scan(roots: [String] = defaultRoots, maxDepth: Int = 3) -> [DiscoveredRepository] {
        var repositories: [DiscoveredRepository] = []
        for root in roots {
            let path = (root as NSString).expandingTildeInPath
            findRepositories(at: URL(fileURLWithPath: path), depth: 0, maxDepth: maxDepth, into: &repositories)
        }
        return repositories.sorted {
            $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
        }
    }

    nonisolated static func openAPIDocuments(in repository: URL) -> [URL] {
        let keys: [URLResourceKey] = [.isDirectoryKey, .isRegularFileKey, .isHiddenKey]
        guard let enumerator = FileManager.default.enumerator(
            at: repository,
            includingPropertiesForKeys: keys,
            options: [.skipsHiddenFiles, .skipsPackageDescendants],
            errorHandler: { _, _ in true }
        ) else { return [] }

        var documents: [URL] = []
        for case let url as URL in enumerator {
            if let values = try? url.resourceValues(forKeys: Set(keys)), values.isDirectory == true {
                if skippedDirectoryNames.contains(url.lastPathComponent) {
                    enumerator.skipDescendants()
                }
                continue
            }
            guard supportedExtensions.contains(url.pathExtension.lowercased()),
                  let data = try? Data(contentsOf: url, options: .mappedIfSafe),
                  data.count <= 10_000_000,
                  let prefix = String(data: data.prefix(16_384), encoding: .utf8),
                  isOpenAPIDocument(prefix)
            else { continue }
            documents.append(url)
        }
        return documents.sorted { $0.path < $1.path }
    }

    nonisolated static func isOpenAPIDocument(_ source: String) -> Bool {
        let prefix = source.prefix(16_384)
        return prefix.range(of: #"(?m)^\s*(openapi|swagger)\s*:"#, options: .regularExpression) != nil
            || prefix.range(of: #"\"(openapi|swagger)\"\s*:"#, options: .regularExpression) != nil
    }

    private nonisolated static func findRepositories(
        at directory: URL,
        depth: Int,
        maxDepth: Int,
        into repositories: inout [DiscoveredRepository]
    ) {
        let fileManager = FileManager.default
        if fileManager.fileExists(atPath: directory.appendingPathComponent(".git").path) {
            let documents = openAPIDocuments(in: directory)
            if !documents.isEmpty {
                repositories.append(DiscoveredRepository(
                    name: directory.lastPathComponent,
                    path: directory.standardizedFileURL.path,
                    documentCount: documents.count
                ))
            }
            return
        }
        guard depth < maxDepth,
              let children = try? fileManager.contentsOfDirectory(
                at: directory,
                includingPropertiesForKeys: [.isDirectoryKey],
                options: [.skipsHiddenFiles]
              )
        else { return }
        for child in children {
            guard (try? child.resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory == true,
                  !skippedDirectoryNames.contains(child.lastPathComponent)
            else { continue }
            findRepositories(at: child, depth: depth + 1, maxDepth: maxDepth, into: &repositories)
        }
    }

    private static let supportedExtensions = Set(["json", "yaml", "yml"])
}
