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
 */
async function enviarComprobantePorCorreo({ to, numero, cliente_nombre, monto, moneda, pdfAbsolutePath }) {
  if (!to) {
    throw new Error('El cliente no tiene correo registrado, no se envio nada.');
  }

  const transporter = buildTransport();
  const fromName = process.env.SMTP_FROM_NAME || 'Contabilidad';

  await transporter.sendMail({
    from: `"${fromName}" <${process.env.SMTP_USER}>`,
    to,
    subject: `Comprobante de pago ${numero}`,
    text: `Hola ${cliente_nombre},\n\nAdjuntamos tu comprobante de pago ${numero} por un monto de ${moneda} ${Number(monto).toFixed(2)}.\n\nGracias.`,
    attachments: [
      {
        filename: `${numero}.pdf`,
        path: pdfAbsolutePath,
      },
    ],
  });
}

module.exports = { enviarComprobantePorCorreo };
