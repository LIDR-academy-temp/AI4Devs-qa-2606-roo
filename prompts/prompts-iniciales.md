# Prompt para pruebas E2E del tablero de Position con Cypress

Crea `cypress/integration/position.spec.js` desde la raíz del repositorio. Escribe y ejecuta en ese archivo dos pruebas E2E con Cypress, una para la carga de la página de Position y otra para el cambio de fase de un candidato por arrastre.

Usa el frontend, el backend Express y una base de datos de pruebas. Reutiliza la dependencia de Cypress de la raíz y ajusta `e2e.specPattern` si hace falta para que Cypress detecte `cypress/integration/position.spec.js`. En el entorno local, el frontend corre en `http://localhost:3000` y la API en `http://localhost:3010`.

Antes de implementar las pruebas, revisa `frontend/src/App.js`, `frontend/src/components/PositionDetails.js`, `CandidateCard.js`, `StageColumn.js` y las rutas y controladores de Express. La página se abre en `/positions/:id`. La carga usa `GET /positions/:id/interviewFlow` y `GET /positions/:id/candidates`. Para el cambio de fase, usa la ruta efectiva `PUT /candidates/:id`, con `candidates` en plural. El `:id` de esa ruta es el ID del candidato y el cuerpo contiene los valores numéricos `applicationId` y `currentInterviewStep`, donde este último es el ID de la fase de destino.

Prepara datos repetibles con una posición de título conocido, al menos dos fases y dos candidatos en fases distintas. Restablece los datos iniciales antes de cada caso y obtén los identificadores de los registros preparados. Usa los nombres y las fases definidos en esos datos como valores esperados.

## Escenario 1. Carga de la página de Position

1. Visita `/positions/:id` con el ID de la posición de prueba y espera las dos consultas de carga mediante alias de `cy.intercept`.
2. Comprueba que el encabezado muestra exactamente el título esperado de la posición.
3. Comprueba que hay una columna visible por cada fase del flujo y que cada encabezado coincide con el nombre esperado.
4. Dentro de cada columna, verifica que aparecen las tarjetas correspondientes a su fase. Comprueba que cada tarjeta del conjunto de prueba aparece una sola vez y únicamente en su columna esperada.

## Escenario 2. Cambio de fase de un candidato

1. Abre la misma posición y comprueba que la tarjeta está en la columna de origen. Registra un `cy.intercept` para observar el `PUT` real del candidato antes de iniciar el gesto.
2. Arrastra la tarjeta con el ratón hasta la columna de destino y suéltala allí mediante eventos compatibles con `react-beautiful-dnd`. El gesto debe realizarse sobre el tablero renderizado.
3. Espera el alias del `PUT` y verifica el ID del candidato en la URL, el ID de la aplicación y el ID numérico de la fase de destino en el cuerpo, y el estado HTTP `200` en la respuesta real.
4. Comprueba que la tarjeta aparece en la columna de destino y desaparece de la columna de origen.
5. Ejecuta `cy.request` contra `GET /positions/:id/candidates`. Identifica la aplicación por `applicationId` y verifica que su `currentInterviewStep` coincide con el nombre de la fase de destino. Recarga la página y confirma que la tarjeta sigue en esa columna.

Usa selectores estables, por ejemplo, atributos `data-*` existentes o, si hacen falta, selectores de prueba mínimos en la tarjeta y la columna. Sincroniza los pasos con alias de red y aserciones reintentables. Deja pasar las peticiones al servidor real y conserva el orden en que responde. Si detectas un fallo intermitente de carga o de arrastre, registra qué ocurrió y la evidencia que lo reproduce.

Entrega `cypress/integration/position.spec.js`, la configuración de Cypress que haya sido necesaria, las instrucciones para preparar los datos y los comandos para ejecutar ese archivo en modo interactivo y sin interfaz. Incluye el resultado de cada escenario y el detalle de cualquier bloqueo que impida ejecutarlo.
