// vtool cuts <video>            -> prints per-frame diff ("t diff") for every frame
// vtool frames <video> <outdir> <t1,t2,...> <width>  -> exports PNG frames
import AVFoundation
import AppKit

let a = CommandLine.arguments
let asset = AVURLAsset(url: URL(fileURLWithPath: a[2]))
if a[1] == "cuts" {
  let track = asset.tracks(withMediaType: .video)[0]
  let reader = try! AVAssetReader(asset: asset)
  let out = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
  reader.add(out); reader.startReading()
  var prev: [Float]? = nil
  while let sb = out.copyNextSampleBuffer() {
    let t = CMSampleBufferGetPresentationTimeStamp(sb).seconds
    guard let pb = CMSampleBufferGetImageBuffer(sb) else { continue }
    CVPixelBufferLockBaseAddress(pb, .readOnly)
    let w = CVPixelBufferGetWidth(pb), h = CVPixelBufferGetHeight(pb), bpr = CVPixelBufferGetBytesPerRow(pb)
    let base = CVPixelBufferGetBaseAddress(pb)!.assumingMemoryBound(to: UInt8.self)
    var g = [Float](); g.reserveCapacity(48*48)
    for gy in 0..<48 { for gx in 0..<48 {
      let p = base + (gy * h / 48) * bpr + (gx * w / 48) * 4
      g.append((Float(p[0]) + Float(p[1]) + Float(p[2])) / 3)
    } }
    CVPixelBufferUnlockBaseAddress(pb, .readOnly)
    if let pr = prev { var d: Float = 0; for i in 0..<g.count { d += abs(g[i] - pr[i]) }; print(String(format: "%.3f %.2f", t, d / Float(g.count))) }
    prev = g
  }
} else {
  let gen = AVAssetImageGenerator(asset: asset)
  gen.requestedTimeToleranceBefore = .zero; gen.requestedTimeToleranceAfter = .zero
  gen.maximumSize = CGSize(width: Double(a[5])!, height: Double(a[5])! * 2)
  for (i, ts) in a[4].split(separator: ",").enumerated() {
    let t = CMTime(seconds: Double(ts)!, preferredTimescale: 600)
    guard let cg = try? gen.copyCGImage(at: t, actualTime: nil) else { continue }
    let rep = NSBitmapImageRep(cgImage: cg)
    try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "\(a[3])/\(String(format: "%03d", i)).png"))
  }
}
