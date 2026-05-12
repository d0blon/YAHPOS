import forge from 'node-forge';
console.log('Forge keys:', Object.keys(forge));
if (forge.pkcs12) {
  console.log('pkcs12 keys:', Object.keys(forge.pkcs12));
} else {
  console.log('pkcs12 is undefined');
}
