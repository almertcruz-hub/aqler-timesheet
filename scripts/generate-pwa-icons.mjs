import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

function createCrcTable() {
  return Array.from({ length: 256 }, (_, tableIndex) => {
    let value = tableIndex

    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }

    return value >>> 0
  })
}

const crcTable = createCrcTable()

function crc32(buffer) {
  let crc = 0xffffffff

  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type)
  const length = Buffer.alloc(4)
  const checksum = Buffer.alloc(4)

  length.writeUInt32BE(data.length)
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])))

  return Buffer.concat([length, typeBuffer, data, checksum])
}

function setPixel(pixels, size, x, y, color) {
  if (x < 0 || x >= size || y < 0 || y >= size) return

  const position = (y * size + x) * 4
  pixels[position] = color[0]
  pixels[position + 1] = color[1]
  pixels[position + 2] = color[2]
  pixels[position + 3] = 255
}

function drawCircle(pixels, size, centerX, centerY, radius, color) {
  const radiusSquared = radius * radius

  for (let y = centerY - radius; y <= centerY + radius; y += 1) {
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      const distance = (x - centerX) ** 2 + (y - centerY) ** 2
      if (distance <= radiusSquared) setPixel(pixels, size, x, y, color)
    }
  }
}

function drawLine(pixels, size, startX, startY, endX, endY, width, color) {
  const steps = Math.max(Math.abs(endX - startX), Math.abs(endY - startY))

  for (let step = 0; step <= steps; step += 1) {
    const progress = step / steps
    const x = Math.round(startX + (endX - startX) * progress)
    const y = Math.round(startY + (endY - startY) * progress)
    drawCircle(pixels, size, x, y, width, color)
  }
}

function generateIcon(size) {
  const navy = [2, 6, 23]
  const panel = [15, 23, 42]
  const blue = [59, 130, 246]
  const white = [248, 250, 252]
  const pixels = Buffer.alloc(size * size * 4)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      setPixel(pixels, size, x, y, navy)
    }
  }

  const center = Math.round(size / 2)
  drawCircle(pixels, size, center, center, Math.round(size * 0.31), blue)
  drawCircle(pixels, size, center, center, Math.round(size * 0.265), panel)
  drawLine(pixels, size, center, center, center, Math.round(size * 0.31), Math.max(3, Math.round(size * 0.025)), white)
  drawLine(pixels, size, center, center, Math.round(size * 0.65), Math.round(size * 0.59), Math.max(3, Math.round(size * 0.025)), white)
  drawCircle(pixels, size, center, center, Math.max(4, Math.round(size * 0.035)), blue)

  const rawRows = []
  for (let y = 0; y < size; y += 1) {
    rawRows.push(Buffer.from([0]), pixels.subarray(y * size * 4, (y + 1) * size * 4))
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8
  header[9] = 6

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    createChunk('IHDR', header),
    createChunk('IDAT', deflateSync(Buffer.concat(rawRows))),
    createChunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [192, 512]) {
  writeFileSync(
    resolve(`public/pwa-${size}.png`),
    generateIcon(size)
  )
}
