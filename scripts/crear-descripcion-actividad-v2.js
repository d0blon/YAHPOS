const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, AlignmentType } = require("docx");

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
            new TextRun({ text: "Giro SII: ", bold: true, size: 24, font: "Arial" }),
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
            new TextRun({ text: "DESCRIPCIÓN GENERAL DEL NEGOCIO", bold: true, size: 28, font: "Arial" }),
          ],
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "YAHPOS! es una plataforma integral de software tipo SaaS (Software as a Service) diseñada para comercios pequeños y medianos en Chile. La plataforma combina desarrollo de software a medida con servicios de consultoría informática e instalación de sistemas informáticos en los establecimientos comerciales de nuestros clientes.",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 200 },
        }),
        
        // SERVICIO 1: Consultoría de Informática
        new Paragraph({
          children: [
            new TextRun({ text: "1. ACTIVIDADES DE CONSULTORÍA DE INFORMÁTICA", bold: true, size: 26, font: "Arial" }),
          ],
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: "a) Desarrollo de Software SaaS", bold: true, size: 24, font: "Arial" }),
          ],
          spacing: { after: 100 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Desarrollo, mantenimiento y actualización continua de la plataforma YAHPOS!, que incluye los siguientes módulos:",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 150 },
        }),
        
        // Lista de módulos
        new Paragraph({
          children: [
            new TextRun({ text: "• Sistema de Punto de Venta (POS)", bold: true, size: 24, font: "Arial" }),
          ],
          spacing: { after: 100 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Software para gestionar ventas en tienda física, compatible con impresoras térmicas, lectores de código de barras, cajones monederos y pantallas de atención al cliente.",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 150 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: "• Facturación Electrónica integrada con el SII", bold: true, size: 24, font: "Arial" }),
          ],
          spacing: { after: 100 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Módulo que permite la emisión, timbrado y envío al SII de los siguientes documentos tributarios electrónicos:",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 100 },
        }),
        
        // Lista de documentos DTE
        new Paragraph({
          children: [
            new TextRun({ text: "  - Boleta Electrónica de Ventas y Servicios (Tipo 39)", size: 24, font: "Arial" }),
          ],
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "  - Boleta Exenta Electrónica (Tipo 41)", size: 24, font: "Arial" }),
          ],
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "  - Factura Electrónica (Tipo 33)", size: 24, font: "Arial" }),
          ],
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "  - Factura No Afecta o Exenta Electrónica (Tipo 34)", size: 24, font: "Arial" }),
          ],
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "  - Nota de Crédito Electrónica (Tipo 61)", size: 24, font: "Arial" }),
          ],
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "  - Nota de Débito Electrónica (Tipo 56)", size: 24, font: "Arial" }),
          ],
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "  - Guía de Despacho Electrónica (Tipo 52)", size: 24, font: "Arial" }),
          ],
          spacing: { after: 150 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: "• E-commerce Multi-Tenant", bold: true, size: 24, font: "Arial" }),
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
          spacing: { after: 150 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: "• Gestión de Inventario", bold: true, size: 24, font: "Arial" }),
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
          spacing: { after: 150 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: "b) Consultoría y Asesoría Informática", bold: true, size: 24, font: "Arial" }),
          ],
          spacing: { after: 100 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Asesoramiento a comercios sobre la digitalización de sus procesos de venta, gestión de inventario y cumplimiento tributario electrónico. Incluye capacitación en el uso de la plataforma y mejores prácticas de gestión comercial.",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 200 },
        }),
        
        // SERVICIO 2: Gestión de Instalaciones Informáticas
        new Paragraph({
          children: [
            new TextRun({ text: "2. GESTIÓN DE INSTALACIONES INFORMÁTICAS", bold: true, size: 26, font: "Arial" }),
          ],
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: "a) Instalación y Configuración del Software en el Cliente", bold: true, size: 24, font: "Arial" }),
          ],
          spacing: { after: 100 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "YAHPOS! ofrece el servicio de instalación y configuración de su plataforma en los establecimientos comerciales de los clientes. Este servicio incluye:",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 150 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: "Instalación Remota:", bold: true, size: 24, font: "Arial" }),
          ],
          spacing: { after: 100 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Configuración del software, creación de cuentas de usuario, parametrización del sistema (productos, precios, impuestos, usuarios, permisos) y capacitación inicial a través de videollamadas, acceso remoto y soporte telefónico. Este servicio se realiza de forma 100% remota para clientes en todo Chile.",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 150 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: "Instalación Presencial:", bold: true, size: 24, font: "Arial" }),
          ],
          spacing: { after: 100 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Para clientes que lo requieran, se ofrece el servicio de instalación presencial en el establecimiento comercial, que incluye:",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 100 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "  • Instalación del software en los equipos del cliente (computadores, tablets, etc.)",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "  • Configuración e instalación de hardware periférico: impresoras térmicas de tickets, lectores de código de barras, cajones monederos, pantallas de atención al cliente, balanzas",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "  • Configuración de red local para conexión entre equipos POS y servidor",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "  • Pruebas de funcionamiento de todos los equipos y software",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "  • Capacitación presencial al personal del establecimiento",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 150 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: "b) Soporte Técnico y Mantenimiento", bold: true, size: 24, font: "Arial" }),
          ],
          spacing: { after: 100 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Servicio de soporte técnico continuo para resolver incidencias, actualizar el software, realizar mantenimientos preventivos y correctivos de las instalaciones informáticas en los establecimientos de los clientes. El soporte se brinda de forma remota (teléfono, email, acceso remoto) y presencial cuando es necesario.",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 200 },
        }),
        
        // Clientes
        new Paragraph({
          children: [
            new TextRun({ text: "CLIENTES OBJETIVO", bold: true, size: 28, font: "Arial" }),
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
            new TextRun({ text: "MODELO DE NEGOCIO", bold: true, size: 28, font: "Arial" }),
          ],
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "YAHPOS! opera bajo un modelo de suscripción mensual (SaaS) por el uso de la plataforma de software. Adicionalmente, se cobra por los servicios de instalación y configuración (remota o presencial) cuando el cliente los requiere. Los clientes pagan una mensualidad que incluye acceso al POS, facturación electrónica, e-commerce, soporte técnico remoto y actualizaciones del software.",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 200 },
        }),
        
        // Operación
        new Paragraph({
          children: [
            new TextRun({ text: "CÓMO SE OPERA EL NEGOCIO", bold: true, size: 28, font: "Arial" }),
          ],
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "El desarrollo del software se realiza de forma remota desde el domicilio del contribuyente en Castro, Región de Los Lagos. El código fuente está alojado en servidores cloud (GitHub, Vercel, Supabase). La plataforma se distribuye vía internet a los clientes en todo Chile.",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "El contribuyente cuenta con equipos computacionales (notebook, monitores, periféricos) necesarios para el desarrollo y operación del software. La conexión a internet permite el acceso remoto a los servidores, la atención de clientes y la realización de instalaciones remotas.",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Las instalaciones presenciales se coordinan según la disponibilidad del cliente y se realizan en las comunas de Castro, Chonchi, Queilén, y otras comunas de la Región de Los Lagos, con posibilidad de expandirse a otras regiones según la demanda.",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 400 },
        }),
        
        // Correspondencia con el giro
        new Paragraph({
          children: [
            new TextRun({ text: "CORRESPONDENCIA CON EL GIRO 620200", bold: true, size: 28, font: "Arial" }),
          ],
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Las actividades descritas anteriormente corresponden plenamente al giro 620200 - \"Actividades de Consultoría de Informática y de Gestión de Instalaciones Informáticas\", ya que:",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 150 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "• Se realiza consultoría informática a través del asesoramiento en digitalización de comercios y capacitación en el uso de software.",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "• Se gestiona la instalación de sistemas informáticos completos (software + hardware periférico) en los establecimientos comerciales de los clientes, tanto de forma remota como presencial.",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "• Se brinda soporte técnico y mantenimiento continuo de las instalaciones informáticas en los locales de los clientes.",
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { after: 400 },
        }),
        
        // Declaración
        new Paragraph({
          children: [
            new TextRun({ text: "DECLARACIÓN", bold: true, size: 28, font: "Arial" }),
          ],
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Declaro que la información proporcionada en este documento es fiel a la realidad y que efectivamente realizo las actividades económicas descritas bajo el giro 620200 - Actividades de Consultoría de Informática y de Gestión de Instalaciones Informáticas. Me comprometo a aportar todos los antecedentes que el Servicio de Impuestos Internos requiera para acreditar lo señalado.",
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
