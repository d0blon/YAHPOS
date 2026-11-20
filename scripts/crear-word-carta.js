const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require("docx");

const doc = new Document({
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: 1440,
            bottom: 1440,
            left: 1440,
            right: 1440,
          },
        },
      },
      children: [
        // Título
        new Paragraph({
          children: [
            new TextRun({
              text: "CERTIFICADO DE CESIÓN DE USO DE INMUEBLE",
              bold: true,
              size: 32,
              font: "Arial",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        
        new Paragraph({
          children: [new TextRun("")],
          spacing: { after: 200 },
        }),
        
        // Cuerpo del documento
        new Paragraph({
          children: [
            new TextRun({
              text: "Yo, Angelica Yenny Chaura Perez, en mi calidad de propietaria del inmueble ubicado en Ernesto Novoa S/N, Gamboa Alto, Rol de avalúo 01212-00072, Comuna de Castro, Región de Los Lagos,",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "CERTIFICO que cedo a título gratuito a mi hijo:",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 300 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Rodrigo Alejandro Nuñez Chaura",
              bold: true,
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 100 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "RUT: 21.012.281-8",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 300 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "el uso del inmueble antes señalado, con el fin de que desarrolle en él sus actividades económicas independientes.",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Lo anterior para ser presentado ante el Servicio de Impuestos Internos.",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 600 },
        }),
        
        // Fecha
        new Paragraph({
          children: [
            new TextRun({
              text: "Castro, 15 de noviembre de 2026",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 800 },
        }),
        
        // Firma
        new Paragraph({
          children: [
            new TextRun({
              text: "_____________________________",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 100 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Firma",
              size: 20,
              font: "Arial",
            }),
          ],
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Angelica Yenny Chaura Perez",
              bold: true,
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 100 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "RUT: 13.854.207-6",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 100 },
        }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("certificado_cesion.docx", buffer);
  console.log("Word generado: certificado_cesion.docx");
});
