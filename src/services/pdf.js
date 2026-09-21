const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const PDFS_DIR = path.join(__dirname, '..', '..', 'data', 'pdfs');
const FONTS_DIR = path.join(__dirname, '..', 'assets', 'fonts');

if (!fs.existsSync(PDFS_DIR)) {
  fs.mkdirSync(PDFS_DIR, { recursive: true });
}

// ===== Paleta de marca (misma que el front-end) =====
const COLOR = {
  ink: '#15181D',
  inkSoft: '#6B6558',
  faint: '#A39C8C',
  sidebar: '#14231D',
  accent: '#1B6B4F',
  accentSoft: '#E4F0EA',
  border: '#E2DDD1',
  borderSoft: '#EEEAE0',
  cream: '#F5F3EE',
  white: '#FFFFFF',
};

const FONT = {
  heading: 'SpaceGrotesk-SemiBold',
  headingBold: 'SpaceGrotesk-Bold',
  headingMedium: 'SpaceGrotesk-Medium',
  body: 'IBMPlexSans-Regular',
  bodyMedium: 'IBMPlexSans-Medium',
  bodySemiBold: 'IBMPlexSans-SemiBold',
};

function registrarFuentes(doc) {
  doc.registerFont(FONT.heading, path.join(FONTS_DIR, 'SpaceGrotesk-SemiBold.ttf'));
  doc.registerFont(FONT.headingBold, path.join(FONTS_DIR, 'SpaceGrotesk-Bold.ttf'));
  doc.registerFont(FONT.headingMedium, path.join(FONTS_DIR, 'SpaceGrotesk-Medium.ttf'));
  doc.registerFont(FONT.body, path.join(FONTS_DIR, 'IBMPlexSans-Regular.ttf'));
  doc.registerFont(FONT.bodyMedium, path.join(FONTS_DIR, 'IBMPlexSans-Medium.ttf'));
  doc.registerFont(FONT.bodySemiBold, path.join(FONTS_DIR, 'IBMPlexSans-SemiBold.ttf'));
}

function formatMonto(monto, moneda) {
  return `${moneda} ${Number(monto).toFixed(2)}`;
}

function etiqueta(doc, texto, x, y, opts = {}) {
  doc
    .font(FONT.bodySemiBold)
    .fontSize(8.5)
    .fillColor(COLOR.inkSoft)
    .text(texto.toUpperCase(), x, y, { characterSpacing: 0.6, ...opts });
}

function divider(doc, x, y, width) {
  doc.moveTo(x, y).lineTo(x + width, y).lineWidth(1).strokeColor(COLOR.borderSoft).stroke();
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
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const stream = fs.createWriteStream(absolutePath);
    doc.pipe(stream);
    registrarFuentes(doc);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const marginX = 56;
    const cardW = pageW - marginX * 2;

    // ===== Fondo de pagina =====
    doc.rect(0, 0, pageW, pageH).fill(COLOR.cream);

    // ===== Encabezado (banda de marca) =====
    const headerH = 118;
    doc.rect(0, 0, pageW, headerH).fill(COLOR.sidebar);

    doc
      .font(FONT.headingBold)
      .fontSize(19)
      .fillColor(COLOR.white)
      .text('RECIBERA', marginX, 42, { characterSpacing: 0.5 });
    doc
      .rect(marginX, 68, 26, 3)
      .fill(COLOR.accent);

    doc
      .font(FONT.bodySemiBold)
      .fontSize(9)
      .fillColor('#9FB3A8')
      .text('COMPROBANTE DE PAGO', 0, 44, { width: pageW - marginX, align: 'right', characterSpacing: 0.8 });
    doc
      .font(FONT.headingMedium)
      .fontSize(15)
      .fillColor(COLOR.white)
      .text(numero, 0, 60, { width: pageW - marginX, align: 'right' });

    // ===== Tarjeta principal =====
    const cardY = headerH + 36;
    const cardPad = 34;
    let cursorY = cardY + cardPad;

    doc
      .roundedRect(marginX, cardY, cardW, 430, 12)
      .fillAndStroke(COLOR.white, COLOR.border);

    const innerX = marginX + cardPad;
    const innerW = cardW - cardPad * 2;

    // Numero / Fecha
    etiqueta(doc, 'Numero', innerX, cursorY);
    etiqueta(doc, 'Fecha', innerX, cursorY, { width: innerW, align: 'right' });
    cursorY += 13;
    doc.font(FONT.heading).fontSize(13).fillColor(COLOR.ink).text(numero, innerX, cursorY);
    doc
      .font(FONT.body)
      .fontSize(11)
      .fillColor(COLOR.ink)
      .text(new Date(fecha).toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' }), innerX, cursorY + 1, {
        width: innerW,
        align: 'right',
      });

    cursorY += 34;
    divider(doc, innerX, cursorY, innerW);
    cursorY += 22;

    // Cliente
    etiqueta(doc, 'Cliente', innerX, cursorY);
    cursorY += 13;
    doc.font(FONT.bodySemiBold).fontSize(12).fillColor(COLOR.ink).text(cliente_nombre, innerX, cursorY, { width: innerW });
    cursorY = doc.y + 2;
    if (cliente_doc) {
      doc.font(FONT.body).fontSize(10.5).fillColor(COLOR.inkSoft).text(`Documento: ${cliente_doc}`, innerX, cursorY, { width: innerW });
      cursorY = doc.y + 1;
    }
    if (cliente_email) {
      doc.font(FONT.body).fontSize(10.5).fillColor(COLOR.inkSoft).text(cliente_email, innerX, cursorY, { width: innerW });
      cursorY = doc.y + 1;
    }

    cursorY += 18;
    divider(doc, innerX, cursorY, innerW);
    cursorY += 22;

    // Concepto
    etiqueta(doc, 'Concepto', innerX, cursorY);
    cursorY += 13;
    doc.font(FONT.body).fontSize(11.5).fillColor(COLOR.ink).text(concepto, innerX, cursorY, { width: innerW, lineGap: 2 });
    cursorY = doc.y;

    if (metodo_pago) {
      cursorY += 10;
      doc.font(FONT.body).fontSize(10.5).fillColor(COLOR.inkSoft).text(`Metodo de pago: ${metodo_pago}`, innerX, cursorY, { width: innerW });
      cursorY = doc.y;
    }

    cursorY += 20;
    divider(doc, innerX, cursorY, innerW);
    cursorY += 24;

    // Total
    doc
      .font(FONT.body)
      .fontSize(11)
      .fillColor(COLOR.inkSoft)
      .text('Total pagado', innerX, cursorY + 8);
    doc
      .font(FONT.headingBold)
      .fontSize(24)
      .fillColor(COLOR.accent)
      .text(formatMonto(monto, moneda), innerX, cursorY, { width: innerW, align: 'right' });

    // ===== Pie de pagina =====
    const footerY = cardY + 430 + 26;
    doc
      .font(FONT.body)
      .fontSize(9)
      .fillColor(COLOR.faint)
      .text('Este documento es un comprobante interno y no constituye factura electronica autorizada por el SRI.', marginX, footerY, {
        width: cardW,
        align: 'center',
      });
    doc
      .font(FONT.body)
      .fontSize(8.5)
      .fillColor(COLOR.faint)
      .text('Generado automaticamente por Recibera', marginX, footerY + 16, { width: cardW, align: 'center' });

    doc.end();

    stream.on('finish', () => resolve({ relativePath, absolutePath }));
    stream.on('error', reject);
  });
}

module.exports = { generarComprobantePDF, PDFS_DIR };
