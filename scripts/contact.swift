// Tiles PNGs into one contact sheet: swift scripts/contact.swift <dir> <out.png> [cols]
import AppKit

let args = CommandLine.arguments
let dir = URL(fileURLWithPath: args[1])
let out = URL(fileURLWithPath: args[2])
let cols = args.count > 3 ? Int(args[3])! : 6
let files = try FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)
  .filter { $0.pathExtension == "png" }.sorted { $0.lastPathComponent < $1.lastPathComponent }
let imgs = files.compactMap { NSImage(contentsOf: $0) }
guard let first = imgs.first else { exit(1) }
let w = first.size.width, h = first.size.height, pad: CGFloat = 8
let rows = (imgs.count + cols - 1) / cols
let size = NSSize(width: CGFloat(cols) * (w + pad) + pad, height: CGFloat(rows) * (h + pad) + pad)
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(size.width), pixelsHigh: Int(size.height), bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
NSColor.black.setFill()
NSRect(origin: .zero, size: size).fill()
for (i, img) in imgs.enumerated() {
  let c = i % cols, r = i / cols
  let x = pad + CGFloat(c) * (w + pad)
  let y = size.height - CGFloat(r + 1) * (h + pad)
  img.draw(in: NSRect(x: x, y: y, width: w, height: h))
  let label = NSAttributedString(string: "\(i + 1)", attributes: [.font: NSFont.boldSystemFont(ofSize: 28), .foregroundColor: NSColor.yellow, .strokeColor: NSColor.black, .strokeWidth: -4])
  label.draw(at: NSPoint(x: x + 8, y: y + h - 38))
}
NSGraphicsContext.restoreGraphicsState()
try rep.representation(using: .png, properties: [:])!.write(to: out)
