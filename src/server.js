require('dotenv').config();

const express = require('express');
const path = require('path');
const morgan = require('morgan');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

const { pool } = require('./db');
const { requireLogin, attachUser } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const comprobantesRoutes = require('./routes/comprobantes');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1); // detras de Cloudflare Tunnel

app.use(morgan('tiny'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    store: new pgSession({ pool, tableName: 'session', createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || 'cambia_este_secreto',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 8, // 8 horas
      // Solo exigir HTTPS cuando el sitio realmente esta detras de HTTPS
      // (Cloudflare Tunnel, nginx+certbot, etc). En local por HTTP plano
      // debe quedar en 'false', si no el navegador descarta la cookie
      // y el login parece "no funcionar" aunque las credenciales sean correctas.
      secure: process.env.COOKIE_SECURE === 'true',
      httpOnly: true,
      sameSite: 'lax',
    },
  })
);

app.use(attachUser);

app.use('/', authRoutes);
app.use('/', requireLogin, express.Router().get('/', (req, res) => res.redirect('/comprobantes')));
app.use('/comprobantes', requireLogin, comprobantesRoutes);

app.use((req, res) => {
  res.status(404).send('No encontrado');
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Error interno del servidor');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Recibera corriendo en el puerto ${PORT}`);
});
