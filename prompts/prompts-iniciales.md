# Prompts iniciales — Pruebas E2E con Cypress de la interfaz «position»

> Prompts realmente utilizados. Herramienta: Claude Code (extensión de VS Code), modelo Claude Sonnet 5.5. El resultado se describe tal como ocurrió.

## Descripción del ejercicio
Probar de extremo a extremo la interfaz «position» (tablero kanban de candidatos) con Cypress:
1. **Carga de la página:** título de la posición, una columna por fase del proceso y cada tarjeta en la columna de su fase actual.
2. **Cambio de fase:** arrastrar una tarjeta a otra columna, comprobar que se mueve y que la fase se actualiza de verdad en el backend (`PUT /candidates/:id`).

Entregables: `cypress/integration/position.spec.js`, `cypress.config.js`, este fichero y la dependencia `cypress` en `package.json`.

## Instrucciones para ejecutar las pruebas
Requisitos: Node.js, Docker (para PostgreSQL) y puertos 5432, 3010 y 3000 libres.

```bash
# 1. Base de datos (desde la raíz del repositorio) y datos de ejemplo
docker-compose up -d
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npx ts-node prisma/seed.ts          # si falla por la versión de TypeScript: TS_NODE_TRANSPILE_ONLY=1 npx ts-node prisma/seed.ts

# 2. Backend (http://localhost:3010)
npm run dev

# 3. Frontend (http://localhost:3000), en otra terminal
cd frontend
npm install
npm start

# 4. Pruebas, en otra terminal y desde la raíz
npm install
npx cypress open                    # modo interactivo (elegir E2E y position.spec.js)
npx cypress run                     # modo headless
```

Notas:
- Las pruebas parten de la semilla de `prisma/seed.ts`. Cada prueba restablece a Carlos García en `Initial Screening` mediante el mismo endpoint que usa la interfaz.
- Si el puerto 3000 está ocupado, se puede arrancar el frontend en otro y ejecutar `CYPRESS_BASE_URL=http://localhost:3001 CYPRESS_chromeWebSecurity=false npx cypress run`. El backend solo admite CORS desde `http://localhost:3000`; `chromeWebSecurity=false` es solo para esa situación.

## Contexto aportado
- Enunciado oficial del ejercicio con los dos escenarios.
- Este repositorio: frontend CRA con la vista `position` (`PositionDetails.js`, `StageColumn.js`, `CandidateCard.js`, arrastre con `react-beautiful-dnd`) y backend Express + Prisma, levantados en local con PostgreSQL en un contenedor Docker.
- Una solución previa del mismo ejercicio hecha sin acceso a este repositorio; se reutilizó su estructura de escenarios, no su código.

## Prompt 1 — Encargo inicial (resumen fiel)
> Instala Cypress en un entorno aislado y crea `position.spec.js` en `cypress/integration` con las pruebas de carga de la página y de cambio de fase, incluida la comprobación del backend. Si el contrato difiere del enunciado, mantén el implementado y documenta la discrepancia.

## Prompt 2 — Adaptación a este repositorio (resumen fiel)
> Usa el repositorio oficial. Adapta las pruebas Cypress existentes al frontend React y a los mecanismos reales de arrastrar y soltar. Comprueba los escenarios del enunciado, verifica la actualización real del backend y conserva evidencias y prompts. Sin despliegues en AWS ni servicios de pago.

## Decisiones y hallazgos
| Tema | Hallazgo | Decisión |
|---|---|---|
| Ruta del PUT | El enunciado cita `PUT /candidate/:id`; el backend real expone `PUT /candidates/:id` con `{ applicationId, currentInterviewStep }` | Se prueba el contrato real. |
| Arrastre | `react-beautiful-dnd` no responde a los eventos HTML5 de arrastre | Se usa su mecanismo de teclado (espacio, flecha, espacio), el documentado para pruebas automáticas. |
| Carrera en la carga | La vista lanza a la vez `GET interviewFlow` y `GET candidates`; si los candidatos llegan antes que las fases, se descartan y no se ve ninguna tarjeta. La primera ejecución falló por esto | No se modificó el código de la aplicación. La prueba retrasa 500 ms la respuesta de candidatos con `cy.intercept` (la respuesta sigue siendo la del backend real) para que sea determinista. |
| Datos | La posición 1 de la semilla se llama «Senior Full-Stack Engineer» (el enunciado de M10 usaba «Senior backend engineer»); Carlos García es el candidato 3 y su aplicación la 4 | Las pruebas usan los datos reales de la semilla. |
| Estado entre pruebas | Mover una tarjeta cambia la base de datos | Cada prueba restablece a Carlos con el mismo endpoint antes de empezar. |

## Resultado (ejecución real)
- Cypress 16.4.0, Electron (headless), Node v24.16.0, Windows 11. Dos ejecuciones consecutivas de `npx cypress run`: **5 de 5 pruebas correctas** en ambas.
- Verificado: título, tres columnas en orden, tarjetas en su columna, la tarjeta se mueve al arrastrar, `PUT /candidates/3` con `{ applicationId: 4, currentInterviewStep: 2 }` y respuesta 200, la fase en el backend cambia a «Technical Interview» y se mantiene tras recargar.

## Iteraciones reales durante el desarrollo
1. La primera ejecución dio 1 prueba correcta y 1 fallo (el de la carrera de carga descrita arriba).
2. Con el retraso, 3 correctas y 2 fallos: mi función auxiliar fallaba con columnas vacías. Se reescribió para comprobar los nombres con reintentos también cuando la columna queda vacía.
3. Tercera ejecución: 5/5.

## Qué no se delegó
Decidir qué contrato se prueba, cómo abordar la carrera de la aplicación sin cambiar su código y comprobar que el estado final llega al backend y no solo a la interfaz.

## No comprobado
- Otros navegadores (se usó Electron) ni el modo interactivo `cypress open` (se usó `cypress run`).
- Arrastre con ratón o táctil: solo el mecanismo de teclado de la librería.
- Despliegue en AWS ni GitHub Actions: no se hicieron (el README del repositorio los menciona; el enunciado del ejercicio no los exige).
