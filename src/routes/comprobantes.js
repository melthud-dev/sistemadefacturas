const express = require('express');
const path = require('path');
const { pool } = require('../db');
const { generarComprobantePDF, PDFS_DIR } = require('../services/pdf');
const { enviarComprobantePorCorreo } = require('../services/mailer');

const router = express.Router();

// Listado (pagina principal)
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM comprobantes ORDER BY created_at DESC LIMIT 200'
  );
  res.render('lista', { comprobantes: rows });
});

// Formulario de nuevo comprobante
router.get('/nuevo', (req, res) => {
  res.render('nuevo', { error: null, form: {} });
});

// Crear comprobante: genera numero, PDF, guarda en BD, intenta enviar correo
router.post('/', async (req, res) => {
  const {
    cliente_nombre,
    cliente_email,
    cliente_doc,
    concepto,
    monto,
    moneda,
    metodo_pago,
  } = req.body;

  if (!cliente_nombre || !concepto || !monto) {
    return res.status(400).render('nuevo', {
      error: 'Nombre del cliente, concepto y monto son obligatorios.',
      form: req.body,
    });
  }

  const montoNum = Number(monto);
  if (Number.isNaN(montoNum) || montoNum <= 0) {
    return res.status(400).render('nuevo', {
      error: 'El monto debe ser un numero mayor a 0.',
      form: req.body,
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const seqResult = await client.query("SELECT nextval('comprobantes_numero_seq') AS n");
    const numero = `COMP-${String(seqResult.rows[0].n).padStart(6, '0')}`;

    const { relativePath, absolutePath } = await generarComprobantePDF({
      numero,
      fecha: new Date(),
      cliente_nombre,
      cliente_email,
      cliente_doc,
      concepto,
      monto: montoNum,
      moneda: moneda || 'USD',
      metodo_pago,
    });

    const insertResult = await client.query(
      `INSERT INTO comprobantes
        (numero, cliente_nombre, cliente_email, cliente_doc, concepto, monto, moneda, metodo_pago, pdf_path, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        numero,
        cliente_nombre,
        cliente_email || null,
        cliente_doc || null,
        concepto,
        montoNum,
        moneda || 'USD',
        metodo_pago || null,
        relativePath,
        req.session.userId,
      ]
    );

    await client.query('COMMIT');

    const comprobante = insertResult.rows[0];

    // El envio de correo no revierte la creacion del comprobante si falla.
    if (cliente_email) {
      try {
        await enviarComprobantePorCorreo({
          to: cliente_email,
          numero,
          cliente_nombre,
          monto: montoNum,
          moneda: moneda || 'USD',
          pdfAbsolutePath: absolutePath,
        });
        await pool.query(
          "UPDATE comprobantes SET estado = 'enviado', enviado_email = true WHERE id = $1",
          [comprobante.id]
        );
      } catch (mailErr) {
        console.error('Error enviando correo', mailErr);
        await pool.query(
          "UPDATE comprobantes SET estado = 'error_envio', error_envio = $2 WHERE id = $1",
          [comprobante.id, mailErr.message]
        );
      }
    }

    res.redirect(`/comprobantes/${comprobante.id}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creando comprobante', err);
    res.status(500).render('nuevo', {
      error: 'Ocurrio un error generando el comprobante. Intenta de nuevo.',
      form: req.body,
    });
  } finally {
    client.release();
  }
});

// Detalle de un comprobante
router.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM comprobantes WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).send('Comprobante no encontrado');
  res.render('detalle', { comprobante: rows[0] });
});

// Descargar el PDF
router.get('/:id/pdf', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM comprobantes WHERE id = $1', [req.params.id]);
  const comprobante = rows[0];
  if (!comprobante) return res.status(404).send('Comprobante no encontrado');

  const filePath = path.join(PDFS_DIR, comprobante.pdf_path);
  res.download(filePath, `${comprobante.numero}.pdf`);
});

module.exports = router;
