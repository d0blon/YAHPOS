const crypto = require('crypto');
const { generateSecret, generateURI } = require('otplib');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function encrypt(text, password) {
  const salt = crypto.scryptSync(password, process.env.SECURITY_SALT || 'patagonia-salt', 32);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, salt, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

async function main() {
  const password = process.argv[2];
  if (!password) {
    console.error('Uso: node scripts/reset_master_key.js "tu-nueva-contraseña-maestra"');
    process.exit(1);
  }

  const secret = generateSecret();
  const otpauth = generateURI({ issuer: 'YAHPOS!', label: 'Developer', secret });
  const encrypted = encrypt(secret, password);

  console.log('==================================================');
  console.log('🔑 NUEVA CLAVE MAESTRA GENERADA');
  console.log('==================================================');
  console.log('1. Pegá esto en tu .env.local (reemplazando el valor viejo de MASTER_KEY_ENCRYPTED):');
  console.log('');
  console.log(`MASTER_KEY_ENCRYPTED=${encrypted}`);
  console.log('');
  console.log('2. Escaneá esta URI en Authy (Agregar cuenta → Entrar clave manualmente, o generá');
  console.log('   un QR con cualquier lector online pegando esta URI):');
  console.log('');
  console.log(otpauth);
  console.log('');
  console.log('3. Reiniciá el servidor (npm run dev) para que tome el nuevo valor de env.');
  console.log('4. La contraseña que usaste como argumento es tu nueva "Clave de Bóveda" en LockScreen.');
  console.log('   Guardala en un lugar seguro esta vez — no se puede recuperar si se pierde.');
  console.log('==================================================');
}

main();
