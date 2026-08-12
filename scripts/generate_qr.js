const QRCode = require('qrcode');
const { generateURI } = require('otplib');
const path = require('path');

async function main() {
  const secret = process.argv[2];
  if (!secret) {
    console.error('Uso: node scripts/generate_qr.js SECRETO_BASE32');
    process.exit(1);
  }

  const otpauth = generateURI({ issuer: 'YAHPOS!', label: 'Developer', secret });
  const outPath = path.join(__dirname, '..', 'master_key_qr.png');
  await QRCode.toFile(outPath, otpauth, { width: 400 });

  console.log('QR guardado en:', outPath);
  console.log('URI:', otpauth);
}

main();
