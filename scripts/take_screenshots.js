const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function run() {
  const screenshotsDir = path.join(__dirname, '..', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('Estableciendo sesión mock con plan Elite...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  const mockAuthState = {
    state: {
      user: {
        id: "1",
        role: "developer",
        email: "admin@yahpos.cl",
        firstName: "Blaz",
        lastName: "Baez",
        phone: "+56912345678",
        rut: "1111111-1",
        loyaltyPoints: 2450,
        identityVerified: true,
        wishlist: [],
        purchaseHistory: [],
        addresses: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      isAuthenticated: true,
      isLoading: false
    },
    version: 0
  };

  await page.evaluate((state) => {
    localStorage.setItem('patagoniapos-auth', JSON.stringify(state));
  }, mockAuthState);

  const routes = [
    // --- ECOMMERCE / TIENDA PÚBLICA ---
    { name: '01_Home',               url: 'http://localhost:3000/' },
    { name: '02_Nosotros',           url: 'http://localhost:3000/nosotros' },
    { name: '03_Productos',          url: 'http://localhost:3000/productos' },
    { name: '04_Carrito',            url: 'http://localhost:3000/carrito' },
    { name: '05_Checkout',           url: 'http://localhost:3000/checkout' },
    { name: '06_Login',              url: 'http://localhost:3000/login' },
    { name: '07_Perfil',             url: 'http://localhost:3000/perfil' },
    { name: '08_Upgrade',            url: 'http://localhost:3000/upgrade' },

    // --- POS ---
    { name: '09_POS',                url: 'http://localhost:3000/pos' },

    // --- ADMIN ---
    { name: '10_Admin_Dashboard',    url: 'http://localhost:3000/admin' },
    { name: '11_Admin_Productos',    url: 'http://localhost:3000/admin/productos' },
    { name: '12_Admin_Pedidos',      url: 'http://localhost:3000/admin/pedidos' },
    { name: '13_Admin_Clientes',     url: 'http://localhost:3000/admin/clientes' },
    { name: '14_Admin_Personal',     url: 'http://localhost:3000/admin/personal' },
    { name: '15_Admin_Inventario',   url: 'http://localhost:3000/admin/inventario' },
    { name: '16_Admin_Reportes',     url: 'http://localhost:3000/admin/reportes' },
    { name: '17_Admin_Config',       url: 'http://localhost:3000/admin/configuracion' },
    { name: '18_Admin_Developer',    url: 'http://localhost:3000/admin/developer' },
  ];

  for (const route of routes) {
    console.log(`📸 Capturando ${route.name}...`);
    try {
      await page.goto(route.url, { waitUntil: 'networkidle0', timeout: 20000 });
      // Extra time for animations and lazy-loaded content
      await new Promise(r => setTimeout(r, 1500));
      await page.screenshot({
        path: path.join(screenshotsDir, `${route.name}.png`),
        fullPage: true
      });
      console.log(`   ✅ ${route.name}.png guardado`);
    } catch (err) {
      console.warn(`   ⚠️  Error en ${route.name}: ${err.message}`);
    }
  }

  await browser.close();
  console.log('\n🎉 ¡Screenshots completos! Revisa la carpeta /screenshots');
}

run().catch(console.error);
