-- =========================================================
-- TAG Seed — Primera cuenta administrador
-- =========================================================
-- INSTRUCCIONES (ejecutar UNA sola vez):
--
-- 1. Ve a tu proyecto en supabase.com
--    → Authentication → Users → "Add user" → "Create new user"
-- 2. Ingresa el correo y contraseña del administrador principal
--    (p. ej. admin@tag.mx / contraseña segura)
-- 3. Copia el UUID que Supabase asignó a ese usuario
-- 4. Reemplaza el UUID de abajo con ese valor
-- 5. Ejecuta este script en: supabase.com → SQL Editor → New query
-- =========================================================

insert into public.usuario (auth_user_id, nombre, rol)
values (
  'REEMPLAZAR-CON-UUID-DEL-USUARIO-CREADO-EN-AUTH',
  'Administrador TAG',
  'admin'
);

-- Después de ejecutar esto, inicia sesión en la app con las credenciales
-- que creaste en el paso 2. Desde ahí podrás crear el resto de los usuarios.
