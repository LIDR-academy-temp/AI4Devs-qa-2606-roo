# Resultados de las pruebas E2E de Position

Las pruebas se ejecutaron el 21 de noviembre de 2026 con Cypress 16.3.0 y Chrome 158 en modo sin interfaz. Usaron el frontend en `http://localhost:3000`, Express en `http://localhost:3010` y la base PostgreSQL `lti_position_e2e`. El spec restableció los datos antes de cada caso y observó las peticiones reales en su orden de llegada. [Spec de Cypress](../integration/position.spec.js).

## Resultados por ejecución

| Ejecución en Chrome | Carga de Position | Cambio de fase por arrastre |
| --- | --- | --- |
| Esquema `public` | Pasó | Pasó |
| Esquema `position_verified`, primera pasada | Falló | Pasó |
| Esquema `position_verified`, segunda pasada | Falló | Pasó |

## Carga de Position

En la ejecución que pasó, Cypress comprobó el título exacto **Ingeniero de calidad E2E**, una columna visible por fase y una sola tarjeta por candidato en su columna esperada. Los datos situaban a **Lucia Vega** en **Revision inicial** y a **Mateo Rios** en **Entrevista tecnica**.

En las dos ejecuciones que fallaron, el título y las dos columnas aparecieron, pero las columnas quedaron vacías. Cypress agotó los 4 segundos de espera por `[data-rbd-draggable-id="2"]`. Ambos GET devolvieron HTTP `200`. [Captura de la segunda pasada](position-load-race.png).

| Pasada | Llegada de `GET /positions/1/candidates` (UTC) | Llegada de `GET /positions/1/interviewFlow` (UTC) | Diferencia |
| --- | --- | --- | --- |
| Primera | `17:10:28.594` | `17:10:28.620` | 26 ms |
| Segunda | `17:11:02.009` | `17:11:02.016` | 7 ms |

El frontend lanza ambas consultas en paralelo. Si `candidates` termina primero, intenta asignar las tarjetas cuando todavía no hay fases. Después, `interviewFlow` inicializa las columnas con listas vacías. [Efecto de carga en PositionDetails.js](../../frontend/src/components/PositionDetails.js#L16).

## Cambio de fase por arrastre

El escenario pasó en las tres ejecuciones de Chrome. Cypress arrastró la tarjeta de Lucia Vega desde **Revision inicial** hasta **Entrevista tecnica** sobre el tablero renderizado. En `position_verified` observó el `PUT /candidates/2` con este cuerpo y respuesta HTTP `200`.

```json
{
  "applicationId": 1,
  "currentInterviewStep": 2
}
```

La tarjeta desapareció de la columna de origen y apareció en la de destino. La consulta posterior a `GET /positions/1/candidates` devolvió la aplicación `1` con `currentInterviewStep` igual a `Entrevista tecnica`. La tarjeta permaneció en esa columna tras recargar la página.

## Reproducción

Con `DATABASE_URL` apuntando a la base de pruebas y los servicios locales iniciados, ejecuta desde la raíz del repositorio:

```powershell
.\node_modules\.bin\cypress.cmd run --e2e --browser chrome --spec cypress/integration/position.spec.js
```

La salida registra la hora y el estado de cada respuesta de carga. Si `candidates` llega antes que `interviewFlow` y la tarjeta no aparece, el primer escenario falla. La preparación de la base y el comando interactivo están en la guía de Cypress. [Guía de ejecución](../README.md).
