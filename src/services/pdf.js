const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const PDFS_DIR = path.join(__dirname, '..', '..', 'data', 'pdfs');
const FONTS_DIR = path.join(__dirname, '..', 'assets', 'fonts');
const WATERMARK_PATH = path.join(__dirname, '..', 'assets', 'images', 'bqc-watermark.png');

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
    programa_academico,
    concepto,
    valor_venta,
    monto,
    saldo,
    moneda,
    metodo_pago,
  } = comprobante;

  const tieneValorVentaOSaldo =
    (valor_venta !== null && valor_venta !== undefined) || (saldo !== null && saldo !== undefined);
  const tieneProgramaAcademico = Boolean(programa_academico);

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
      .fontSize(17)
      .fillColor(COLOR.white)
      .text('BQC Comprobante', marginX, 42, { characterSpacing: 0.3 });
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
    const cardH = 430 + (tieneValorVentaOSaldo ? 48 : 0) + (tieneProgramaAcademico ? 34 : 0);
    let cursorY = cardY + cardPad;

    doc
      .roundedRect(marginX, cardY, cardW, cardH, 12)
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
      doc.font(FONT.body).fontSize(10.5).fillColor(COLOR.inkSoft).text(`Cedula de Identidad: ${cliente_doc}`, innerX, cursorY, { width: innerW });
      cursorY = doc.y + 1;
    }
    if (cliente_email) {
      doc.font(FONT.body).fontSize(10.5).fillColor(COLOR.inkSoft).text(cliente_email, innerX, cursorY, { width: innerW });
      cursorY = doc.y + 1;
    }

    cursorY += 18;
    divider(doc, innerX, cursorY, innerW);
    cursorY += 22;

    // Programa academico (opcional)
    if (tieneProgramaAcademico) {
      etiqueta(doc, 'Programa academico', innerX, cursorY);
      cursorY += 13;
      doc.font(FONT.bodyMedium).fontSize(11.5).fillColor(COLOR.ink).text(programa_academico, innerX, cursorY, { width: innerW });
      cursorY = doc.y + 14;
    }

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
    cursorY += 22;

    // Valor de venta / Saldo (opcionales)
    if (tieneValorVentaOSaldo) {
      etiqueta(doc, 'Valor de venta', innerX, cursorY);
      etiqueta(doc, 'Saldo', innerX, cursorY, { width: innerW, align: 'right' });
      cursorY += 13;
      doc
        .font(FONT.bodySemiBold)
        .fontSize(12)
        .fillColor(COLOR.ink)
        .text(valor_venta !== null && valor_venta !== undefined ? formatMonto(valor_venta, moneda) : '—', innerX, cursorY);
      doc
        .font(FONT.bodySemiBold)
        .fontSize(12)
        .fillColor(COLOR.ink)
        .text(saldo !== null && saldo !== undefined ? formatMonto(saldo, moneda) : '—', innerX, cursorY, {
          width: innerW,
          align: 'right',
        });
      cursorY += 26;
      divider(doc, innerX, cursorY, innerW);
      cursorY += 24;
    }

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

    // ===== Marca de agua (anti-falsificacion) =====
    if (fs.existsSync(WATERMARK_PATH)) {
      const wmW = 440;
      const wmH = wmW * (533 / 923);
      const wmX = (pageW - wmW) / 2;
      const wmY = cardY + (cardH - wmH) / 2;
      doc.image(WATERMARK_PATH, wmX, wmY, { width: wmW, height: wmH });
    }

    // ===== Pie de pagina =====
    const footerY = cardY + cardH + 26;
    doc
      .font(FONT.bodySemiBold)
      .fontSize(9.5)
      .fillColor(COLOR.inkSoft)
      .text('BQC - SOLO EL CIELO ES EL LIMITE', marginX, footerY, {
        width: cardW,
        align: 'center',
        characterSpacing: 0.4,
      });
    doc
      .font(FONT.body)
      .fontSize(8.5)
      .fillColor(COLOR.faint)
      .text('Direccion: Teofilo Saenza y Eduardo Kigman - Riobamba - Ecuador.', marginX, footerY + 15, {
        width: cardW,
        align: 'center',
      });

    doc.end();

    stream.on('finish', () => resolve({ relativePath, absolutePath }));
    stream.on('error', reject);
  });
}

module.exports = { generarComprobantePDF, PDFS_DIR };
