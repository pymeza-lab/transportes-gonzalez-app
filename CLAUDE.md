# Transportes González (TAG) — App interna de operaciones

## Contexto del negocio

Cliente: Transportes González (TAG), Toluca, MX. Autotransporte de carga, servicios dedicados
(rutas recurrentes por cliente, no marketplace spot). 30+ años operando, flota de 40+ unidades
(sencillas y full, remolque caja seca 48 y 53 pies). Mercancía general seca, sin refrigeración.

Estado actual: 100% manual (Excel + WhatsApp). Sin GPS/telemetría instalada.

Esta es una app de USO INTERNO (dispatcher, gerencia de flota, conductores, finanzas).
No hay portal de cliente externo. No lo construyas.

## Stack ya decidido

- Next.js 14+ (App Router) + TypeScript
- Tailwind CSS
- Supabase: Postgres + Auth + Storage (fotos/firmas) + Row Level Security
- El esquema inicial ya existe en `supabase/migrations/0001_init_schema.sql` — léelo
  completo antes de escribir cualquier query o componente. No dupliques ni renombres
  tablas sin razón; si necesitas cambiar el esquema, agrega una migración nueva,
  no edites la 0001 directamente una vez aplicada.

## Restricción de diseño más importante

Los conductores van a estar en carretera con conectividad intermitente. La sección de
conductor (`/app/conductor`) tiene que funcionar offline (capturar fotos, montos, firmas
localmente) y sincronizar cuando recupere señal. No asumas conexión constante en esa
sección. El dashboard de dispatcher/finanzas sí puede asumir conexión normal de oficina.

## Roles (ya en el esquema como enum rol_usuario)

- **admin**: acceso total, gestiona catálogos.
- **dispatcher**: crea y asigna viajes, ve alertas de vigencias, aprueba anticipos.
- **conductor**: solo ve sus viajes asignados, captura evidencias y gastos. Interfaz
  mínima — botones grandes, máximo 2-3 toques por acción. Perfil de usuario: celular
  Android de gama media/baja.
- **finanzas**: revisa/aprueba conciliación de gastos, ve reportes de desviación.

## Orden de construcción — Fase 1 (MVP). No construyas nada fuera de esta lista sin preguntar.

1. Setup base: auth por rol (Supabase Auth), layout con navegación según rol, políticas RLS
   reales sobre el esquema existente (las políticas actuales en la migración son solo TODO).
2. Catálogo de vehículos + vigencias documentales (`documento_vehiculo`) con alertas de
   vencimiento (usar tabla `alerta`, tipo `documento_por_vencer`).
3. Asignación de viajes: dispatcher crea `viaje` a partir de una `ruta_plantilla`, asigna
   `vehiculo_id` + `conductor_id`. Al crear el viaje, congelar el presupuesto de la plantilla
   en los campos `presupuesto_*_congelado` del viaje (no recalcular después).
4. App de conductor: ver viaje asignado, capturar `evidencia_viaje` (foto + firma) en
   recolección y entrega, con soporte offline.
5. Módulo de gastos (`gasto_viaje` + `conciliacion_viaje`): ver detalle completo de reglas
   de negocio abajo — es el módulo que más le importa al cliente ahora mismo.
6. Bitácora de horas (`bitacora_horas`, NOM-087): captura manual por el conductor al
   iniciar/terminar cada tramo de conducción.

### Explícitamente FUERA de alcance (no construir aunque parezca fácil agregar)
- Portal o tracking para clientes externos.
- GPS/telemetría en tiempo real.
- Facturación / CFDI con Complemento Carta Porte (probablemente resuelto por un contador
  externo — confirmar con el cliente antes de tocar esto).
- Mantenimiento predictivo, score de conductor, integración con tarjetas de combustible.
- Cotización automática a clientes nuevos.

## Módulo de gastos de viaje — reglas de negocio detalladas

- Cada `gasto_viaje` se clasifica por `categoria` Y por `tiene_cfdi`. Es obligatorio
  capturar ambos — sin esta distinción, finanzas no puede saber qué es fiscalmente
  deducible.
- Límites de referencia SAT (territorio nacional) — usar solo para **marcar visualmente**
  gastos que los exceden, nunca para bloquear la captura (el conductor puede gastar más,
  la realidad de carretera lo exige):
  - Alimentación: $750 MXN/día por persona
  - Renta de auto / movilidad: $850 MXN/día
  - Hospedaje: sin límite fijo, requiere CFDI
  - Casetas/transporte: sin límite fijo, requiere comprobante
- Un gasto sin foto de comprobante se captura igual, pero debe quedar visualmente marcado
  como "sin soporte" en cualquier reporte — nunca ocultarlo.
- Al cerrar el viaje (`estado = entregado`), generar automáticamente `conciliacion_viaje`:
  sumar gastos por categoría, comparar contra el presupuesto congelado del viaje, calcular
  `desviacion_pct`, determinar `saldo`.
- Si `desviacion_pct` excede ±15% (umbral configurable), marcar para revisión de finanzas
  vía tabla `alerta` (tipo `desviacion_gasto`). El resto se puede aprobar en lote.

## Cómo trabajar conmigo en este proyecto

- Ve módulo por módulo, en el orden de arriba. No avances al siguiente módulo sin que
  yo confirme que probé el anterior.
- Antes de escribir código de un módulo nuevo, dime en 3-4 líneas tu plan (tablas que
  vas a tocar, componentes que vas a crear) y espera mi OK.
- Si algo de este documento choca con lo que te pido en el chat, pregunta — no asumas
  que el chat tiene prioridad sobre este archivo ni al revés.
