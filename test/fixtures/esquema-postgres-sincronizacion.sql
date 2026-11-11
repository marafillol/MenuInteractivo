-- Esquema mínimo basado en los tipos reales del backup de Supabase.
-- Solo se usa en la base efímera museo_reconciliacion_prueba de GitHub Actions.

CREATE TABLE public.plantilla (
  id_plantilla BIGINT PRIMARY KEY,
  nombre TEXT,
  descripcion TEXT,
  plantilla_json JSONB,
  activo BIGINT,
  creado TIMESTAMPTZ,
  actualizado TEXT
);
INSERT INTO public.plantilla (id_plantilla, nombre, plantilla_json) VALUES
  (4, 'Plantilla prueba', '{}'::jsonb);

CREATE TABLE public.menu (
  id_menu BIGINT PRIMARY KEY,
  nombre TEXT,
  descripcion TEXT,
  imagen TEXT,
  id_plantilla BIGINT,
  visible BIGINT,
  creado TIMESTAMPTZ,
  actualizado TEXT
);
INSERT INTO public.menu (id_menu, nombre, id_plantilla) VALUES
  (23, 'Menu prueba', 4);

CREATE TABLE public.ficha (
  id_ficha BIGINT PRIMARY KEY,
  id_menu BIGINT,
  titulo TEXT,
  resumen TEXT,
  texto TEXT,
  imagen TEXT,
  datos_json JSONB,
  visible BIGINT,
  id_usuario TEXT,
  creado TIMESTAMPTZ,
  actualizado TEXT
);
INSERT INTO public.ficha (id_ficha, id_menu, titulo) VALUES
  (88, 23, 'Ficha prueba');

CREATE TABLE public.etiqueta (
  id_etiqueta BIGINT PRIMARY KEY,
  nombre TEXT,
  descripcion TEXT,
  activo BIGINT
);
INSERT INTO public.etiqueta (id_etiqueta, nombre, activo) VALUES
  (12, 'Etiqueta prueba', 1);

CREATE TABLE public.ficha_etiqueta (
  id_ficha BIGINT NOT NULL,
  id_etiqueta BIGINT NOT NULL,
  creado TIMESTAMPTZ,
  PRIMARY KEY (id_ficha, id_etiqueta)
);
INSERT INTO public.ficha_etiqueta (id_ficha, id_etiqueta) VALUES (88, 12);

CREATE TABLE public.relacion_ficha (
  id_relacion INTEGER PRIMARY KEY,
  id_ficha_origen INTEGER NOT NULL,
  id_ficha_destino INTEGER NOT NULL,
  tipo_relacion TEXT
);
INSERT INTO public.relacion_ficha (id_relacion, id_ficha_origen, id_ficha_destino, tipo_relacion)
VALUES (8, 88, 88, 'prueba');

CREATE TABLE public.multimedia (
  id_multi BIGINT PRIMARY KEY,
  id_ficha BIGINT,
  descripcion TEXT,
  ruta_archivo TEXT,
  tipo_multi TEXT,
  miniatura TEXT,
  activo BIGINT,
  creado TIMESTAMPTZ,
  actualizado TEXT
);
INSERT INTO public.multimedia (id_multi, id_ficha, ruta_archivo, tipo_multi, activo)
VALUES (48, 88, 'imagenes/multimedia/imagen/prueba.png', 'imagen', 1);

CREATE TABLE public.configuracion (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  actualizado TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO public.configuracion (clave, valor) VALUES ('ajuste_local', 'valor-prueba');
