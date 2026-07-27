# Transportes González (TAG) — App interna de operaciones

Repo: https://github.com/pymeza-lab/transportes-gonzalez-app

Este proyecto ya trae:
- Esqueleto de Next.js + TypeScript + Tailwind
- Esquema completo de base de datos (`supabase/migrations/0001_init_schema.sql`),
  con todas las tablas del modelo de datos: vehículos, vigencias documentales,
  conductores, rutas, viajes, evidencias, gastos, conciliación y bitácora de horas.
- `CLAUDE.md` con todo el contexto de negocio y el orden de construcción — Claude
  Code lo lee automáticamente al abrir esta carpeta.

Lo que falta es todo el código funcional (auth, pantallas, lógica) — eso lo
construyes con Claude Code, módulo por módulo, no de un jalón.

## Paso 1 — Crear el proyecto en Supabase

1. Ve a https://supabase.com, crea una cuenta (gratis para empezar) y un proyecto nuevo.
2. En el panel del proyecto, ve a **SQL Editor**, pega el contenido completo de
   `supabase/migrations/0001_init_schema.sql` y ejecútalo. Esto crea todas las tablas.
3. Ve a **Project Settings > API** y copia:
   - Project URL
   - anon public key
   - service_role key (no la compartas, es sensible)

## Paso 2 — Configurar variables de entorno

```bash
cp .env.example .env.local
```

Pega ahí las tres credenciales del paso anterior.

## Paso 3 — Instalar dependencias

Necesitas Node.js 18+ instalado. Luego:

```bash
npm install
```

## Paso 4 — Confirmar que corre

```bash
npm run dev
```

Abre http://localhost:3000 — deberías ver la pantalla placeholder ("Proyecto
inicializado..."). Si ves eso, el esqueleto está sano y listo para que Claude
Code empiece a construir sobre él.

## Paso 5 — Abrir Claude Code aquí

Desde esta misma carpeta, en terminal:

```bash
claude
```

Primer prompt sugerido (cópialo tal cual):

> Lee CLAUDE.md completo. El esquema de base de datos ya existe y está aplicado
> en Supabase — no lo modifiques sin decirme por qué. Empecemos con el paso 1 de
> la sección "Orden de construcción": auth por rol y políticas RLS reales sobre
> las tablas existentes. Antes de escribir código, dime tu plan en 3-4 líneas y
> espera mi confirmación.

Después de cada módulo: pruébalo tú (o el dispatcher real) antes de decirle a
Claude Code que siga con el siguiente. No dejes que avance varios módulos sin
revisión intermedia — es la forma más rápida de terminar con algo que nadie
validó a tiempo.

## Orden de módulos (detalle completo en CLAUDE.md)

1. Auth por rol + políticas RLS
2. Catálogo de vehículos + vigencias documentales
3. Asignación de viajes (dispatcher)
4. App de conductor (offline-first): evidencias de recolección/entrega
5. Módulo de gastos de viaje + conciliación
6. Bitácora de horas (NOM-087)

No construir en Fase 1: portal de cliente, GPS/telemetría, Carta Porte/CFDI,
mantenimiento predictivo, score de conductor.
