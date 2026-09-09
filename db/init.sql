-- Esquema inicial de Recibera
-- Se ejecuta automaticamente la primera vez que se crea el volumen de Postgres.

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(80) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nombre        VARCHAR(150) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comprobantes (
    id              SERIAL PRIMARY KEY,
    numero          VARCHAR(20) UNIQUE NOT NULL,
    fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
    cliente_nombre  VARCHAR(200) NOT NULL,
    cliente_email   VARCHAR(200),
    cliente_doc     VARCHAR(50),
    concepto        TEXT NOT NULL,
    monto           NUMERIC(12, 2) NOT NULL,
    moneda          VARCHAR(10) NOT NULL DEFAULT 'USD',
    metodo_pago     VARCHAR(50),
    estado          VARCHAR(20) NOT NULL DEFAULT 'emitido', -- emitido | enviado | error_envio
    pdf_path        TEXT NOT NULL,
    enviado_email   BOOLEAN NOT NULL DEFAULT false,
    error_envio     TEXT,
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comprobantes_fecha ON comprobantes (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_comprobantes_cliente ON comprobantes (cliente_nombre);

-- Secuencia legible para numero de comprobante (COMP-000001, COMP-000002, ...)
CREATE SEQUENCE IF NOT EXISTS comprobantes_numero_seq START 1;
