const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = rows[0];

    if (!user) {
      return res.status(401).render('login', { error: 'Usuario o contrasena incorrectos.' });
    }

    const valido = await bcrypt.compare(password || '', user.password_hash);
    if (!valido) {
      return res.status(401).render('login', { error: 'Usuario o contrasena incorrectos.' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    res.redirect('/');
  } catch (err) {
    console.error('Error en login', err);
    res.status(500).render('login', { error: 'Error interno. Intenta de nuevo.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
