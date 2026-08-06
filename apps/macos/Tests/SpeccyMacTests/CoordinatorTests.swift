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
}
