const { jsPDF } = require("jspdf");

const pdf = new jsPDF({
  orientation: "portrait",
  unit: "mm",
  format: "a4",
});

const pageWidth = 210;
const margin = 25;
let y = 25;

// Función helper para líneas
function addLine(text, fontSize = 12, align = "left", bold = false) {
  pdf.setFontSize(fontSize);
  pdf.setFont("times", bold ? "bold" : "normal");
  pdf.text(text, align === "center" ? pageWidth / 2 : margin, y, {
    align: align === "center" ? "center" : "left",
    maxWidth: pageWidth - margin * 2,
  });
  y += fontSize * 0.55;
}

function addBlankSpace(mm = 6) {
  y += mm;
}

// Título
addLine("CERTIFICADO DE CESIÓN DE USO DE INMUEBLE", 16, "center", true);
addBlankSpace(12);

// Cuerpo
addLine(
  "Yo, Angelica Yenny Chaura Perez, en mi calidad de propietaria del inmueble ubicado en",
  12
);
addBlankSpace(2);
addLine("Ernesto Novoa S/N, Gamboa Alto, Rol de avalúo 01212-00072,", 12);
addLine("Comuna de Castro, Región de Los Lagos,", 12);
addBlankSpace(4);
addLine("CERTIFICO que cedo a título gratuito a mi hijo:", 12);
addBlankSpace(4);
addLine("Rodrigo Alejandro Nuñez Chaura", 12, "left", true);
addLine("RUT: 21.012.281-8", 12);
addBlankSpace(4);
addLine(
  "el uso del inmueble antes señalado, con el fin de que desarrolle en él sus",
  12
);
addLine("actividades económicas independientes.", 12);
addBlankSpace(4);
addLine(
  "Lo anterior para ser presentado ante el Servicio de Impuestos Internos.",
  12
);
addBlankSpace(10);

// Fecha y firma
addLine("Castro, 15 de noviembre de 2026", 12);
addBlankSpace(20);

addLine("_____________________________", 12);
addLine("Firma", 10, "left");
addBlankSpace(2);
addLine("Angelica Yenny Chaura Perez", 12, "left", true);
addLine("RUT: 13.854.207-6", 12);

// Guardar
pdf.save("certificado_cesion.pdf");
console.log("PDF generado: certificado_cesion.pdf");
