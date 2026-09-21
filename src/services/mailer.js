const nodemailer = require('nodemailer');

function buildTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Envia el comprobante en PDF al correo del cliente.
 *
 * El texto/HTML esta escrito a proposito para verse como correo humano
 * normal (firma, sin lenguaje de plantilla generica) porque los filtros
 * de spam de Gmail son mas estrictos con cuentas nuevas que mandan
 * mensajes que se ven "automatizados". Con uso normal (bajo volumen,
 * destinatarios reales marcando "No es spam" las primeras veces) la
 * entregabilidad mejora con el tiempo.
 */
async function enviarComprobantePorCorreo({ to, numero, cliente_nombre, monto, moneda, pdfAbsolutePath }) {
  if (!to) {
    throw new Error('El cliente no tiene correo registrado, no se envio nada.');
  }

  const transporter = buildTransport();
  const fromName = process.env.SMTP_FROM_NAME || 'Contabilidad';
  const replyTo = process.env.SMTP_REPLY_TO || process.env.SMTP_USER;
  const montoFmt = `${moneda} ${Number(monto).toFixed(2)}`;

  const text =
    `Hola ${cliente_nombre},\n\n` +
    `Te confirmamos la recepcion de tu pago por ${montoFmt}. Adjunto encontraras el comprobante ${numero} en PDF para tu registro.\n\n` +
    `Cualquier consulta sobre este pago, responde directamente a este correo.\n\n` +
    `Saludos,\n${fromName}`;

  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;line-height:1.6;">` +
    `<p>Hola ${cliente_nombre},</p>` +
    `<p>Te confirmamos la recepción de tu pago por <b>${montoFmt}</b>. Adjunto encontrarás el comprobante <b>${numero}</b> en PDF para tu registro.</p>` +
    `<p>Cualquier consulta sobre este pago, responde directamente a este correo.</p>` +
    `<p>Saludos,<br/>${fromName}</p>` +
    `</div>`;

  await transporter.sendMail({
    from: `"${fromName}" <${process.env.SMTP_USER}>`,
    replyTo,
    to,
    subject: `Comprobante de pago ${numero}`,
    text,
    html,
    attachments: [
      {
        filename: `${numero}.pdf`,
        path: pdfAbsolutePath,
      },
    ],
  });
}

module.exports = { enviarComprobantePorCorreo };
