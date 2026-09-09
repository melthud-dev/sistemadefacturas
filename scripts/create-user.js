/**
 * Crea (o actualiza la contrasena de) un usuario de contabilidad.
 *
 * Uso dentro del contenedor:
 *   docker compose exec app node scripts/create-user.js <usuario> <contrasena> "<Nombre visible>"
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../src/db');

async function main() {
  const [username, password, nombre] = process.argv.slice(2);

  if (!username || !password) {
    console.error('Uso: node scripts/create-user.js <usuario> <contrasena> "<Nombre visible>"');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);

  await pool.query(
    `INSERT INTO users (username, password_hash, nombre)
     VALUES ($1, $2, $3)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, nombre = EXCLUDED.nombre`,
    [username, hash, nombre || username]
  );

  console.log(`Usuario "${username}" creado/actualizado correctamente.`);
  await pool.end();
}

main().catch((err) => {
  console.error('Error creando usuario', err);
  process.exit(1);
});
