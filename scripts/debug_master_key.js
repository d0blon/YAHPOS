const crypto = require('crypto');
const { generateSync, verifySync } = require('otplib');
const fs = require('fs');
const path = require('path');

const ALGORITHM = 'aes-256-cbc';

function decrypt(encryptedText, password) {
  const textParts = encryptedText.split(':');
  const ivRaw = textParts.shift();
  const iv = Buffer.from(ivRaw, 'hex');
  const encryptedData = textParts.join(':');
  const salt = crypto.scryptSync(password, process.env.SECURITY_SALT || 'patagonia-salt', 32);
  const decipher = crypto.createDecipheriv(ALGORITHM, salt, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function readEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/^MASTER_KEY_ENCRYPTED=(.+)$/m);
  return match ? match[1].trim() : null;
}

function main() {
  const password = process.argv[2];
  if (!password) {
    console.error('Uso: node scripts/debug_master_key.js "tu-contraseña"');
    process.exit(1);
  }

  const encrypted = readEnvLocal();
  if (!encrypted) {
    console.error('No encontré MASTER_KEY_ENCRYPTED en .env.local');
    process.exit(1);
  }

  console.log('==================================================');
  try {
    const secret = decrypt(encrypted, password);
    console.log('✅ DESENCRIPTA BIEN — la contraseña es correcta.');
    console.log('');
    const currentCode = generateSync({ secret });
    console.log('🔢 Código TOTP válido AHORA MISMO (30s de ventana):');
    console.log('   ' + currentCode);
    console.log('');
    console.log('Compará este número con lo que te muestra Authy/Google Authenticator.');
    console.log('Si NO coincide: el secreto que cargaste en tu app de autenticación no es');
    console.log('el mismo que este (revisá si agregaste una entrada vieja por error), o el');
    console.log('reloj de tu teléfono/PC está desincronizado.');
  } catch (e) {
    console.log('❌ NO DESENCRIPTA — la contraseña NO es la correcta para este');
    console.log('   MASTER_KEY_ENCRYPTED. Detalle técnico:', e.message);
  }
  console.log('==================================================');
}

main();
