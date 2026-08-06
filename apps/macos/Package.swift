// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "SpeccyMac",
    platforms: [.macOS(.v14)],
    products: [
        .executable(name: "Speccy", targets: ["SpeccyMac"]),
    ],
    targets: [
        .executableTarget(
            name: "SpeccyMac",
            path: "Sources/SpeccyMac",
            resources: [.copy("Resources/Web")]
        ),
        .testTarget(name: "SpeccyMacTests", dependencies: ["SpeccyMac"]),
    ]
)

