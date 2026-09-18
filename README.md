# Recibera

Sistema básico para que contabilidad genere comprobantes de pago (PDF), los envíe automáticamente por correo (SMTP de Gmail) y los archive con historial.

> **Importante:** los comprobantes que genera este sistema son **documentos internos**, no facturas electrónicas autorizadas por el SRI. No tienen validez tributaria.

## Stack

- Node.js + Express (backend y vistas EJS)
- PostgreSQL (datos + sesiones)
- PDFKit (generación de PDF)
- Nodemailer (envío por SMTP de Gmail)
- Docker + Docker Compose
- Cloudflare Tunnel (exponer a internet sin contratar hosting)

## 1. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` y completa:

- `POSTGRES_PASSWORD`: una clave fuerte para la base de datos.
- `SESSION_SECRET`: una cadena aleatoria larga (por ejemplo `openssl rand -hex 32`).
- `SMTP_USER` / `SMTP_PASS` / `SMTP_HOST`: el correo, contraseña y host SMTP de tu correo privado (hosting/cPanel). Lo encuentras en cPanel → Email Accounts → Connect Devices.
- `TUNNEL_TOKEN`: lo obtienes en el paso 4 (Cloudflare Tunnel).

## 2. Levantar el proyecto en Docker

```bash
docker compose up -d --build
```

Esto levanta:
- `db`: PostgreSQL (crea las tablas automáticamente desde `db/init.sql`).
- `app`: la aplicación Node en `http://localhost:3000`.
- `cloudflared`: el túnel hacia Cloudflare (no hace nada útil hasta que configures `TUNNEL_TOKEN`).

## 3. Crear el usuario de contabilidad

```bash
docker compose exec app node scripts/create-user.js contabilidad "una-contrasena-segura" "Nombre Apellido"
```

Puedes correr este comando varias veces para crear más usuarios o cambiar contraseñas.

Prueba entrando a `http://localhost:3000` con ese usuario.

## 4. Publicar en internet con Cloudflare Tunnel (gratis)

1. Crea una cuenta gratuita en [Cloudflare](https://dash.cloudflare.com/sign-up) si no tienes una, y agrega un dominio (puedes comprar uno barato o usar un subdominio si ya tienes uno en Cloudflare).
2. Ve a **Zero Trust → Networks → Tunnels** → **Create a tunnel** → tipo *Cloudflared*.
3. Ponle un nombre (ej. `recibera`) y copia el **token** que te da Cloudflare.
4. Pégalo en `.env` como `TUNNEL_TOKEN=...`.
5. En la misma pantalla de Cloudflare, en **Public Hostname**, configura:
   - Subdominio: por ejemplo `recibera`
   - Dominio: el que tengas en Cloudflare
   - Service: `HTTP` → `app:3000` (el nombre del servicio Docker, no `localhost`)
6. Reinicia el contenedor del túnel:

```bash
docker compose up -d cloudflared
```

7. Entra a `https://recibera.tudominio.com` — ya está publicado, sin pagar hosting ni abrir puertos en tu router.

**Nota:** mientras uses este método, el sistema solo está disponible mientras tu máquina y Docker estén encendidos. Si necesitas disponibilidad 24/7 independiente de tu PC, considera mover los contenedores a una VM gratuita (ej. Oracle Cloud Free Tier) y apuntar el mismo túnel ahí.

## Flujo de uso

1. Contabilidad entra, hace clic en **Nuevo comprobante**.
2. Llena nombre del cliente, documento, correo, concepto, monto y método de pago.
3. Al guardar: se genera el número correlativo (`COMP-000001`, ...), se crea el PDF, se archiva en el volumen `pdfs_data`, y si hay correo se envía automáticamente por Gmail.
4. Todo queda listado en la pantalla principal con su estado (`emitido`, `enviado`, `error_envio`).

## Desarrollo local (sin Docker)

```bash
npm install
npm run dev
```

Necesitas un PostgreSQL corriendo localmente y `DATABASE_URL` apuntando a él (usa `db/init.sql` para crear el esquema).

## Backups

Los datos viven en dos volúmenes de Docker: `db_data` (PostgreSQL) y `pdfs_data` (PDFs). Haz backup periódico de ambos, por ejemplo con `docker run --rm -v recibera_db_data:/data -v $(pwd):/backup alpine tar czf /backup/db_backup.tar.gz /data`.
