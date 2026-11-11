-- Esquema extraído del DDL del backup Supabase del 2026-11-10.
-- Se conservan tipos, nulabilidad, PK, FK e índices; no se incluyen datos personales.
CREATE TABLE public.plantilla (
 id_plantilla bigint NOT NULL,
 nombre text, descripcion text, plantilla_json jsonb, activo bigint,
 creado timestamp with time zone, actualizado text,
 CONSTRAINT plantilla_pkey PRIMARY KEY (id_plantilla)
);
CREATE TABLE public.menu (
 id_menu bigint NOT NULL, nombre text, descripcion text, imagen text,
 id_plantilla bigint, visible bigint, creado timestamp with time zone, actualizado text,
 CONSTRAINT menu_pkey PRIMARY KEY (id_menu),
 CONSTRAINT fk_menu_plantilla FOREIGN KEY (id_plantilla) REFERENCES public.plantilla(id_plantilla)
);
CREATE TABLE public.ficha (
 id_ficha bigint NOT NULL, id_menu bigint, titulo text, resumen text, texto text,
 imagen text, datos_json jsonb, visible bigint, id_usuario text,
 creado timestamp with time zone, actualizado text,
 CONSTRAINT ficha_pkey PRIMARY KEY (id_ficha),
 CONSTRAINT fk_ficha_menu FOREIGN KEY (id_menu) REFERENCES public.menu(id_menu)
);
CREATE TABLE public.etiqueta (
 id_etiqueta bigint NOT NULL, nombre text, descripcion text, activo bigint,
 CONSTRAINT etiqueta_pkey PRIMARY KEY (id_etiqueta)
);
CREATE TABLE public.multimedia (
 id_multi bigint NOT NULL, id_ficha bigint, descripcion text, ruta_archivo text,
 tipo_multi text, miniatura text, activo bigint, creado timestamp with time zone, actualizado text,
 CONSTRAINT multimedia_pkey PRIMARY KEY (id_multi),
 CONSTRAINT fk_multimedia_ficha FOREIGN KEY (id_ficha) REFERENCES public.ficha(id_ficha)
);
CREATE TABLE public.relacion_ficha (
 id_relacion integer NOT NULL, id_ficha_origen integer NOT NULL,
 id_ficha_destino integer NOT NULL, tipo_relacion text,
 CONSTRAINT relacion_ficha_pkey PRIMARY KEY (id_relacion),
 CONSTRAINT fk_relacion_ficha_origen FOREIGN KEY (id_ficha_origen) REFERENCES public.ficha(id_ficha),
 CONSTRAINT fk_relacion_ficha_destino FOREIGN KEY (id_ficha_destino) REFERENCES public.ficha(id_ficha)
);
CREATE TABLE public.ficha_etiqueta (
 id_ficha bigint NOT NULL, id_etiqueta bigint NOT NULL, creado timestamp with time zone,
 CONSTRAINT ficha_etiqueta_pkey PRIMARY KEY (id_ficha,id_etiqueta),
 CONSTRAINT fk_ficha_etiqueta_ficha FOREIGN KEY (id_ficha) REFERENCES public.ficha(id_ficha),
 CONSTRAINT fk_ficha_etiqueta_etiqueta FOREIGN KEY (id_etiqueta) REFERENCES public.etiqueta(id_etiqueta)
);
CREATE TABLE public.configuracion (
 clave text NOT NULL, valor text NOT NULL, actualizado timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT configuracion_pkey PRIMARY KEY (clave)
);
CREATE TABLE public.configuracion_backup_tilde (
 clave text NOT NULL, valor jsonb, actualizado timestamp with time zone,
 CONSTRAINT configuracion_backup_tilde_pkey PRIMARY KEY (clave)
);
