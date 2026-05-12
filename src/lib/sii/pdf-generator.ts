import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import iconv from 'iconv-lite';

export interface BoletaPdfData {
  folio: number;
  fecha: string;
  total: number;
  items: Array<{
    nombre: string;
    cantidad: number;
    precio: number;
    total: number;
  }>;
  emisor: {
    razonSocial: string;
    rut: string;
    giro: string;
    direccion: string;
    logoUrl?: string;
  };
  receptor?: {
    rut: string;
    nombre?: string;
  };
  timbre?: string;
  receipt?: {
    message: string;
    showLogo: boolean;
    logoUrl?: string;
    colorMode: 'bw' | 'color';
    showPoweredBy: boolean;
    poweredByText: string;
    showLoyalty?: boolean;
    loyaltyName?: string;
    pointsEarned?: number;
    pointsRedeemed?: number;
  };
}

// Función para cargar imagen en B&N (Safe for Server)
async function loadImageBW(url: string): Promise<string> {
  if (typeof window === 'undefined') {
    // En el servidor, retornamos la URL tal cual. 
    // jsPDF intentará cargarla o fallará silenciosamente.
    return url;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        
        // Convertir a B&N
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          const avg = (imageData.data[i] + imageData.data[i+1] + imageData.data[i+2]) / 3;
          imageData.data[i] = imageData.data[i+1] = imageData.data[i+2] = avg;
        }
        ctx.putImageData(imageData, 0, 0);
        
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(url);
      img.src = url;
    } catch (err) {
      resolve(url);
    }
  });
}

export async function generateBoletaPdf(data: BoletaPdfData): Promise<Uint8Array> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 200],
  });

  let y = 8;
  const centerX = 40;
  const margin = 4;
  const fullWidth = 72;

  // --- LOGO DE LA TIENDA (B&N) ---
  if (data.receipt?.showLogo && (data.receipt.logoUrl || data.emisor.logoUrl)) {
    try {
      const logoUrl = data.receipt.logoUrl || data.emisor.logoUrl;
      const logoDataUrl = await loadImageBW(logoUrl!);
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', centerX - 15, y, 30, 15);
        y += 18;
      }
    } catch (err) {
      console.error('Error cargando logo:', err);
    }
  }

  // --- ENCABEZADO CON BORDE DOBLE ---
  y += 2;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  // Borde exterior
  doc.rect(margin, y, fullWidth, 22);
  // Borde interior (efecto doble)
  doc.rect(margin + 1, y + 1, fullWidth - 2, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(data.emisor.razonSocial.toUpperCase(), centerX, y + 7, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`RUT: ${data.emisor.rut}`, centerX, y + 11, { align: 'center' });
  doc.text(data.emisor.giro, centerX, y + 15, { align: 'center', maxWidth: fullWidth - 4 });
  doc.text(data.emisor.direccion, centerX, y + 19, { align: 'center', maxWidth: fullWidth - 4 });
  
  y += 26;
  // --- RECUADRO ROJO SII (Diseño especial) ---
  doc.setDrawColor(255, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, fullWidth, 16);
  
  // Bordes decorativos internos
  doc.setLineWidth(0.2);
  doc.rect(margin + 2, y + 2, fullWidth - 4, 12);
  
  doc.setTextColor(255, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('█ BOLETA ELECTRÓNICA █', centerX, y + 7, { align: 'center' });
  doc.setFontSize(8);
  doc.text(`N° ${data.folio}`, centerX, y + 13, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  
  y += 20;
  // --- DATOS DOCUMENTO ---
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${data.fecha}`, margin + 2, y);
  y += 5;
  if (data.receptor?.rut && data.receptor.rut !== '66666666-6') {
    doc.text(`RUT Cliente: ${data.receptor.rut}`, margin + 2, y);
    if (data.receptor.nombre) {
      y += 4;
      doc.text(`Titular: ${data.receptor.nombre}`, margin + 2, y);
    }
    y += 5;
  }
  y += 3;
  // --- DETALLE DE ITEMS ---
  doc.setFont('helvetica', 'bold');
  doc.text('ITEM', margin + 2, y);
  doc.text('TOTAL', margin + fullWidth - 2, y, { align: 'right' });
  
  y += 2;
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + fullWidth, y);
  y += 4;
  
  doc.setFont('helvetica', 'normal');
  data.items.forEach((item) => {
    const itemLabel = `${item.cantidad} x ${item.nombre}`;
    const lines = doc.splitTextToSize(itemLabel, fullWidth - 20);
    doc.text(lines, margin + 2, y);
    doc.text(`$${item.total.toLocaleString('es-CL')}`, margin + fullWidth - 2, y, { align: 'right' });
    y += (lines.length * 4);
  });
  y += 2;
  doc.line(margin, y, margin + fullWidth, y);
  y += 5;
  // --- TOTALES ---
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', margin + 10, y);
  doc.text(`$${data.total.toLocaleString('es-CL')}`, margin + fullWidth - 2, y, { align: 'right' });
  
  y += 10;
  // --- TIMBRE ELECTRÓNICO (TED) ---
  if (data.timbre) {
    try {
      // Importante: El contenido del QR (TED) debe estar en ISO-8859-1
      const encodedTimbre = iconv.encode(data.timbre, 'ISO-8859-1');
      
      const qrDataUrl = await QRCode.toDataURL([{ data: encodedTimbre, mode: 'byte' }], {
        margin: 1,
        width: 150,
        errorCorrectionLevel: 'M'
      });
       
      doc.addImage(qrDataUrl, 'PNG', centerX - 20, y, 40, 40);
      y += 42;
       
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('Timbre Electrónico SII', centerX, y, { align: 'center' });
      y += 3;
      doc.text('Res. 80 del 2014 - Verifique en www.sii.cl', centerX, y, { align: 'center' });
    } catch (err) {
      console.error('Error generando QR:', err);
    }
  }

  // --- SECCIÓN FIDELIZACIÓN (Diseño con estrellas) ---
  if (data.receipt?.showLoyalty && (data.receipt.pointsEarned || data.receipt.pointsRedeemed)) {
    y += 5;
    doc.setLineWidth(0.2);
    doc.line(margin, y, margin + fullWidth, y);
    y += 4;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`★ ${data.receipt.loyaltyName?.toUpperCase() || 'PUNTOS'} ★`, centerX, y, { align: 'center' });
    y += 4;
    
    doc.setFont('helvetica', 'normal');
    if (data.receipt.pointsEarned) {
      doc.text(`GANASTE: +${data.receipt.pointsEarned} pts`, centerX, y, { align: 'center' });
      y += 4;
    }
    if (data.receipt.pointsRedeemed) {
      doc.text(`CANJEASTE: -${data.receipt.pointsRedeemed} pts`, centerX, y, { align: 'center' });
      y += 4;
    }
  }

  // --- MENSAJE PERSONALIZADO ---
  y += 6;
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + fullWidth, y);
  y += 5;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(data.receipt?.message || '¡Gracias por su compra!', centerX, y, { align: 'center' });

  // --- POWERED BY YAHPOS.CL ---
  if (data.receipt?.showPoweredBy !== false) {
    y += 8;
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text(data.receipt?.poweredByText || 'Powered by YAHPOS!.cl', centerX, y, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  return new Uint8Array(doc.output('arraybuffer'));
}
