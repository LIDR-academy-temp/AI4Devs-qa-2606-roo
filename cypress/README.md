# Pruebas E2E de Position

Ejecuta los comandos de PowerShell desde la raíz del repositorio. El frontend debe escuchar en `http://localhost:3000` y Express en `http://localhost:3010`.

## Preparar PostgreSQL y Prisma

1. Instala las dependencias de la raíz, del backend y del frontend si aún no están disponibles.

   ```powershell
   npm.cmd install
   npm.cmd --prefix backend ci
   npm.cmd --prefix frontend ci
   ```

2. Inicia PostgreSQL. Crea `lti_position_e2e` una vez con el rol definido en el `.env` de la raíz. El siguiente comando usa `LTIdbUser`, el rol de la configuración local de este repositorio.

   ```powershell
   docker compose up -d db
   docker compose exec -T db createdb -U LTIdbUser lti_position_e2e
   ```

3. Define `DATABASE_URL` en las terminales de preparación, Express y Cypress. Si usas PostgreSQL del repositorio, este comando toma el usuario, la contraseña y el puerto de `backend/.env` sin imprimir la URL en la terminal.

   ```powershell
   $env:DATABASE_URL = node -e "const c=require('dotenv').parse(require('fs').readFileSync('backend/.env')); const u=new URL('postgresql://localhost/lti_position_e2e'); u.username=c.DB_USER; u.password=c.DB_PASSWORD; u.port=c.DB_PORT; console.log(u.href)"
   ```

4. Aplica las migraciones y regenera Prisma desde `backend`. Si Express ya está en ejecución, detenlo antes de generar el cliente y reinícialo con la URL de pruebas. En Windows, el proceso puede mantener abierto el binario de Prisma.

   ```powershell
   Push-Location backend
   .\node_modules\.bin\prisma.cmd migrate deploy
   .\node_modules\.bin\prisma.cmd generate
   npm.cmd run build
   npm.cmd start
   ```

5. Inicia el frontend en otra terminal desde la raíz.

   ```powershell
   $env:PORT = '3000'
   npm.cmd --prefix frontend start
   ```

Antes de cada caso, `cy.task('resetPosition')` prepara la posición **Ingeniero de calidad E2E** y devuelve sus IDs de PostgreSQL. Ubica a **Lucia Vega** en **Revision inicial** y a **Mateo Rios** en **Entrevista tecnica**. En ejecuciones posteriores reutiliza esos registros y restablece las fases de sus aplicaciones. Ejecuta una instancia del spec a la vez en la misma base para evitar que una ejecución restablezca los datos de otra.

## Ejecutar el spec

Desde la raíz y con `DATABASE_URL` apuntando a `lti_position_e2e` en esta terminal, abre Cypress en modo interactivo y selecciona `cypress/integration/position.spec.js` en **Specs**.

```powershell
.\node_modules\.bin\cypress.cmd open --e2e --browser chrome
```

En modo sin interfaz, ejecuta directamente el archivo.

```powershell
.\node_modules\.bin\cypress.cmd run --e2e --browser chrome --spec cypress/integration/position.spec.js
```

La salida del runner registra el orden real de llegada, el estado HTTP y la hora de las respuestas de carga. La recarga del segundo caso registra otro par de respuestas.

## Resultado observado

Se ejecutó el spec con Cypress 16.3.0 y Chrome 158 sin interfaz contra Express y PostgreSQL locales.

| Ejecución | Carga de Position | Cambio de fase por arrastre |
| --- | --- | --- |
| Base de pruebas, esquema `public` | Pasó | Pasó |
| Base de pruebas, esquema nuevo `position_verified`, primera pasada | Falló al buscar las tarjetas | Pasó |
| `position_verified`, segunda pasada | Falló al buscar las tarjetas | Pasó |

En las dos pasadas de `position_verified`, Cypress verificó `PUT /candidates/2` con `applicationId: 1` y `currentInterviewStep: 2`, ambos numéricos, y respuesta `200`. El GET posterior devolvió la aplicación `1` en **Entrevista tecnica** y la tarjeta permaneció en esa columna tras recargar.

En las ejecuciones que fallaron aparecieron el título y ambas fases, pero el tablero quedó sin tarjetas. Ambos GET respondieron `200` en este orden, con horas UTC del 21 de noviembre de 2026.

| Pasada | `/positions/1/candidates` | `/positions/1/interviewFlow` | Diferencia |
| --- | --- | --- | --- |
| Primera | `17:10:28.594` | `17:10:28.620` | 26 ms |
| Segunda | `17:11:02.009` | `17:11:02.016` | 7 ms |

Cypress agotó los 4 segundos de espera por `[data-rbd-draggable-id="2"]`. El efecto de `PositionDetails.js` lanza las consultas en paralelo. Cuando el GET de candidatos termina primero, intenta agruparlos en las fases aún vacías. Después, el flujo inicializa las columnas con listas vacías. El comando sin interfaz permite observar esta condición cuando el servidor responde en ese orden. [Código del efecto](../frontend/src/components/PositionDetails.js#L16) · [Captura de la segunda pasada](evidence/position-load-race.png).

En una ejecución preliminar con Electron, Express respondió `304` en la segunda visita por revalidación de caché. La aserción de carga admite `200` y `304` y verifica el contenido renderizado. El `PUT` y la consulta explícita con `cy.request` exigen `200`.
