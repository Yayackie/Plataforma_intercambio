# Desplegar Campus Loop en Cloudflare Workers

El error 10181 indica que el binding DB conserva el UUID de desarrollo. Iniciar
sesión con Wrangler no crea la base D1 ni cambia la configuración del build remoto.

## 1. Crear la base

Desde esta carpeta y con Wrangler autenticado:

```powershell
npx wrangler d1 create campus-loop-db
```

Conservar el UUID devuelto como database_id. Este proyecto genera la configuración
con vite.config.ts; no es necesario crear otro archivo Wrangler.

## 2. Inicializar una base nueva

Ejecutar una sola vez sobre la base recién creada y vacía:

```powershell
npx wrangler d1 execute campus-loop-db --remote --file drizzle/0000_dear_midnight.sql
```

Este SQL crea users y su índice. No repetirlo sobre una base ya inicializada.
Los módulos crean sus tablas complementarias al utilizarlos. Las cuentas de
demostración son ficticias. Los datos de la base local no se transfieren al servidor.

## 3. Configurar Workers Builds

En el Worker plataforma-intercambio, abrir Settings > Build > Build variables and secrets.
Agregar estas variables de compilación (no solo variables del entorno de ejecución):

| Variable | Valor |
| --- | --- |
| CAMPUS_LOOP_D1_DATABASE_ID | UUID devuelto al crear la base |
| CAMPUS_LOOP_D1_DATABASE_NAME | campus-loop-db |

Mantener build command `npm run build` y deploy command `npx wrangler deploy`.
Publicar el cambio de vite.config.ts en GitHub y ejecutar una nueva compilación.
No editar dist/server/wrangler.json: se vuelve a generar al compilar.

## 4. Comprobar el resultado

Verificar que el log identifica la base real y termina con un despliegue exitoso.
Abrir la URL publicada y comprobar acceso, catálogo, donaciones y mensajes.
Guardar la captura con la URL visible para la evidencia académica.

## Compilación desde PowerShell, si se necesita

```powershell
$env:CAMPUS_LOOP_D1_DATABASE_ID = 'REEMPLAZAR_POR_UUID_REAL'
$env:CAMPUS_LOOP_D1_DATABASE_NAME = 'campus-loop-db'
npm run build
```

La configuración local sigue usando el UUID anterior cuando estas variables no
están definidas. Para volver al entorno local habitual, abrir otra terminal sin ellas.

Referencias:
- https://developers.cloudflare.com/d1/get-started/
- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
