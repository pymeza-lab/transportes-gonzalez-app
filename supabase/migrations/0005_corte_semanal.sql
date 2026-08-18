-- =========================================================
-- Transportes González (TAG) — Corte semanal / liquidación de operador
--
-- Agrega lo que hacía falta para poder generar automáticamente el
-- documento de corte semanal (el mismo formato de la plantilla en
-- blanco ya entregada), sin depender de captura manual fuera de la app:
--
--   1) Datos de logística del viaje que hoy no se capturan en ningún
--      lado: remolque, documento, km inicial/final, litros, fecha de
--      cobro. Los llena el dispatcher al cerrar el viaje.
--   2) Una tabla nueva `movimiento_conductor`: para todo lo que es
--      nómina/caja con el conductor y que NO es un gasto de viaje ni
--      un anticipo (que ya existen) — pago de viajes (salario),
--      descuentos, bonos, préstamos otorgados y sus abonos. Es el
--      equivalente en la app de la pestaña "Movimientos Conductores"
--      del Excel de caja chica: un movimiento por fila, con tipo y
--      monto, para que el saldo de préstamo y los totales del corte
--      se calculen solos y queden auditables.
--
-- Esta migración SOLO AGREGA columnas/tablas nuevas. No modifica ni
-- elimina nada de 0001_init_schema.sql, 0002_rls_policies.sql,
-- 0003_finanzas_gasto_insert.sql ni 0004_gasto_viaje_descripcion.sql.
-- =========================================================

-- ---------- viaje: datos de logística para el corte ----------
alter table viaje
  add column if not exists remolque    text,
  add column if not exists documento   text,
  add column if not exists km_inicial  numeric,
  add column if not exists km_final    numeric,
  add column if not exists litros      numeric,
  add column if not exists fecha_cobro timestamptz;

comment on column viaje.remolque    is 'Número/placa del remolque usado en el viaje. Se llena al cerrar el viaje.';
comment on column viaje.documento   is 'Folio o número de documento de flete/entrega. Se llena al cerrar el viaje.';
comment on column viaje.km_inicial  is 'Kilometraje al iniciar el viaje. Se llena al cerrar el viaje.';
comment on column viaje.km_final    is 'Kilometraje al finalizar el viaje. Se llena al cerrar el viaje.';
comment on column viaje.litros      is 'Litros de combustible cargados durante el viaje. Se llena al cerrar el viaje.';
comment on column viaje.fecha_cobro is 'Fecha en que se cobró el viaje al cliente. Se llena al cerrar el viaje.';

-- ---------- movimiento_conductor: nómina/caja con el conductor ----------
create type tipo_movimiento_conductor as enum (
  'pago_viajes',      -- salario del periodo
  'descuento',
  'bono',
  'prestamo_otorgado',
  'abono_prestamo'
);

create table movimiento_conductor (
  id            uuid primary key default uuid_generate_v4(),
  conductor_id  uuid not null references conductor(id) on delete cascade,
  tipo          tipo_movimiento_conductor not null,
  monto         numeric not null check (monto >= 0),
  fecha         timestamptz not null default now(),
  notas         text,
  capturado_por uuid references usuario(id),
  created_at    timestamptz not null default now()
);
create index idx_movimiento_conductor_fecha on movimiento_conductor(conductor_id, fecha);

comment on table movimiento_conductor is
  'Movimientos de nómina/caja con el conductor que no son gasto_viaje ni anticipo de viaje: '
  'pago de viajes (salario), descuentos, bonos, préstamos otorgados y abonos a préstamo. '
  'Un registro por movimiento — el saldo de préstamo y los totales del corte semanal se '
  'calculan sumando por tipo, nunca se guarda un total ya calculado.';

alter table movimiento_conductor enable row level security;

-- Igual que gasto_viaje/conciliacion_viaje: esto es información financiera del
-- conductor, no de logística — dispatcher no la necesita, solo finanzas y admin.
create policy "movimiento_conductor: finanzas y admin leen"
  on movimiento_conductor for select
  using (get_my_rol() in ('admin', 'finanzas'));

create policy "movimiento_conductor: finanzas y admin insertan"
  on movimiento_conductor for insert
  with check (get_my_rol() in ('admin', 'finanzas'));

create policy "movimiento_conductor: finanzas y admin actualizan"
  on movimiento_conductor for update
  using (get_my_rol() in ('admin', 'finanzas'))
  with check (get_my_rol() in ('admin', 'finanzas'));

create policy "movimiento_conductor: solo admin elimina"
  on movimiento_conductor for delete
  using (get_my_rol() = 'admin');
