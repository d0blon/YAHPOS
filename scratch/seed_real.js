import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bddpzqayurvhgpllykku.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Dvh4RG7t_QbWO-TZbayn6w_JKptnORq';
// Usually we'd use the service role key to insert, but since RLS might be disabled or auth allows it, we'll try with the anon key and service role key if needed. 
// Given the .env.local, SUPABASE_SERVICE_ROLE_KEY is the same as ANON_KEY right now (or RLS is off).

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const realisticProducts = [
  {
    name: 'Leche Descremada Blanca Colún 1L',
    description: 'Leche Larga Vida Descremada Colún',
    price: 1350,
    category: 'lacteos',
    stock: 120,
    barcode: '7802215505716',
    unit: 'un',
    image: 'https://cdn.jumbo.cl/get/w/1200/h/1200/cz0yMDUyMDg3/2052087.jpg'
  },
  {
    name: 'Queso Gouda Laminado Soprole 250g',
    description: 'Queso amarillo laminado especial para sándwich',
    price: 3290,
    category: 'lacteos',
    stock: 45,
    barcode: '7801810500124',
    unit: 'un',
    image: 'https://cdn.jumbo.cl/get/w/1200/h/1200/cz0yMDUxODU0/2051854.jpg'
  },
  {
    name: 'Bebida Coca-Cola Original 2.5L',
    description: 'Gaseosa sabor cola desechable',
    price: 2490,
    category: 'bebidas',
    stock: 80,
    barcode: '7802200000305',
    unit: 'un',
    image: 'https://cdn.jumbo.cl/get/w/1200/h/1200/cz0xMjkzOTE3/1293917.jpg'
  },
  {
    name: 'Cerveza Escudo Rubia Lata 470cc',
    description: 'Cerveza tipo Lager',
    price: 990,
    category: 'bebidas',
    stock: 250,
    barcode: '7804609050073',
    unit: 'un',
    image: 'https://cdn.jumbo.cl/get/w/1200/h/1200/cz0xMzgxNDYx/1381461.jpg'
  },
  {
    name: 'Fideos Spaghetti Carozzi N°5 400g',
    description: 'Pastas tradicionales de sémola',
    price: 950,
    category: 'alimentos',
    stock: 60,
    barcode: '7802110000211',
    unit: 'un',
    image: 'https://cdn.jumbo.cl/get/w/1200/h/1200/cz0yMDkzMDQ0/2093044.jpg'
  },
  {
    name: 'Arroz Grano Largo Tucapel 1kg',
    description: 'Arroz Tucapel Grado 1 seleccion',
    price: 1890,
    category: 'alimentos',
    stock: 75,
    barcode: '7802050000201',
    unit: 'un',
    image: 'https://cdn.jumbo.cl/get/w/1200/h/1200/cz0xMDI0NDM1/1024435.jpg'
  },
  {
    name: 'Detergente Líquido Omo Matic 3L',
    description: 'Para lavado a máquina ropa blanca y color',
    price: 9990,
    category: 'limpieza',
    stock: 30,
    barcode: '7801004000301',
    unit: 'un',
    image: 'https://cdn.jumbo.cl/get/w/1200/h/1200/cz0xMjkzOTE3/3052123.jpg'
  },
  {
    name: 'Lavalozas Quix Limón 500ml',
    description: 'Poder desengrasante superior',
    price: 1790,
    category: 'limpieza',
    stock: 40,
    barcode: '7801002000502',
    unit: 'un',
    image: ''
  },
  {
    name: 'Manzana Fuji (A granel)',
    description: 'Manzana dulce y crujiente de exportación',
    price: 1690,
    category: 'frescos',
    stock: 120,
    barcode: '2000000000018',
    unit: 'kg',
    sold_by_weight: true,
    price_per_kg: 1690,
    image: 'https://cdn.jumbo.cl/get/w/1200/h/1200/cz0xMDI2MzA2/1026306.jpg'
  },
  {
    name: 'Lomo Vetado de Vacuno Selección',
    description: 'Corte ideal para parrilla',
    price: 11990,
    category: 'carnes',
    stock: 15,
    barcode: '2000000000025',
    unit: 'kg',
    sold_by_weight: true,
    price_per_kg: 11990,
    image: ''
  },
  {
    name: 'Papel Higiénico Confort 40m 4 unid',
    description: 'Doble hoja extra suave',
    price: 2490,
    category: 'hogar',
    stock: 50,
    barcode: '7801201000405',
    unit: 'un',
    image: ''
  }
];

async function seed() {
  console.log('Seeding products...');
  for (const product of realisticProducts) {
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select();

    if (error) {
      console.error(`Error inserting ${product.name}:`, error.message);
    } else {
      console.log(`Success: ${product.name} inserted!`);
    }
  }
  console.log('Seed formatting complete!');
}

seed();
