-- =========================================================
-- Transportes González (TAG) — Políticas RLS
-- Módulo 1: Acceso por rol usando helper SECURITY DEFINER
-- =========================================================

-- Helper: lee el rol del usuario autenticado actual.
-- SECURITY DEFINER para bypassear el RLS de la tabla usuario y evitar recursión.
create or replace function get_my_rol()
  returns rol_usuario
  language sql
  stable
  security definer
  set search_path = public
as $$
  select rol from usuario where auth_user_id = auth.uid() limit 1;
$$;

-- Helper: devuelve el usuario.id del usuario autenticado.
create or replace function get_my_usuario_id()
  returns uuid
  language sql
  stable
  security definer
  set search_path = public
as $$
  select id from usuario where auth_user_id = auth.uid() limit 1;
$$;

-- Helper: devuelve el conductor.id del usuario autenticado (NULL si no es conductor).
create or replace function get_my_conductor_id()
  returns uuid
  language sql
  stable
  security definer
  set search_path = public
as $$
  select c.id
  from conductor c
  join usuario u on u.id = c.usuario_id
  where u.auth_user_id = auth.uid()
  limit 1;
$$;

-- =========================================================
-- TABLA: usuario
-- =========================================================
create policy "usuario: lectura propia o admin"
  on usuario for select
  using (
    auth_user_id = auth.uid()
    or get_my_rol() = 'admin'
  );

create policy "usuario: solo admin inserta"
  on usuario for insert
  with check (get_my_rol() = 'admin');

create policy "usuario: solo admin actualiza"
  on usuario for update
  using (get_my_rol() = 'admin')
  with check (get_my_rol() = 'admin');

create policy "usuario: solo admin elimina"
  on usuario for delete
  using (get_my_rol() = 'admin');

-- =========================================================
-- TABLA: vehiculo
-- =========================================================
create policy "vehiculo: lectura para autenticados"
  on vehiculo for select
  using (auth.uid() is not null);

create policy "vehiculo: admin y dispatcher insertan"
  on vehiculo for insert
  with check (get_my_rol() in ('admin', 'dispatcher'));

create policy "vehiculo: admin y dispatcher actualizan"
  on vehiculo for update
  using (get_my_rol() in ('admin', 'dispatcher'))
  with check (get_my_rol() in ('admin', 'dispatcher'));

create policy "vehiculo: solo admin elimina"
  on vehiculo for delete
  using (get_my_rol() = 'admin');

-- =========================================================
-- TABLA: documento_vehiculo
-- =========================================================
create policy "documento_vehiculo: lectura para autenticados"
  on documento_vehiculo for select
  using (auth.uid() is not null);

create policy "documento_vehiculo: admin y dispatcher insertan"
  on documento_vehiculo for insert
  with check (get_my_rol() in ('admin', 'dispatcher'));

create policy "documento_vehiculo: admin y dispatcher actualizan"
  on documento_vehiculo for update
  using (get_my_rol() in ('admin', 'dispatcher'))
  with check (get_my_rol() in ('admin', 'dispatcher'));

create policy "documento_vehiculo: solo admin elimina"
  on documento_vehiculo for delete
  using (get_my_rol() = 'admin');

-- =========================================================
-- TABLA: conductor
-- =========================================================
create policy "conductor: propio o admin/dispatcher/finanzas"
  on conductor for select
  using (
    get_my_rol() in ('admin', 'dispatcher', 'finanzas')
    or usuario_id = get_my_usuario_id()
  );

create policy "conductor: solo admin inserta"
  on conductor for insert
  with check (get_my_rol() = 'admin');

create policy "conductor: solo admin actualiza"
  on conductor for update
  using (get_my_rol() = 'admin')
  with check (get_my_rol() = 'admin');

create policy "conductor: solo admin elimina"
  on conductor for delete
  using (get_my_rol() = 'admin');

-- =========================================================
-- TABLA: ruta_plantilla
-- =========================================================
create policy "ruta_plantilla: lectura para autenticados"
  on ruta_plantilla for select
  using (auth.uid() is not null);

create policy "ruta_plantilla: admin y dispatcher insertan"
  on ruta_plantilla for insert
  with check (get_my_rol() in ('admin', 'dispatcher'));

create policy "ruta_plantilla: admin y dispatcher actualizan"
  on ruta_plantilla for update
  using (get_my_rol() in ('admin', 'dispatcher'))
  with check (get_my_rol() in ('admin', 'dispatcher'));

create policy "ruta_plantilla: solo admin elimina"
  on ruta_plantilla for delete
  using (get_my_rol() = 'admin');

-- =========================================================
-- TABLA: viaje
-- =========================================================
create policy "viaje: conductor ve los suyos; resto ve todos"
  on viaje for select
  using (
    get_my_rol() in ('admin', 'dispatcher', 'finanzas')
    or (
      get_my_rol() = 'conductor'
      and conductor_id = get_my_conductor_id()
    )
  );

create policy "viaje: admin y dispatcher insertan"
  on viaje for insert
  with check (get_my_rol() in ('admin', 'dispatcher'));

create policy "viaje: admin, dispatcher y conductor (propios) actualizan"
  on viaje for update
  using (
    get_my_rol() in ('admin', 'dispatcher')
    or (
      get_my_rol() = 'conductor'
      and conductor_id = get_my_conductor_id()
    )
  )
  with check (
    get_my_rol() in ('admin', 'dispatcher')
    or (
      get_my_rol() = 'conductor'
      and conductor_id = get_my_conductor_id()
    )
  );

create policy "viaje: solo admin elimina"
  on viaje for delete
  using (get_my_rol() = 'admin');

-- =========================================================
-- TABLA: evidencia_viaje
-- =========================================================
create policy "evidencia_viaje: conductor ve las de sus viajes; resto ve todas"
  on evidencia_viaje for select
  using (
    get_my_rol() in ('admin', 'dispatcher', 'finanzas')
    or (
      get_my_rol() = 'conductor'
      and viaje_id in (
        select id from viaje where conductor_id = get_my_conductor_id()
      )
    )
  );

create policy "evidencia_viaje: conductor inserta en sus viajes; admin y dispatcher también"
  on evidencia_viaje for insert
  with check (
    get_my_rol() in ('admin', 'dispatcher')
    or (
      get_my_rol() = 'conductor'
      and viaje_id in (
        select id from viaje where conductor_id = get_my_conductor_id()
      )
    )
  );

create policy "evidencia_viaje: solo admin actualiza"
  on evidencia_viaje for update
  using (get_my_rol() = 'admin')
  with check (get_my_rol() = 'admin');

create policy "evidencia_viaje: solo admin elimina"
  on evidencia_viaje for delete
  using (get_my_rol() = 'admin');

-- =========================================================
-- TABLA: gasto_viaje
-- =========================================================
create policy "gasto_viaje: conductor ve los de sus viajes; resto ve todos"
  on gasto_viaje for select
  using (
    get_my_rol() in ('admin', 'dispatcher', 'finanzas')
    or (
      get_my_rol() = 'conductor'
      and viaje_id in (
        select id from viaje where conductor_id = get_my_conductor_id()
      )
    )
  );

create policy "gasto_viaje: conductor inserta en sus viajes; admin y dispatcher también"
  on gasto_viaje for insert
  with check (
    get_my_rol() in ('admin', 'dispatcher')
    or (
      get_my_rol() = 'conductor'
      and viaje_id in (
        select id from viaje where conductor_id = get_my_conductor_id()
      )
    )
  );

create policy "gasto_viaje: finanzas y admin actualizan"
  on gasto_viaje for update
  using (get_my_rol() in ('admin', 'finanzas'))
  with check (get_my_rol() in ('admin', 'finanzas'));

create policy "gasto_viaje: solo admin elimina"
  on gasto_viaje for delete
  using (get_my_rol() = 'admin');

-- =========================================================
-- TABLA: conciliacion_viaje
-- =========================================================
create policy "conciliacion_viaje: conductor ve la de sus viajes; resto ve todas"
  on conciliacion_viaje for select
  using (
    get_my_rol() in ('admin', 'dispatcher', 'finanzas')
    or (
      get_my_rol() = 'conductor'
      and viaje_id in (
        select id from viaje where conductor_id = get_my_conductor_id()
      )
    )
  );

create policy "conciliacion_viaje: solo admin inserta (generada por sistema)"
  on conciliacion_viaje for insert
  with check (get_my_rol() = 'admin');

create policy "conciliacion_viaje: finanzas y admin actualizan"
  on conciliacion_viaje for update
  using (get_my_rol() in ('admin', 'finanzas'))
  with check (get_my_rol() in ('admin', 'finanzas'));

create policy "conciliacion_viaje: solo admin elimina"
  on conciliacion_viaje for delete
  using (get_my_rol() = 'admin');

-- =========================================================
-- TABLA: bitacora_horas
-- =========================================================
create policy "bitacora_horas: conductor ve la suya; admin y dispatcher ven todas"
  on bitacora_horas for select
  using (
    get_my_rol() in ('admin', 'dispatcher')
    or (
      get_my_rol() = 'conductor'
      and conductor_id = get_my_conductor_id()
    )
  );

create policy "bitacora_horas: conductor inserta la suya; admin también"
  on bitacora_horas for insert
  with check (
    get_my_rol() = 'admin'
    or (
      get_my_rol() = 'conductor'
      and conductor_id = get_my_conductor_id()
    )
  );

create policy "bitacora_horas: solo admin actualiza"
  on bitacora_horas for update
  using (get_my_rol() = 'admin')
  with check (get_my_rol() = 'admin');

create policy "bitacora_horas: solo admin elimina"
  on bitacora_horas for delete
  using (get_my_rol() = 'admin');

-- =========================================================
-- TABLA: alerta
-- =========================================================
create policy "alerta: admin y dispatcher leen"
  on alerta for select
  using (get_my_rol() in ('admin', 'dispatcher'));

create policy "alerta: solo admin inserta (generada por sistema)"
  on alerta for insert
  with check (get_my_rol() = 'admin');

create policy "alerta: admin y dispatcher actualizan (marcar atendida)"
  on alerta for update
  using (get_my_rol() in ('admin', 'dispatcher'))
  with check (get_my_rol() in ('admin', 'dispatcher'));

create policy "alerta: solo admin elimina"
  on alerta for delete
  using (get_my_rol() = 'admin');
