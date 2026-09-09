const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const PDFS_DIR = path.join(__dirname, '..', '..', 'data', 'pdfs');

if (!fs.existsSync(PDFS_DIR)) {
  fs.mkdirSync(PDFS_DIR, { recursive: true });
}

function formatMonto(monto, moneda) {
  const n = Number(monto).toFixed(2);
  return `${moneda} ${n}`;
}

/**
 * Genera el PDF del comprobante y lo guarda en disco.
 * Devuelve la ruta relativa (para guardar en la BD) y la ruta absoluta.
 */
function generarComprobantePDF(comprobante) {
  const {
    numero,
    fecha,
    cliente_nombre,
    cliente_email,
    cliente_doc,
    concepto,
    monto,
    moneda,
    metodo_pago,
  } = comprobante;

  const fileName = `${numero}.pdf`;
  const relativePath = fileName;
  const absolutePath = path.join(PDFS_DIR, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(absolutePath);
    doc.pipe(stream);

    // Encabezado
    doc
      .fontSize(20)
      .text('Comprobante de Pago', { align: 'center' })
      .moveDown(0.3);

    doc
      .fontSize(10)
      .fillColor('#555555')
      .text('Este documento es un comprobante interno, no constituye factura electronica autorizada por el SRI.', {
        align: 'center',
      })
      .fillColor('black')
      .moveDown(1.5);

    doc.fontSize(12).text(`Numero: ${numero}`);
    doc.text(`Fecha: ${new Date(fecha).toLocaleDateString('es-EC')}`);
    doc.moveDown();

    doc.fontSize(13).text('Datos del cliente', { underline: true });
    doc.fontSize(11).moveDown(0.3);
    doc.text(`Nombre: ${cliente_nombre}`);
    if (cliente_doc) doc.text(`Documento: ${cliente_doc}`);
    if (cliente_email) doc.text(`Correo: ${cliente_email}`);
    doc.moveDown();

    doc.fontSize(13).text('Detalle del pago', { underline: true });
    doc.fontSize(11).moveDown(0.3);
    doc.text(`Concepto: ${concepto}`);
    if (metodo_pago) doc.text(`Metodo de pago: ${metodo_pago}`);
    doc.moveDown();

    doc
      .fontSize(16)
      .text(`Total pagado: ${formatMonto(monto, moneda)}`, { align: 'right' });

    doc.moveDown(2);
    doc
      .fontSize(9)
      .fillColor('#888888')
      .text('Generado automaticamente por Recibera.', { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve({ relativePath, absolutePath }));
    stream.on('error', reject);
  });
}

module.exports = { generarComprobantePDF, PDFS_DIR };
