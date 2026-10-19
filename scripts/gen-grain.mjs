// Generates a simple noise PNG via raw buffer — no canvas dependency needed
import { writeFileSync } from 'fs'
import { mkdirSync } from 'fs'

// 128×128 RGBA PNG with random luminance noise
const W = 128, H = 128
const pixels = new Uint8Array(W * H * 4)
for (let i = 0; i < W * H; i++) {
  const v = Math.floor(Math.random() * 256)
  pixels[i*4]   = v
  pixels[i*4+1] = v
  pixels[i*4+2] = v
  pixels[i*4+3] = 255
}

// Minimal PNG encoder
function toPNG(width, height, rgba) {
  const crc32 = (buf) => {
    let c = 0xFFFFFFFF
    const table = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
      let x = i
      for (let j = 0; j < 8; j++) x = (x & 1) ? 0xEDB88320 ^ (x >>> 1) : x >>> 1
      table[i] = x
    }
    for (const b of buf) c = table[(c ^ b) & 0xFF] ^ (c >>> 8)
    return (c ^ 0xFFFFFFFF) >>> 0
  }

  const zlib = await import('zlib')
  // Use sync deflate
  const { deflateSync } = await import('zlib')

  const rawRows = []
  for (let y = 0; y < height; y++) {
    const row = new Uint8Array(1 + width * 3)
    row[0] = 0 // filter type None
    for (let x = 0; x < width; x++) {
      row[1 + x*3]   = rgba[(y*width+x)*4]
      row[1 + x*3+1] = rgba[(y*width+x)*4+1]
      row[1 + x*3+2] = rgba[(y*width+x)*4+2]
    }
    rawRows.push(row)
  }
  const raw = new Uint8Array(rawRows.reduce((a,r) => a+r.length, 0))
  let off = 0
  for (const r of rawRows) { raw.set(r, off); off += r.length }

  const compressed = deflateSync(raw)

  const chunk = (type, data) => {
    const t = Buffer.from(type)
    const d = Buffer.from(data)
    const len = Buffer.alloc(4); len.writeUInt32BE(d.length)
    const crcBuf = Buffer.concat([t, d])
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(crcBuf))
    return Buffer.concat([len, t, d, crc])
  }

  const sig = Buffer.from([137,80,78,71,13,10,26,10])
  const IHDR = chunk('IHDR', (() => {
    const b = Buffer.alloc(13)
    b.writeUInt32BE(width, 0); b.writeUInt32BE(height, 4)
    b[8]=8; b[9]=2; b[10]=0; b[11]=0; b[12]=0
    return b
  })())
  const IDAT = chunk('IDAT', compressed)
  const IEND = chunk('IEND', Buffer.alloc(0))
  return Buffer.concat([sig, IHDR, IDAT, IEND])
}

mkdirSync('public/textures', { recursive: true })
const png = await toPNG(W, H, pixels)
writeFileSync('public/textures/grain.png', png)
console.log('grain.png written')
