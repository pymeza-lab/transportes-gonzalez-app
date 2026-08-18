-- =========================================================
-- Transportes González (TAG) — gasto_viaje: descripción libre
--
-- Agrega una columna de texto opcional para anotar en qué consistió
-- el gasto. Es más útil para la categoría "imprevisto" (que por
-- definición no tiene una categoría más específica), pero queda
-- disponible para cualquier gasto.
--
-- Esta migración SOLO AGREGA una columna nueva, con default NULL.
-- No modifica ni elimina nada de 0001_init_schema.sql,
-- 0002_rls_policies.sql ni 0003_finanzas_gasto_insert.sql. Los gastos
-- ya existentes simplemente quedan con descripcion = NULL, y la app
-- del conductor (que no se tocó) sigue funcionando igual sin
-- necesidad de enviar este campo.
-- =========================================================

alter table gasto_viaje
  add column if not exists descripcion text;

comment on column gasto_viaje.descripcion is
  'Nota libre opcional sobre el gasto. Especialmente útil para la categoría "imprevisto".';
