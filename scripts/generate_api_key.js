const crypto = require('crypto');

function generateApiKey() {
  // Generar 32 bytes aleatorios en formato hex para la llave
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const apiKey = `yp_live_${randomBytes}`;
  
  // Computar el hash SHA-256
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  
  console.log('==================================================');
  console.log('🔑 LLAVE API GENERADA (Guárdala en un lugar seguro, no se volverá a mostrar):');
  console.log(apiKey);
  console.log('==================================================');
  console.log('🔒 HASH SHA-256 (Guarda esto en el campo `key_hash` de tu base de datos):');
  console.log(keyHash);
  console.log('==================================================');
}

generateApiKey();
