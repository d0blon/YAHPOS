const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'public', 'icons');
const svg192 = path.join(iconsDir, 'icon-192x192.svg');
const svg512 = path.join(iconsDir, 'icon-512x512.svg');

async function convert() {
  console.log('Convertiendo íconos a PNG...');
  
  await sharp(svg192)
    .png()
    .resize(192, 192)
    .toFile(path.join(iconsDir, 'icon-192x192.png'));
    
  await sharp(svg512)
    .png()
    .resize(512, 512)
    .toFile(path.join(iconsDir, 'icon-512x512.png'));
    
  console.log('¡Íconos convertidos exitosamente!');
}

convert().catch(err => {
  console.error('Error al convertir íconos:', err);
  process.exit(1);
});
