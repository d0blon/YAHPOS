const fs = require('fs');
const pdf = require('pdf-parse');

async function readPdf(path) {
  const dataBuffer = fs.readFileSync(path);
  const data = await pdf(dataBuffer);
  console.log('=== ' + path + ' ===');
  console.log('Páginas:', data.numpages);
  console.log(data.text);
  console.log('\n\n');
}

(async () => {
  await readPdf('C:/Users/Blaz Baez/Downloads/manual_certificacion.pdf');
  await readPdf('C:/Users/Blaz Baez/Downloads/inst_set_pruebas.pdf');
})();
