
import http from 'http';

async function test(url, name) {
  console.log(`\n--- Testeando: ${name} (${url}) ---`);
  const latencies = [];
  const startTotal = Date.now();
  const count = 50; // We'll do 50 requests per endpoint
  
  for (let i = 0; i < count; i++) {
    const start = Date.now();
    await new Promise((resolve, reject) => {
      http.get(url, (res) => {
        res.on('data', () => {});
        res.on('end', () => {
          latencies.push(Date.now() - start);
          resolve();
        });
      }).on('error', reject);
    });
  }
  
  const endTotal = Date.now();
  latencies.sort((a, b) => a - b);
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || latencies[latencies.length - 1];
  
  console.log(`Requests/sec: ${(count / ((endTotal - startTotal) / 1000)).toFixed(2)}`);
  console.log(`Latency (p99): ${p99} ms`);
  console.log(`Latency (avg): ${avg.toFixed(2)} ms`);
  console.log(`Total Requests: ${count}`);
  
  if (p99 > 200) {
    console.warn('⚠️ ALERTA: Latencia p99 superior a 200ms!');
  } else {
    console.log('✅ Latencia p99 dentro de los límites operativos (<200ms)');
  }
}

async function run() {
  console.log('🚀 Iniciando pruebas de carga manuales (Sequential) para PatagoniaPOS...');
  try {
    await test('http://127.0.0.1:3000/api/health', 'API Health');
    await test('http://127.0.0.1:3000/api/products', 'Public Products List');
    await test('http://127.0.0.1:3000/', 'Home Page');
  } catch (err) {
    console.error('❌ Error durante la prueba:', err.message);
  }
}

run();
