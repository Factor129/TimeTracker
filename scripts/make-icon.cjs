// Generates simple PNG icons (app icon + tray icon) with no external deps.
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

function crc32(buf) {
  let c
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[n] = c
    }
    return t
  })())
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function makePng(size, drawPixel) {
  const raw = Buffer.alloc(size * (1 + size * 4))
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4)
    raw[rowStart] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = drawPixel(x, y, size)
      const off = rowStart + 1 + x * 4
      raw[off] = r
      raw[off + 1] = g
      raw[off + 2] = b
      raw[off + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const idat = zlib.deflateSync(raw)
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function clockPixel(x, y, size) {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 1
  const dx = x - cx + 0.5
  const dy = y - cy + 0.5
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist > r) return [0, 0, 0, 0]

  // orange face
  let color = [242, 140, 40, 255]
  // darker ring
  if (dist > r - Math.max(1, size * 0.06)) color = [200, 100, 20, 255]

  // clock hands (12 -> pointing up, 4 -> pointing lower-right)
  const isOnSegment = (ang, len) => {
    const hx = Math.sin(ang) * len
    const hy = -Math.cos(ang) * len
    // distance from point to segment (cx,cy)-(cx+hx,cy+hy)
    const t = Math.max(0, Math.min(1, (dx * hx + dy * hy) / (hx * hx + hy * hy)))
    const px = hx * t
    const py = hy * t
    const ddx = dx - px
    const ddy = dy - py
    return Math.sqrt(ddx * ddx + ddy * ddy) < Math.max(1, size * 0.07)
  }

  if (isOnSegment(0, r * 0.55) || isOnSegment((4 / 12) * Math.PI * 2, r * 0.4)) {
    color = [255, 255, 255, 255]
  }

  return color
}

const resDir = path.join(__dirname, '..', 'resources')
if (!fs.existsSync(resDir)) fs.mkdirSync(resDir, { recursive: true })

fs.writeFileSync(path.join(resDir, 'icon.png'), makePng(256, clockPixel))
fs.writeFileSync(path.join(resDir, 'tray.png'), makePng(32, clockPixel))
console.log('Icons written to', resDir)
