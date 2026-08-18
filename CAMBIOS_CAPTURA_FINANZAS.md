# Captura de gastos desde finanzas — resumen para Paty

Fecha: 17 de agosto de 2026

## Qué se agregó

Hasta ahora, la única forma de registrar un gasto de viaje (`gasto_viaje`) era
desde el celular del conductor, en su pantalla de "Gastos". Como los
conductores mandan las fotos del recibo por WhatsApp y no quieren usar la app,
no había manera de que alguien de oficina (rol "finanzas") capturara esos
gastos en el sistema.

Se agregaron **dos pantallas nuevas**, solo para el rol finanzas (y admin,
que ve todo):

1. **"Registrar gasto"** (`/finanzas/gastos`): eliges al conductor, luego el
   viaje (solo se muestran viajes "programado" o "en curso" — los cerrados o
   cancelados ya no admiten gastos nuevos), la categoría (combustible,
   caseta, comida, hospedaje, imprevisto), el monto, si tiene o no CFDI, la
   fecha real del gasto (la del recibo, no necesariamente hoy) y puedes subir
   la foto del comprobante que te llegó por WhatsApp. Aplican las mismas
   reglas que ya tenía la app del conductor: si el gasto de comida pasa de
   $750 se marca visualmente (no bloquea), si es hospedaje sin CFDI se marca
   en rojo, y si no subes foto el gasto se guarda igual pero queda marcado
   como "sin soporte" — nunca se oculta esa falta.

2. **"Conductores"** (`/finanzas/conductores`): una lista de todos los
   conductores con cuántos viajes tienen abiertos ahorita. Al entrar al
   detalle de un conductor ves sus últimos viajes, cuánto se ha gastado en
   cada uno, cuántos gastos están sin foto de soporte, cuántos están sin
   CFDI, y si ya existe una conciliación para ese viaje (con link directo a
   verla). Esto lo puedes consultar cuando quieras, no solo cuando se cierra
   un viaje.

Ambas pantallas ya tienen su link en el menú lateral de finanzas (a un lado
de "Inicio" y "Viajes").

**No se creó ninguna tabla nueva.** Todo se guarda en `gasto_viaje`, que es
la misma tabla que ya usa el conductor. No se tocó nada de anticipos,
bonos ni préstamos — eso sigue fuera de este cambio, como se acordó.

## Archivos nuevos

- `app/finanzas/gastos/page.tsx` — pantalla de captura (selecciona conductor/viaje).
- `app/finanzas/gastos/GastoFinanzasForm.tsx` — el formulario en sí (categoría, monto, foto, CFDI, fecha).
- `app/finanzas/gastos/actions.ts` — la lógica que guarda el gasto en la base de datos, con los mismos permisos y reglas que ya usa la app del conductor.
- `app/finanzas/conductores/page.tsx` — lista de conductores con resumen.
- `app/finanzas/conductores/[id]/page.tsx` — detalle de un conductor: viajes, gastos, soporte faltante, conciliación.
- `supabase/migrations/0003_finanzas_gasto_insert.sql` — migración nueva (ver abajo, es necesario correrla).

## Archivo modificado

- `app/finanzas/layout.tsx` — se agregaron los dos links nuevos ("Registrar gasto" y "Conductores") al menú de finanzas. Solo se tocaron esas dos líneas, nada más de finanzas cambió.

**No se tocó nada dentro de `app/conductor/`.** La app del conductor sigue
funcionando exactamente igual que antes.

## ¿Hay que correr la migración 0003 en Supabase?

**Sí, es necesario.** Revisé con cuidado las reglas de seguridad (RLS) que ya
existían en `0002_rls_policies.sql` y encontré que finanzas **sí podía
consultar** (ver) los gastos, viajes, conductores y conciliaciones — pero
**no podía insertar** un gasto nuevo. Solo podían insertar gastos: admin,
dispatcher, y el propio conductor sobre sus viajes. Sin este cambio, al
intentar guardar un gasto desde la pantalla nueva, Supabase lo hubiera
rechazado con un error de permisos.

La migración 0003 **solo agrega** un permiso nuevo (a finanzas, para
insertar en `gasto_viaje`). No modifica ni borra ninguna política que ya
existía, así que no debería romper nada de lo que ya funciona hoy.

### Qué pegar en el editor SQL de Supabase

Entra a tu proyecto de Supabase → SQL Editor → pega y ejecuta exactamente
esto (es el contenido completo del archivo `supabase/migrations/0003_finanzas_gasto_insert.sql`):

```sql
create policy "gasto_viaje: finanzas inserta (captura desde oficina)"
  on gasto_viaje for insert
  with check (get_my_rol() = 'finanzas');
```

(El archivo en el repo trae además comentarios explicando el porqué, por si
algún desarrollador lo quiere revisar después — el comando de arriba es lo
único que hace falta ejecutar.)

## Cómo probarlo (idealmente antes de usarlo con datos reales)

1. Correr la migración 0003 de arriba en Supabase (SQL Editor).
2. Entrar a la app con un usuario que tenga rol "finanzas".
3. Ir a "Registrar gasto" en el menú, elegir un conductor que tenga un viaje
   "programado" o "en curso", elegir el viaje, llenar categoría y monto,
   subir (o no subir, para probar el caso "sin soporte") una foto, y guardar.
4. Verificar que el gasto aparezca:
   - En la misma pantalla, en la lista "Gastos ya registrados en este viaje".
   - En "Conductores" → detalle de ese conductor → en la fila del viaje
     correspondiente (columna "Gastado" debe subir).
   - **Importante:** entrar también con un usuario conductor y confirmar que
     ese mismo gasto aparece en su pantalla `/conductor/viaje/[id]/gastos`,
     para asegurarnos que no se duplicó nada raro y que es la misma tabla.
5. Probar que un viaje "cerrado" o "cancelado" NO aparezca en el selector de
   viajes de la pantalla de finanzas.

## Cosas que debes saber antes de usarlo en producción (honestidad total)

- **No lo probé contra una base de datos real.** No tengo acceso a las
  credenciales de Supabase de este entorno, así que todo esto lo escribí
  leyendo con mucho cuidado el código que ya existía y copiando exactamente
  el mismo patrón que usa la app del conductor (que sí está en producción y
  funciona). Pero “se ve bien leyendo el código” no es lo mismo que “ya lo
  probé”. Por favor pide a un desarrollador (o hazlo tú siguiendo los pasos
  de arriba) que lo pruebe en un ambiente de prueba antes de que el equipo de
  finanzas lo use con gastos reales.
- La foto que sube finanzas se guarda en el mismo lugar (bucket de Storage
  "evidencias") y con el mismo formato de nombre que usa la app del
  conductor, así que no debería haber conflictos ni gastos "perdidos".
- Puse un límite de fecha: no se puede capturar un gasto con fecha futura
  (tiene sentido, ya que se supone que es un recibo que ya pasó), pero sí se
  puede poner cualquier fecha pasada, por si el recibo llegó tarde.
- La lista de "conductores" y "viajes abiertos" en la pantalla de captura se
  carga completa de un jalón (no es una búsqueda). Con el tamaño actual de la
  flota (40+ unidades) no debería ser un problema de velocidad, pero si la
  empresa crece mucho más, en algún momento convendría agregar un buscador.
- Si dos personas de finanzas intentan registrar el mismo gasto casi al mismo
  tiempo (por ejemplo, dos cajeras viendo la misma foto de WhatsApp), no hay
  nada que avise "ese gasto ya se capturó" — quedaría duplicado. Es un riesgo
  operativo a tener en cuenta al repartir el trabajo entre el equipo, no un
  bug del sistema.
