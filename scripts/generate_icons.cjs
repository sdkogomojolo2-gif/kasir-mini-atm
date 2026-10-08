const fs = require('fs');
const zlib = require('zlib');

function makeCrcTable() {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
}
const crcTable = makeCrcTable();
function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

function generateIconPNG(size, filename) {
  const width = size;
  const height = size;
  
  // Create RGBA buffer with 1 extra filter byte per row
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  
  const cornerRadius = size * 0.22;
  const cx = width / 2;
  const cy = height / 2;
  
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    rawData[rowOffset] = 0; // Filter: None
    
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      
      // Check rounded corner mask
      let inside = true;
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);
      const halfW = width / 2;
      const halfH = height / 2;
      
      if (dx > halfW - cornerRadius && dy > halfH - cornerRadius) {
        const cornerDist = Math.hypot(dx - (halfW - cornerRadius), dy - (halfH - cornerRadius));
        if (cornerDist > cornerRadius) {
          inside = false;
        }
      }
      
      if (!inside) {
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
        continue;
      }
      
      // Gradient background (Emerald / Teal)
      const gradRatio = (x + y) / (width + height);
      const rBg = Math.round(5 * (1 - gradRatio) + 4 * gradRatio);
      const gBg = Math.round(150 * (1 - gradRatio) + 120 * gradRatio);
      const bBg = Math.round(105 * (1 - gradRatio) + 87 * gradRatio);
      
      let r = rBg;
      let g = gBg;
      let b = bBg;
      let a = 255;
      
      // Outer border highlight
      if (x < 6 || x >= width - 6 || y < 6 || y >= height - 6) {
        r = Math.min(255, r + 40);
        g = Math.min(255, g + 50);
        b = Math.min(255, b + 40);
      }
      
      // Central "Q" / POS icon visual motif
      // Center circle representing the magnifying / cart / coin / Q ring
      const ringOuter = size * 0.28;
      const ringInner = size * 0.17;
      const distFromCenter = Math.hypot(x - cx, y - (cy - size * 0.04));
      
      // Outer ring for Q
      if (distFromCenter <= ringOuter && distFromCenter >= ringInner) {
        // Bright white/emerald ring
        r = 255;
        g = 255;
        b = 255;
      }
      
      // Tail of the "Q"
      const tailX = cx + size * 0.12;
      const tailY = cy + size * 0.08;
      const tailDist = Math.hypot(x - tailX, y - tailY);
      const inTailAngle = (x - cx > 0) && (y - cy > 0) && Math.abs((x - cx) - (y - cy)) < size * 0.07;
      if (inTailAngle && distFromCenter <= ringOuter + size * 0.12 && distFromCenter >= ringInner * 0.8) {
        r = 255;
        g = 255;
        b = 255;
      }
      
      // Golden star / accent dot in center of Q
      const dotDist = Math.hypot(x - cx, y - (cy - size * 0.04));
      if (dotDist <= size * 0.07) {
        r = 251;
        g = 191;
        b = 36; // Amber gold
      }
      
      // Text bar / Cash register base indicator at bottom
      const baseTop = cy + size * 0.26;
      const baseBottom = cy + size * 0.36;
      const baseLeft = cx - size * 0.32;
      const baseRight = cx + size * 0.32;
      if (x >= baseLeft && x <= baseRight && y >= baseTop && y <= baseBottom) {
        r = 6;
        g = 78;
        b = 59; // Dark emerald base
        // small gold dot inside base
        if (Math.hypot(x - cx, y - (baseTop + baseBottom) / 2) <= size * 0.035) {
          r = 251;
          g = 191;
          b = 36;
        }
      }
      
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }
  
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // deflate
  ihdrData[11] = 0; // standard filter
  ihdrData[12] = 0; // non-interlaced
  const ihdrChunk = makeChunk('IHDR', ihdrData);
  
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  
  const pngBuffer = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync(filename, pngBuffer);
  console.log(`Generated ${filename} (${size}x${size}, ${pngBuffer.length} bytes)`);
}

generateIconPNG(192, 'public/pwa-192x192.png');
generateIconPNG(512, 'public/pwa-512x512.png');
generateIconPNG(180, 'public/apple-touch-icon.png');
