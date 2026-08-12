const { jsPDF } = require("jspdf");
const fs = require("fs");
const path = require("path");

function generateInvoice() {
  const doc = new jsPDF();

  // Encabezado Factura
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(75, 0, 130); // Indigo YAHPOS! Color
  doc.text("DISTRIBUIDORA SUR S.A.", 14, 25);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text("RUT: 76.543.210-K", 14, 32);
  doc.text("Giro: Distribución y Venta Mayorista de Alimentos", 14, 37);
  doc.text("Dirección: Panamericana Sur KM 120, Santiago", 14, 42);

  // Cuadro de folio (Rojo típico chileno)
  doc.setDrawColor(200, 0, 0);
  doc.setLineWidth(0.8);
  doc.rect(140, 15, 56, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(200, 0, 0);
  doc.text("R.U.T.: 76.543.210-K", 144, 23);
  doc.text("FACTURA ELECTRÓNICA", 142, 29);
  doc.setFontSize(14);
  doc.text("N° 00098822", 152, 37);

  // Datos del Cliente (Demo Store)
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(14, 50, 196, 50);

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL RECEPTOR:", 14, 58);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Señor(es): YAHPOS! Almacén Demo", 14, 64);
  doc.text("RUT: 77.888.999-5", 14, 69);
  doc.text("Dirección: Av. Patagonia 450, Castro, Chiloé", 14, 74);
  doc.text("Fecha Emisión: 27 de Mayo de 2026", 14, 79);

  doc.line(14, 84, 196, 84);

  // Tabla de Productos
  doc.setFont("helvetica", "bold");
  doc.text("Cód. Barra (SKU)", 14, 91);
  doc.text("Descripción del Producto", 60, 91);
  doc.text("Cant.", 145, 91);
  doc.text("Neto Unit.", 160, 91);
  doc.text("Total", 182, 91);

  doc.line(14, 94, 196, 94);
  doc.setFont("helvetica", "normal");

  const items = [
    { barcode: "7802050000201", desc: "Arroz Grano Largo Tucapel 1kg", qty: 25, price: 1200 },
    { barcode: "7801004000301", desc: "Detergente Líquido Omo Matic 3L", qty: 10, price: 7500 },
    { barcode: "7802215505716", desc: "Leche Descremada Blanca Colún 1L", qty: 48, price: 900 },
    { barcode: "7801810500124", desc: "Queso Gouda Laminado Soprole 250g", qty: 15, price: 2100 },
    { barcode: "2000000000018", desc: "Manzana Fuji (A granel)", qty: 30, price: 1000 }
  ];

  let y = 101;
  let netTotal = 0;

  items.forEach(item => {
    const total = item.qty * item.price;
    netTotal += total;

    doc.text(item.barcode, 14, y);
    doc.text(item.desc, 60, y);
    doc.text(item.qty.toString(), 148, y, { align: "right" });
    doc.text(`$${item.price.toLocaleString("es-CL")}`, 172, y, { align: "right" });
    doc.text(`$${total.toLocaleString("es-CL")}`, 196, y, { align: "right" });

    y += 8;
  });

  doc.line(14, y - 2, 196, y - 2);

  // Totales
  y += 5;
  const iva = Math.round(netTotal * 0.19);
  const totalAmount = netTotal + iva;

  doc.setFont("helvetica", "bold");
  doc.text("Monto Neto:", 140, y);
  doc.setFont("helvetica", "normal");
  doc.text(`$${netTotal.toLocaleString("es-CL")}`, 196, y, { align: "right" });

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("IVA (19%):", 140, y);
  doc.setFont("helvetica", "normal");
  doc.text(`$${iva.toLocaleString("es-CL")}`, 196, y, { align: "right" });

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Total Facturado:", 140, y);
  doc.text(`$${totalAmount.toLocaleString("es-CL")}`, 196, y, { align: "right" });

  // Timbre Electrónico SII (Simulado)
  y += 15;
  doc.setDrawColor(200, 0, 0);
  doc.rect(14, y, 70, 25);
  doc.setFontSize(8);
  doc.setTextColor(200, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("TIMBRE ELECTRÓNICO SII", 18, y + 6);
  doc.setFont("helvetica", "normal");
  doc.text("Res. N° 80 del 2026 - Verifique Documento", 18, y + 12);
  doc.text("en: www.sii.cl", 18, y + 18);

  const outputPath = path.join(__dirname, "..", "factura_prueba.pdf");
  const buffer = doc.output("arraybuffer");
  fs.writeFileSync(outputPath, Buffer.from(buffer));

  console.log(`Factura PDF generada exitosamente en: ${outputPath}`);
}

generateInvoice();
