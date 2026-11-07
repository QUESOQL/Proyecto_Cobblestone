# Fase 1: publicar AforoON, entrar con Google y preparar el celular del guardia

Opción gratuita: Supabase Free + Vercel Hobby + Google sin costo + app instalable desde el
navegador (sin tiendas). Se hace una sola vez y toma unos 30 a 45 minutos.

Lo que ya está hecho en el código: botón «Continuar con Google» en `/registro`, cuenta propia
del terminal con PIN de turno en `/recepcion` (migración 0006) y el script `scripts/equipo.mjs`.
La app compila para producción (`npm run build`).

> **Límites del plan gratuito**
> - **Supabase:** la base se pausa tras unos 7 días sin uso. Se reactiva en el panel con «Restore project».
> - **Vercel Hobby:** solo uso no comercial. Sirve para el capstone y las demos; para operar en el Hub de verdad habría que pasar a un plan pagado.

---

## 1. Aplicar la migración 0006 (Supabase, 2 minutos)

1. Supabase → **SQL Editor** → **New query**.
2. Pega todo `supabase/migrations/0006_terminales_turnos.sql` y aprieta **Run**.

Crea las tablas `terminales`, `pines_recepcion` y `turnos`, y hace que un terminal activo cuente como recepción.

## 2. Publicar en Vercel (10 minutos)

Vercel publica desde el repositorio propio **`LucianoTorretti/AforoOn`**, que tiene la app en la
raíz. El repositorio del equipo (`QUESOQL/Proyecto_Cobblestone`, carpeta `codigo/aforoon`) sigue
siendo el oficial del capstone; cada cambio se sube a los dos.

1. Entra a <https://vercel.com> → **Sign Up** → **Continue with GitHub** (con la cuenta
   LucianoTorretti), con plan **Hobby**.
2. **Add New… → Project** → elige `AforoOn` → **Import**. Si no aparece, aprieta
   **Adjust GitHub App Permissions** y dale acceso a ese repositorio.
3. **Root Directory:** déjalo como está (la raíz).
4. Framework: **Next.js** (lo detecta solo). No cambies los comandos de build.
5. En **Environment Variables** agrega solo estas dos, copiadas de tu `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   **No** agregues `SUPABASE_SERVICE_ROLE_KEY`: la app no la usa y no debe salir de tu computador.
6. **Deploy**. Al terminar tendrás una dirección del tipo `https://aforoon.vercel.app`.
   Anótala: la llamaremos **TU_URL**.

Desde ahí, cada vez que se suban cambios a `main` de `LucianoTorretti/AforoOn`, Vercel publica la versión nueva sola.

## 3. Decirle a Supabase dónde vive la app (2 minutos)

Supabase → **Authentication** → **URL Configuration**:

- **Site URL:** `TU_URL`
- **Redirect URLs** (agrega las dos):
  - `TU_URL/**`
  - `http://localhost:3000/**`

Sin esto, después de entrar con Google, Supabase no sabe a qué página devolverte.

## 4. Crear el acceso de Google (Google Cloud, 15 minutos)

1. Entra a <https://console.cloud.google.com> con la cuenta de Google del equipo y crea un
   proyecto llamado **AforoON**.
2. **APIs y servicios → Pantalla de consentimiento de OAuth** (en la versión nueva, **Google Auth Platform → Branding**):
   - **Tipo de usuario:** Externo.
   - **Nombre de la app:** AforoON. **Correo de asistencia:** el del equipo.
   - **Dominios autorizados:** `supabase.co` y el dominio de TU_URL (por ejemplo `vercel.app` o el tuyo).
   - **Permisos:** solo `email`, `profile` y `openid` (los básicos; no requieren verificación de Google).
   - **Estado de publicación:** cámbialo a **En producción**. Mientras esté en «Prueba», solo entran
     las cuentas que agregues como usuarios de prueba (máximo 100).
3. **Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web**:
   - **Orígenes de JavaScript autorizados:** `TU_URL` y `http://localhost:3000`
   - **URI de redireccionamiento autorizados:** `https://hogqlyljcexzrucbkyas.supabase.co/auth/v1/callback`
4. Google te muestra el **ID de cliente** y el **Secreto del cliente**. Déjalos abiertos para el paso siguiente
   y no los pegues en el chat.

## 5. Activar Google en Supabase (2 minutos)

Supabase → **Authentication** → **Sign In / Providers** → **Google**:

1. Actívalo.
2. Pega el **Client ID** y el **Client Secret** del paso anterior.
3. **Save**.

Opcional: en **Email**, apaga **Confirm email** para que quien cree una cuenta con correo no tenga
que abrir un enlace antes de seguir (el correo gratis de Supabase envía pocos mensajes por hora).

## 6. Preparar el equipo y el celular del guardia (5 minutos)

En la carpeta del proyecto, en tu computador:

1. Crea tu propia cuenta en `TU_URL/registro` (con Google o con correo) y completa tus datos.
2. Date rol de administración y un PIN de turno (4 a 6 dígitos):
   ```bash
   node scripts/equipo.mjs rol tu-correo@gmail.com admin
   ```
   ```bash
   node scripts/equipo.mjs pin tu-correo@gmail.com 4821
   ```
   Cambia `4821` por tu PIN. Para cada recepcionista se repite con su correo y el rol `recepcion`.
3. Crea la cuenta del celular del guardia:
   ```bash
   node scripts/equipo.mjs terminal "Recepción principal"
   ```
   El correo y la contraseña del terminal quedan en `.env.terminal.local`, que no se sube a git.
4. En el **celular Android** del guardia, con **Chrome**:
   - Abre `TU_URL/recepcion`.
   - Entra una sola vez con el correo y la contraseña del terminal.
   - Ingresa tu PIN: se abre el turno.
   - Menú ⋮ → **Agregar a la pantalla principal** (o **Instalar app**).

Para ver el estado: `node scripts/equipo.mjs lista`.

## 7. Que los vecinos la instalen (sin tiendas)

- **Android (Chrome):** abrir `TU_URL` → menú ⋮ → **Agregar a la pantalla principal**.
- **iPhone (Safari):** abrir `TU_URL` → botón **Compartir** → **Agregar a inicio**.

Queda como un ícono más en el teléfono. En la fase 6 se agrega el modo sin internet y un ícono propio.

## Qué queda para las fases siguientes

- **Fase 2:** `/recepcion` deja de simular y registra accesos reales en la base, con la búsqueda por RUT
  y la pantalla del guardia del informe.
- **Política de privacidad:** conviene tener una página `/privacidad` antes de abrir la app al público.
  Google la pide en la pantalla de consentimiento y la Ley 21.719 exige informar qué se registra.
