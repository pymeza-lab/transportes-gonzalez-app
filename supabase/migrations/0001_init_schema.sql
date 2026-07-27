-- =========================================================
-- Transportes González (TAG) — Esquema inicial
-- Fase 1 (MVP): vehículos, vigencias, viajes, gastos, bitácora
-- =========================================================

create extension if not exists "uuid-ossp";

-- ---------- ENUMS ----------
create type rol_usuario as enum ('admin', 'dispatcher', 'conductor', 'finanzas');
create type estado_vehiculo as enum ('disponible', 'en_ruta', 'mantenimiento', 'fuera_servicio');
create type tipo_documento_vehiculo as enum ('permiso_sict', 'seguro', 'verificacion', 'tenencia');
create type estado_conductor as enum ('activo', 'inactivo');
create type estado_viaje as enum ('programado', 'en_curso', 'entregado', 'cerrado', 'cancelado');
create type tipo_evidencia as enum ('recoleccion', 'entrega');
create type categoria_gasto as enum ('combustible', 'caseta', 'comida', 'hospedaje', 'imprevisto');
create type saldo_conciliacion as enum ('a_favor_empresa', 'a_favor_conductor', 'cuadrado');
create type estado_conciliacion as enum ('pendiente_revision', 'aprobado', 'rechazado');
create type tipo_alerta as enum ('documento_por_vencer', 'desviacion_gasto', 'limite_horas_conductor');

-- ---------- USUARIOS ----------
create table usuario (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid references auth.users(id) on delete cascade,
  nombre text not null,
  rol rol_usuario not null,
  telefono text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- VEHÍCULOS ----------
create table vehiculo (
  id uuid primary key default uuid_generate_v4(),
  placas text not null unique,
  configuracion_vehicular text not null, -- catálogo SAT c_ConfigAutotransporte (C2, C3, T3S2, etc.)
  tipo_caja text, -- '48ft' | '53ft' | null si no aplica
  capacidad_peso_kg numeric,
  anio integer,
  estado estado_vehiculo not null default 'disponible',
  created_at timestamptz not null default now()
);

create table documento_vehiculo (
  id uuid primary key default uuid_generate_v4(),
  vehiculo_id uuid not null references vehiculo(id) on delete cascade,
  tipo tipo_documento_vehiculo not null,
  numero_documento text,
  fecha_vencimiento date not null,
  archivo_url text,
  created_at timestamptz not null default now()
);
create index idx_documento_vencimiento on documento_vehiculo(fecha_vencimiento);

-- ---------- CONDUCTORES ----------
create table conductor (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid not null references usuario(id) on delete cascade,
  licencia_federal_numero text not null,
  licencia_vencimiento date not null,
  examen_medico_vencimiento date,
  estado estado_conductor not null default 'activo',
  created_at timestamptz not null default now()
);

-- ---------- RUTAS (plantillas reutilizables — servicios dedicados) ----------
create table ruta_plantilla (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  origen text not null,
  destino text not null,
  distancia_km numeric not null,
  casetas_estimadas_monto numeric not null default 0,
  rendimiento_estimado_kmxl numeric, -- según tipo de vehículo típico en esta ruta
  presupuesto_combustible numeric not null default 0,
  presupuesto_casetas numeric not null default 0,
  presupuesto_viaticos numeric not null default 0,
  presupuesto_imprevistos numeric not null default 0,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- VIAJES ----------
create table viaje (
  id uuid primary key default uuid_generate_v4(),
  ruta_plantilla_id uuid references ruta_plantilla(id),
  vehiculo_id uuid not null references vehiculo(id),
  conductor_id uuid not null references conductor(id),
  cliente text not null,
  fecha_programada timestamptz not null,
  fecha_recoleccion_real timestamptz,
  fecha_entrega_real timestamptz,
  estado estado_viaje not null default 'programado',
  anticipo_monto numeric default 0,
  anticipo_fecha timestamptz,
  -- presupuesto congelado al crear el viaje (no recalcular si la plantilla cambia después)
  presupuesto_combustible_congelado numeric,
  presupuesto_casetas_congelado numeric,
  presupuesto_viaticos_congelado numeric,
  presupuesto_imprevistos_congelado numeric,
  created_at timestamptz not null default now()
);
create index idx_viaje_estado on viaje(estado);
create index idx_viaje_conductor on viaje(conductor_id);

-- ---------- EVIDENCIAS (recolección / entrega) ----------
create table evidencia_viaje (
  id uuid primary key default uuid_generate_v4(),
  viaje_id uuid not null references viaje(id) on delete cascade,
  tipo tipo_evidencia not null,
  foto_url text,
  firma_url text,
  nombre_receptor text,
  notas text,
  timestamp timestamptz not null default now()
);

-- ---------- GASTOS DE VIAJE ----------
create table gasto_viaje (
  id uuid primary key default uuid_generate_v4(),
  viaje_id uuid not null references viaje(id) on delete cascade,
  categoria categoria_gasto not null,
  monto numeric not null check (monto >= 0),
  tiene_cfdi boolean not null default false,
  foto_comprobante_url text,
  fecha timestamptz not null default now(),
  capturado_por uuid references usuario(id)
);
create index idx_gasto_viaje on gasto_viaje(viaje_id);

-- ---------- CONCILIACIÓN ----------
create table conciliacion_viaje (
  id uuid primary key default uuid_generate_v4(),
  viaje_id uuid not null unique references viaje(id) on delete cascade,
  anticipo numeric not null default 0,
  total_gastado numeric not null default 0,
  total_con_cfdi numeric not null default 0,
  total_sin_cfdi numeric not null default 0,
  presupuesto_total numeric not null default 0,
  desviacion_pct numeric,
  saldo saldo_conciliacion,
  estado estado_conciliacion not null default 'pendiente_revision',
  revisado_por uuid references usuario(id),
  fecha_revision timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- BITÁCORA DE HORAS (NOM-087) ----------
create table bitacora_horas (
  id uuid primary key default uuid_generate_v4(),
  conductor_id uuid not null references conductor(id) on delete cascade,
  viaje_id uuid references viaje(id),
  fecha date not null,
  hora_inicio_conduccion timestamptz not null,
  hora_fin_conduccion timestamptz,
  minutos_pausa integer default 0,
  horas_conducidas_24h_acumuladas numeric,
  created_at timestamptz not null default now()
);
create index idx_bitacora_conductor_fecha on bitacora_horas(conductor_id, fecha);

-- ---------- ALERTAS ----------
create table alerta (
  id uuid primary key default uuid_generate_v4(),
  tipo tipo_alerta not null,
  entidad_referencia uuid, -- id del vehículo, viaje, o conductor según el tipo
  descripcion text,
  fecha_generada timestamptz not null default now(),
  atendida boolean not null default false
);
create index idx_alerta_atendida on alerta(atendida);

-- =========================================================
-- Row Level Security — se habilita, políticas específicas
-- las define Claude Code según los roles reales de auth.
-- No dejar las tablas abiertas en producción.
-- =========================================================
alter table usuario enable row level security;
alter table vehiculo enable row level security;
alter table documento_vehiculo enable row level security;
alter table conductor enable row level security;
alter table ruta_plantilla enable row level security;
alter table viaje enable row level security;
alter table evidencia_viaje enable row level security;
alter table gasto_viaje enable row level security;
alter table conciliacion_viaje enable row level security;
alter table bitacora_horas enable row level security;
alter table alerta enable row level security;

-- TODO (Claude Code, primer módulo): definir políticas RLS reales por rol.
-- Ejemplo de la política que falta para conductor (ilustrativa, no activa):
-- create policy "conductor ve solo sus viajes"
--   on viaje for select
--   using (conductor_id in (select id from conductor where usuario_id = auth.uid()));
