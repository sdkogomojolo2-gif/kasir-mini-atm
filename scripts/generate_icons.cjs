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

function inRoundedRect(x, y, rx, ry, rw, rh, rad) {
  if (x < rx || x > rx + rw || y < ry || y > ry + rh) return false;
  const cx = rx + rw / 2;
  const cy = ry + rh / 2;
  const halfW = rw / 2;
  const halfH = rh / 2;
  const dx = Math.abs(x - cx);
  const dy = Math.abs(y - cy);
  if (dx > halfW - rad && dy > halfH - rad) {
    return Math.hypot(dx - (halfW - rad), dy - (halfH - rad)) <= rad;
  }
  return true;
}

function generateIconPNG(size, filename) {
  const width = size;
  const height = size;
  const rawData = Buffer.alloc((width * 4 + 1) * height);

  const cornerRadius = size * 0.22;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Normalize coordinates to 0..512 space so our Mini ATM illustration scales cleanly
      const nx = (x / size) * 512;
      const ny = (y / size) * 512;

      if (!inRoundedRect(x, y, 0, 0, width, height, cornerRadius)) {
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
        continue;
      }

      // 1. Royal Blue Gradient Background (#1d4ed8 -> #1e3a8a)
      const gradRatio = (x + y) / (width + height);
      let r = Math.round(37 * (1 - gradRatio) + 23 * gradRatio);
      let g = Math.round(99 * (1 - gradRatio) + 54 * gradRatio);
      let b = Math.round(235 * (1 - gradRatio) + 148 * gradRatio);
      let a = 255;

      // Subtle inner border highlight
      if (
        inRoundedRect(nx, ny, 14, 14, 484, 484, 100) &&
        !inRoundedRect(nx, ny, 19, 19, 474, 474, 96)
      ) {
        r = 96;
        g = 165;
        b = 250;
      }

      // 2. Top Thermal Receipt Paper Emerging from EDC Machine (x: 164..296, y: 46..110)
      if (nx >= 164 && nx <= 296 && ny >= 48 && ny <= 112) {
        const zig = Math.sin((nx - 164) * 0.22) * 5;
        if (ny >= 54 + zig) {
          r = 248;
          g = 250;
          b = 252;
          // Blue receipt lines
          if (nx >= 182 && nx <= 276 && ny >= 70 && ny <= 77) {
            r = 59;
            g = 130;
            b = 246;
          } else if (nx >= 182 && nx <= 252 && ny >= 86 && ny <= 92) {
            r = 147;
            g = 197;
            b = 253;
          }
        }
      }

      // 3. White Mini ATM / EDC Machine Body (x: 108..352, y: 96..428)
      if (inRoundedRect(nx, ny, 108, 96, 244, 332, 36)) {
        // Light blue outer border of EDC
        if (!inRoundedRect(nx, ny, 115, 103, 230, 318, 30)) {
          r = 219;
          g = 234;
          b = 254;
        } else {
          // Pure crisp white body
          r = 255;
          g = 255;
          b = 255;
        }

        // Top Card Reader Slot
        if (inRoundedRect(nx, ny, 148, 110, 164, 10, 5)) {
          r = 30;
          g = 58;
          b = 138;
        }

        // EDC Screen Frame (x: 132..328, y: 132..240)
        if (inRoundedRect(nx, ny, 132, 132, 196, 108, 18)) {
          if (!inRoundedRect(nx, ny, 138, 138, 184, 96, 13)) {
            // Royal Blue screen border
            r = 37;
            g = 99;
            b = 235;
          } else {
            // Soft Ice Blue LCD screen
            r = 239;
            g = 246;
            b = 255;

            // Blue header pill inside screen
            if (inRoundedRect(nx, ny, 148, 146, 164, 24, 6)) {
              r = 29;
              g = 78;
              b = 216;
            }
            // Simulated "ATM" bold bars on screen
            if (inRoundedRect(nx, ny, 164, 184, 132, 14, 4)) {
              r = 30;
              g = 58;
              b = 138;
            }
            if (inRoundedRect(nx, ny, 182, 208, 96, 10, 4)) {
              r = 59;
              g = 130;
              b = 246;
            }
          }
        }

        // EDC Keypad Buttons (3 columns x 4 rows)
        const cols = [138, 204, 270];
        const rows = [256, 294, 332, 372];
        for (let rIdx = 0; rIdx < 4; rIdx++) {
          for (let cIdx = 0; cIdx < 3; cIdx++) {
            const bx = cols[cIdx];
            const by = rows[rIdx];
            if (inRoundedRect(nx, ny, bx, by, 52, 26, 7)) {
              if (rIdx < 3) {
                r = 219;
                g = 234;
                b = 254;
              } else if (cIdx === 0) {
                // Cancel Red
                r = 239;
                g = 68;
                b = 68;
              } else if (cIdx === 1) {
                // Clear Gold
                r = 245;
                g = 158;
                b = 11;
              } else {
                // Enter Green
                r = 16;
                g = 185;
                b = 129;
              }
            }
          }
        }
      }

      // 4. Overlapping Sky-Blue & White Bank ATM Card on Right (x: 272..436, y: 236..428)
      if (inRoundedRect(nx, ny, 272, 236, 164, 192, 24)) {
        if (!inRoundedRect(nx, ny, 280, 244, 148, 176, 18)) {
          // Crisp White Card Border
          r = 255;
          g = 255;
          b = 255;
        } else {
          // Vibrant Cyan-Blue ATM Card surface
          r = 14;
          g = 165;
          b = 233;

          // Golden EMV Chip (x: 298..354, y: 266..310)
          if (inRoundedRect(nx, ny, 298, 266, 56, 44, 8)) {
            r = 250;
            g = 204;
            b = 21;
            // Chip grid lines
            if (Math.abs(ny - 288) < 1.8 || Math.abs(nx - 326) < 1.8) {
              r = 180;
              g = 130;
              b = 8;
            }
          }

          // White card stripes at bottom
          if (inRoundedRect(nx, ny, 298, 332, 112, 12, 5)) {
            r = 224;
            g = 242;
            b = 254;
          }
          if (inRoundedRect(nx, ny, 298, 354, 78, 10, 5)) {
            r = 186;
            g = 230;
            b = 253;
          }
          if (inRoundedRect(nx, ny, 298, 378, 112, 26, 7)) {
            r = 255;
            g = 255;
            b = 255;
          }
        }
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idatData = zlib.deflateSync(rawData, { level: 9 });

  const png = Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idatData),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);

  fs.writeFileSync(filename, png);
  console.log(`Generated Mini ATM icon: ${filename} (${size}x${size})`);
}

generateIconPNG(192, 'public/pwa-192x192.png');
generateIconPNG(512, 'public/pwa-512x512.png');
generateIconPNG(180, 'public/apple-touch-icon.png');
