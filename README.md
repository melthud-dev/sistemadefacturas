# Recibera

Sistema interno de **BQC** para generar comprobantes de pago (PDF con marca de agua corporativa), enviarlos automáticamente por correo y archivarlos con historial buscable.

> **Importante:** los comprobantes que genera este sistema son **documentos internos**, no facturas electrónicas autorizadas por el SRI. No tienen validez tributaria.

## Stack

- Node.js + Express (backend y vistas EJS)
- PostgreSQL (datos + sesiones)
- PDFKit (generación de PDF, con fuentes y marca de agua propias — ver `src/assets/`)
- Nodemailer (envío por SMTP)
- Docker + Docker Compose
- Caddy (HTTPS automático en producción) — alternativa: Cloudflare Tunnel

---

## Guía rápida para desplegar en un servidor nuevo

Pensada para quien administra el servidor (AWS u otro), sin necesitar contexto adicional.

### Requisitos del servidor

- Docker y Docker Compose instalados ([guía oficial](https://docs.docker.com/engine/install/)).
- Si vas a usar HTTPS con Caddy (recomendado): un dominio o subdominio propio, y los puertos **80** y **443** abiertos en el firewall / security group.

### 1. Clonar el repositorio

```bash
git clone https://github.com/melthud-dev/sistemadefacturas.git recibera
cd recibera
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` y completa:

- `POSTGRES_PASSWORD`: una clave fuerte para la base de datos.
- `SESSION_SECRET`: una cadena aleatoria larga (por ejemplo, generada con `openssl rand -hex 32`).
- `SMTP_USER` / `SMTP_PASS` / `SMTP_HOST` / `SMTP_PORT`: credenciales del correo que envía los comprobantes. Con Gmail se necesita una **contraseña de aplicación** (no la contraseña normal): se genera en [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) con la verificación en 2 pasos activada. También funciona con un correo de hosting/cPanel, usando el host/puerto que dé el proveedor.
- `RECIBERA_DOMAIN` y `ACME_EMAIL`: solo si vas a usar Caddy (paso 4). `RECIBERA_DOMAIN` es el subdominio que apuntará a este servidor (ej. `recibera.tudominio.com`).
- `COOKIE_SECURE`: déjalo en `false` solo si vas a probar por HTTP plano sin dominio. **Ponlo en `true` en cuanto quede detrás de HTTPS real** (Caddy o Cloudflare) — si no, el login no mantiene la sesión.

### 3. Levantar la aplicación

```bash
docker compose up -d --build
```

Esto levanta:
- `db`: PostgreSQL (crea las tablas automáticamente desde `db/init.sql` la primera vez).
- `app`: la aplicación Node, accesible en el puerto `3000`.

Verifica que responda: `curl -I http://localhost:3000/login` debería dar `200 OK`.

### 4. Crear el usuario de contabilidad

Usa exactamente este comando para que quede el mismo usuario que se usa en el resto de instalaciones de Recibera:

```bash
docker compose exec app node scripts/create-user.js contabilidad "TestPass2026!" "Contabilidad BQC"
```

Puedes correr este comando de nuevo (con otro usuario o contraseña) para crear más usuarios o cambiarlos.

### 5. Publicar con HTTPS real (recomendado): Caddy

1. Antes de nada, crea un registro DNS tipo **A** apuntando tu subdominio (ej. `recibera.tudominio.com`) a la **IP pública** de este servidor. Espera a que propague (unos minutos, a veces más).
2. En `.env`, confirma que `RECIBERA_DOMAIN` y `ACME_EMAIL` estén completos, y pon `COOKIE_SECURE=true`.
3. Reinicia `app` para que tome el cambio de `COOKIE_SECURE`, y levanta Caddy:

```bash
docker compose up -d --build app
docker compose --profile prod up -d
```

Caddy obtiene y renueva el certificado SSL de Let's Encrypt automáticamente — no hay que hacer nada más. Entra a `https://recibera.tudominio.com`.

**Si algo falla:** revisa los logs con `docker compose logs caddy` — el error más común es que el DNS todavía no apunta al servidor, o que el puerto 80/443 está bloqueado por el firewall.

### Alternativa: Cloudflare Tunnel (si no puedes abrir los puertos 80/443)

No requiere abrir ningún puerto en el servidor, pero depende de una cuenta de Cloudflare.

1. Cuenta gratuita en [Cloudflare](https://dash.cloudflare.com/sign-up) y agrega tu dominio.
2. **Zero Trust → Networks → Tunnels → Create a tunnel** (tipo *Cloudflared*).
3. Copia el token que te da y pégalo en `.env` como `TUNNEL_TOKEN`.
4. En la misma pantalla, en **Public Hostname**, configura el servicio como `HTTP` → `app:3000` (el nombre del servicio Docker, no `localhost`).
5. Pon `COOKIE_SECURE=true` en `.env` y reinicia `app`.
6. Levanta el túnel:

```bash
docker compose --profile cloudflare up -d
```

**No uses Caddy y Cloudflare Tunnel al mismo tiempo** — elige uno de los dos.

---

## Actualizar la app tras cambios en el código

```bash
git pull
docker compose up -d --build app
```

Los datos (base de datos y PDFs archivados) no se pierden — viven en volúmenes de Docker separados del código.

## Flujo de uso

1. Contabilidad entra y hace clic en **Nuevo comprobante**.
2. Llena **todos** los campos (son obligatorios): nombre del cliente, cédula, correo, programa académico, concepto, valor de venta, monto, saldo y método de pago.
3. Al guardar: se genera el número correlativo (`COMP-000001`, ...), se crea el PDF con la marca de agua corporativa, se archiva, y se envía automáticamente por correo al cliente.
4. Todo queda listado en la pantalla principal, buscable por nombre o cédula, con su estado (`emitido`, `enviado`, `error_envio`).

## Desarrollo local (sin Docker)

```bash
npm install
npm run dev
```

Necesitas un PostgreSQL corriendo localmente y `DATABASE_URL` apuntando a él (usa `db/init.sql` para crear el esquema).

## Backups

Los datos viven en volúmenes de Docker:
- `db_data`: la base de datos PostgreSQL (comprobantes, usuarios).
- `pdfs_data`: los PDFs archivados.
- `caddy_data`: certificados SSL (si usas Caddy — no crítico, se puede regenerar).

Backup de ejemplo:

```bash
docker run --rm -v recibera_db_data:/data -v $(pwd):/backup alpine tar czf /backup/db_backup.tar.gz /data
docker run --rm -v recibera_pdfs_data:/data -v $(pwd):/backup alpine tar czf /backup/pdfs_backup.tar.gz /data
```

## Notas de seguridad para quien administra el servidor

- El archivo `.env` **nunca** se sube a git (está en `.gitignore`) — se crea directo en el servidor, a mano, con el paso 2 de arriba.
- Si migras a otro servidor, copia los volúmenes (`db_data`, `pdfs_data`) para no perder historial.
- Cambia `SESSION_SECRET` y las contraseñas de `.env.example` por valores propios — nunca uses los de ejemplo.
