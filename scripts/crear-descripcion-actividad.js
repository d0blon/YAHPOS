const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Heading, UnderlineType } = require("docx");

const doc = new Document({
  sections: [
    {
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
      },
      children: [
        // Título
        new Paragraph({
          children: [
            new TextRun({
              text: "DESCRIPCIÓN DE ACTIVIDAD ECONÓMICA",
              bold: true,
              size: 32,
              font: "Arial",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        
        // Datos del contribuyente
        new Paragraph({
          children: [
            new TextRun({ text: "Contribuyente: ", bold: true, size: 24, font: "Arial" }),
            new TextRun({ text: "Rodrigo Alejandro Nuñez Chaura", size: 24, font: "Arial" }),
          ],
          spacing: { after: 100 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: "RUT: ", bold: true, size: 24, font: "Arial" }),
            new TextRun({ text: "21.012.281-8", size: 24, font: "Arial" }),
          ],
          spacing: { after: 100 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: "Giro: ", bold: true, size: 24, font: "Arial" }),
            new TextRun({ text: "620200 - Actividades de Consultoría de Informática y de Gestión de Instalaciones Informáticas", size: 24, font: "Arial" }),
          ],
          spacing: { after: 100 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: "Nombre Comercial: ", bold: true, size: 24, font: "Arial" }),
            new TextRun({ text: "YAHPOS!", size: 24, font: "Arial" }),
          ],
          spacing: { after: 100 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: "Sitio Web: ", bold: true, size: 24, font: "Arial" }),
            new TextRun({ text: "yahpos.cl", size: 24, font: "Arial" }),
          ],
          spacing: { after: 400 },
        }),
        
        // Descripción del negocio
        new Paragraph({
          children: [
            new TextRun({ text: "DESCRIPCIÓN DEL NEGOCIO", bold: true, size: 28, font: "Arial", underline: {} }),
          ],
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "YAHPOS! es una plataforma de software tipo SaaS (Software as a Service) diseñada para comercios pequeños y medianos en Chile. La plataforma permite a los comerciantes gestionar sus ventas, inventario, punto de venta (POS) y facturación electrónica de manera integrada.",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 200 },
        }),
        
        // Productos y servicios
        new Paragraph({
          children: [
            new TextRun({ text: "PRODUCTOS Y SERVICIOS OFRECIDOS", bold: true, size: 28, font: "Arial", underline: {} }),
          ],
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: "1. Sistema de Punto de Venta (POS)", bold: true, size: 24, font: "Arial" }),
          ],
          spacing: { after: 100 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Software para gestionar ventas en tienda física, compatible con impresoras térmicas, lectores de código de barras y cajones monederos.",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: "2. Facturación Electrónica SII", bold: true, size: 24, font: "Arial" }),
          ],
          spacing: { after: 100 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Módulo integrado para emitir boletas electrónicas, facturas electrónicas, notas de crédito, notas de débito y guías de despacho, cumpliendo con todas las normativas del Servicio de Impuestos Internos de Chile.",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: "3. E-commerce Multi-Tenant", bold: true, size: 24, font: "Arial" }),
          ],
          spacing: { after: 100 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Plataforma de comercio electrónico que permite a los comercios vender online con sincronización automática de inventario con el POS físico.",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: "4. Gestión de Inventario", bold: true, size: 24, font: "Arial" }),
          ],
          spacing: { after: 100 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Sistema de control de stock en tiempo real, alertas de stock bajo, gestión de proveedores y reportes de inventario.",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 200 },
        }),
        
        // Clientes objetivo
        new Paragraph({
          children: [
            new TextRun({ text: "CLIENTES OBJETIVO", bold: true, size: 28, font: "Arial", underline: {} }),
          ],
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Comercios pequeños y medianos en Chile, incluyendo: tiendas de barrio, minimarkets, ferreterías, tiendas de ropa, restaurantes, cafeterías, y cualquier negocio que necesite gestionar ventas físicas y online con facturación electrónica.",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 200 },
        }),
        
        // Modelo de negocio
        new Paragraph({
          children: [
            new TextRun({ text: "MODELO DE NEGOCIO", bold: true, size: 28, font: "Arial", underline: {} }),
          ],
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "YAHPOS! opera bajo un modelo de suscripción mensual (SaaS). Los clientes pagan una mensualidad por el uso de la plataforma, que incluye acceso al POS, facturación electrónica, e-commerce y soporte técnico. No se venden productos físicos, solo servicios de software.",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 200 },
        }),
        
        // Operación
        new Paragraph({
          children: [
            new TextRun({ text: "CÓMO SE OPERA EL NEGOCIO", bold: true, size: 28, font: "Arial", underline: {} }),
          ],
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "El desarrollo del software se realiza de forma remota desde el domicilio del contribuyente en Castro, Región de Los Lagos. El código fuente está alojado en servidores cloud (GitHub, Vercel). La plataforma se distribuye vía internet a los clientes en todo Chile. El soporte técnico se brinda de forma remota mediante email, teléfono y videollamadas.",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "El contribuyente cuenta con equipos computacionales (notebook, monitores, periféricos) necesarios para el desarrollo y operación del software. La conexión a internet permite el acceso remoto a los servidores y la atención de clientes.",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 400 },
        }),
        
        // Declaración
        new Paragraph({
          children: [
            new TextRun({ text: "DECLARACIÓN", bold: true, size: 28, font: "Arial", underline: {} }),
          ],
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Declaro que la información proporcionada en este documento es fiel a la realidad y que efectivamente realizo las actividades económicas descritas bajo el giro 620200 - Actividades de Consultoría de Informática y de Gestión de Instalaciones Informáticas.",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 600 },
        }),
        
        // Firma
        new Paragraph({
          children: [
            new TextRun({ text: "_____________________________", size: 24, font: "Arial" }),
          ],
          spacing: { after: 100 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: "Rodrigo Alejandro Nuñez Chaura", bold: true, size: 24, font: "Arial" }),
          ],
          spacing: { after: 100 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: "RUT: 21.012.281-8", size: 24, font: "Arial" }),
          ],
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: "Castro, 16 de noviembre de 2026", size: 24, font: "Arial" }),
          ],
        }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("descripcion_actividad_yahpos.docx", buffer);
  console.log("Documento generado: descripcion_actividad_yahpos.docx");
});
