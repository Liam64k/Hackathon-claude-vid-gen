// Draws Studio's app icon (1024×1024 PNG): a violet rounded square, a white play button and a strip of
// storyboard frames, in Studio's colours (#5a4fd6 primary, #9d96f9 light). Used by build-mac-app.sh.
//   swift scripts/mac-app/make-icon.swift <out.png>
import AppKit

let out = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "icon.png"
let size: CGFloat = 1024
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(size), pixelsHigh: Int(size), bitsPerSample: 8,
                           samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
let c = NSGraphicsContext.current!.cgContext

func rgb(_ hex: Int, _ a: CGFloat = 1) -> CGColor {
  CGColor(red: CGFloat((hex >> 16) & 255) / 255, green: CGFloat((hex >> 8) & 255) / 255, blue: CGFloat(hex & 255) / 255, alpha: a)
}

// macOS icon grid: the tile is 824 px with 100 px margins and a ~185 px corner radius.
let tile = CGRect(x: 100, y: 100, width: 824, height: 824)
let shape = CGPath(roundedRect: tile, cornerWidth: 185, cornerHeight: 185, transform: nil)

// soft drop shadow under the tile
c.saveGState()
c.setShadow(offset: CGSize(width: 0, height: -14), blur: 34, color: rgb(0x1f1b24, 0.35))
c.addPath(shape); c.setFillColor(rgb(0x5a4fd6)); c.fillPath()
c.restoreGState()

// diagonal gradient fill
c.saveGState()
c.addPath(shape); c.clip()
let grad = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: [rgb(0x9d96f9), rgb(0x5a4fd6), rgb(0x3b2fb0)] as CFArray, locations: [0, 0.55, 1])!
c.drawLinearGradient(grad, start: CGPoint(x: 160, y: 900), end: CGPoint(x: 880, y: 120), options: [])
// a light sheen across the top
c.setFillColor(rgb(0xffffff, 0.07)); c.fillEllipse(in: CGRect(x: -80, y: 560, width: 1180, height: 560))

// storyboard strip along the bottom: four frames
let frameW: CGFloat = 150, frameH: CGFloat = 100, gap: CGFloat = 28
let stripX = (size - (4 * frameW + 3 * gap)) / 2
for i in 0..<4 {
  let r = CGRect(x: stripX + CGFloat(i) * (frameW + gap), y: 190, width: frameW, height: frameH)
  c.addPath(CGPath(roundedRect: r, cornerWidth: 18, cornerHeight: 18, transform: nil))
  c.setFillColor(rgb(0xffffff, i == 1 ? 0.92 : 0.28)); c.fillPath()
}
c.restoreGState()

// white play button
let center = CGPoint(x: 512, y: 590)
c.setShadow(offset: CGSize(width: 0, height: -8), blur: 22, color: rgb(0x1f1b24, 0.3))
c.setFillColor(rgb(0xffffff)); c.fillEllipse(in: CGRect(x: center.x - 190, y: center.y - 190, width: 380, height: 380))
c.setShadow(offset: .zero, blur: 0, color: nil)
let tri = CGMutablePath()
tri.move(to: CGPoint(x: center.x - 58, y: center.y + 92))
tri.addLine(to: CGPoint(x: center.x - 58, y: center.y - 92))
tri.addLine(to: CGPoint(x: center.x + 102, y: center.y))
tri.closeSubpath()
c.addPath(tri); c.setFillColor(rgb(0x5a4fd6)); c.fillPath()

NSGraphicsContext.restoreGraphicsState()
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: out))
print("wrote \(out)")
