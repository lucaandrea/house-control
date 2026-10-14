import AppKit

/// A resizable map window for inspecting long, multi-storey homes in detail.
final class MapController: NSObject, NSWindowDelegate {
    let host: WebHost
    private let window: NSWindow
    var onClose: (() -> Void)?
    var isVisible: Bool { window.isVisible && !window.isMiniaturized }

    init(host: WebHost) {
        self.host = host
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1180, height: 860),
                          styleMask: [.titled, .closable, .miniaturizable, .resizable],
                          backing: .buffered, defer: false)
        super.init()
        window.title = "House Control — Home Map"
        window.backgroundColor = NSColor(calibratedRed: 0.04, green: 0.055, blue: 0.1, alpha: 1)
        window.appearance = NSAppearance(named: .darkAqua)
        window.minSize = NSSize(width: 760, height: 560)
        window.isReleasedWhenClosed = false
        window.delegate = self
        window.contentView = host.webView
        window.center()
        window.setFrameAutosaveName("HouseControlMap")
    }

    func show() {
        NSApp.activate(ignoringOtherApps: true)
        window.makeKeyAndOrderFront(nil)
        host.call("shown")
    }

    func close() { window.performClose(nil) }

    func windowWillMiniaturize(_ notification: Notification) { host.call("hidden") }
    func windowDidDeminiaturize(_ notification: Notification) { host.call("shown") }
    func windowWillClose(_ notification: Notification) {
        host.call("hidden")
        onClose?()
    }
}
