// Indonesian Standard Dynamic QRIS Payload Generator (EMVCo TLV Format + CRC16-CCITT)

function padZero(str: string, len = 2): string {
  return str.padStart(len, '0');
}

function formatTLV(tag: string, value: string): string {
  const len = padZero(value.length.toString(), 2);
  return `${tag}${len}${value}`;
}

// CRC16-CCITT Calculation (Polynomial 0x1021, Init 0xFFFF)
function calculateCRC16(str: string): string {
  let crc = 0xffff;
  const strlen = str.length;
  for (let c = 0; c < strlen; c++) {
    let q = (crc ^ str.charCodeAt(c)) & 0xff;
    q = (q ^ (q << 4)) & 0xff;
    crc = ((crc >> 8) ^ (q << 8) ^ (q << 3) ^ (q >> 4)) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function generateDynamicQRIS({
  merchantName = 'TOKO KELONTONG BERKAH',
  merchantCity = 'JAKARTA',
  nmid = 'ID1020038920192',
  amount,
  invoiceNumber,
}: {
  merchantName?: string;
  merchantCity?: string;
  nmid?: string;
  amount: number;
  invoiceNumber: string;
}): string {
  // Clean merchant name (max 25 chars, uppercase)
  const cleanMerchant = merchantName.toUpperCase().slice(0, 25);
  const cleanCity = merchantCity.toUpperCase().slice(0, 15);
  const amountStr = Math.round(amount).toString();

  // Sub-tag for Merchant Account (Tag 26 or 51)
  const globNmid = formatTLV('00', 'ID.CO.QRIS.WWW') + formatTLV('01', nmid) + formatTLV('02', '01') + formatTLV('03', 'UMI');
  const merchantAccountTLV = formatTLV('26', globNmid);

  // Additional Data (Tag 62)
  const additionalData = formatTLV('01', invoiceNumber.slice(0, 25));
  const tag62 = formatTLV('62', additionalData);

  // Core payload components
  let payload = '';
  payload += formatTLV('00', '01'); // Format Indicator
  payload += formatTLV('01', '12'); // Dynamic QR (Point of Initiation)
  payload += merchantAccountTLV; // Tag 26 Merchant Info
  payload += formatTLV('52', '5411'); // Merchant Category Code (5411 = Grocery Stores)
  payload += formatTLV('53', '360'); // Currency: IDR (360)
  payload += formatTLV('54', amountStr); // Dynamic Amount
  payload += formatTLV('58', 'ID'); // Country Code
  payload += formatTLV('59', cleanMerchant); // Merchant Name
  payload += formatTLV('60', cleanCity); // City
  payload += formatTLV('61', '10110'); // Postal Code
  payload += tag62; // Tag 62 Additional Data (Invoice)

  // Append Tag 63 with placeholder length for CRC
  const payloadForCRC = payload + '6304';
  const checksum = calculateCRC16(payloadForCRC);

  return payloadForCRC + checksum;
}
