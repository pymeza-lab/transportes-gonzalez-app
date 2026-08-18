-- =========================================================
-- Transportes González (TAG) — Políticas RLS adicionales
-- Módulo: Captura de gastos por finanzas (a partir de fotos de
-- comprobante que el conductor envía por WhatsApp, fuera de la app).
--
-- Esta migración SOLO AGREGA una política nueva. No modifica ni
-- elimina ninguna política existente de 0001_init_schema.sql ni
-- 0002_rls_policies.sql.
-- =========================================================

-- gasto_viaje ya permite a finanzas hacer SELECT (política
-- "gasto_viaje: conductor ve los de sus viajes; resto ve todos" en
-- 0002_rls_policies.sql) y UPDATE (política "gasto_viaje: finanzas y
-- admin actualizan"). Lo único que falta es INSERT: hoy solo pueden
-- insertar 'admin', 'dispatcher' y el propio 'conductor' del viaje
-- (política "gasto_viaje: conductor inserta en sus viajes; admin y
-- dispatcher también"). Sin esta política nueva, el formulario de
-- captura de finanzas (app/finanzas/gastos) recibiría un error de RLS
-- al intentar guardar el gasto.
--
-- Las políticas de Postgres son permisivas por default: esta política
-- se combina con OR junto con la ya existente, así que no reemplaza
-- ni restringe nada de lo que ya podían hacer admin/dispatcher/conductor.
create policy "gasto_viaje: finanzas inserta (captura desde oficina)"
  on gasto_viaje for insert
  with check (get_my_rol() = 'finanzas');
