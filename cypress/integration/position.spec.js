// Pruebas E2E de la interfaz "position" (tablero kanban de candidatos).
// Escenarios del enunciado:
//   1) Carga de la página: título, columnas por fase y tarjetas en la columna de su fase actual.
//   2) Cambio de fase: arrastrar una tarjeta, comprobar que cambia de columna y que el backend se actualiza.
//
// Requisitos: backend en http://localhost:3010 con la base de datos sembrada (`prisma/seed.ts`) y frontend en
// http://localhost:3000. Datos de la semilla para la posición 1 («Senior Full-Stack Engineer»):
//   Initial Screening: Carlos García · Technical Interview: John Doe y Jane Smith · Manager Interview: vacía.
//
// Contrato real del backend: la fase se actualiza con `PUT /candidates/:id` (el enunciado cita `/candidate/:id`)
// con { applicationId, currentInterviewStep }. Se prueba el contrato implementado.
//
// Arrastre: la interfaz usa react-beautiful-dnd, que no reacciona a los eventos HTML5 de arrastre. Se utiliza su
// mecanismo de teclado (espacio para levantar, flecha para mover a otra columna, espacio para soltar), que es el
// que la propia librería documenta para pruebas automáticas.

const API = 'http://localhost:3010';
const PHASES = ['Initial Screening', 'Technical Interview', 'Manager Interview'];
const CARLOS = { candidateId: 3, applicationId: 4 };

const SPACE = 32;
const ARROW_RIGHT = 39;
const ARROW_LEFT = 37;

// Columna de una fase: la tarjeta Bootstrap cuyo encabezado es el nombre de la fase.
const column = (phase) => cy.contains('.card-header', phase).closest('.card');
// Comprueba (con reintentos) los nombres de las tarjetas de una columna; funciona también con columnas vacías.
const expectNames = (phase, assertion) =>
  column(phase).should(($col) => {
    assertion(expect([...$col.find('.card-body .card-title')].map((t) => t.textContent)));
  });

// Lanza una tecla sobre el elemento con foco; react-beautiful-dnd escucha keydown y lee keyCode.
const press = (keyCode) => {
  cy.focused().trigger('keydown', { keyCode, which: keyCode, force: true });
  cy.wait(350); // la librería anima el levantamiento y cada desplazamiento
};

// Arrastra la tarjeta de un candidato `steps` columnas a la derecha (o a la izquierda si es negativo).
function dragByKeyboard(name, steps) {
  cy.contains('.card-title', name).closest('[data-rbd-draggable-id]').focus();
  press(SPACE);
  for (let i = 0; i < Math.abs(steps); i += 1) press(steps > 0 ? ARROW_RIGHT : ARROW_LEFT);
  press(SPACE);
}

// Fase actual de un candidato según el backend (consulta directa a la API, sin pasar por la interfaz).
const backendPhaseOf = (name) =>
  cy.request(`${API}/positions/1/candidates`).then(({ body }) => body.find((c) => c.fullName === name).currentInterviewStep);

describe('Interfaz "position"', () => {
  beforeEach(() => {
    // Estado conocido: Carlos García en Initial Screening (mismo endpoint PUT que usa la interfaz).
    cy.request('PUT', `${API}/candidates/${CARLOS.candidateId}`, {
      applicationId: CARLOS.applicationId,
      currentInterviewStep: 1,
    });
    // La interfaz lanza a la vez GET interviewFlow y GET candidates y, si los candidatos llegan antes que las fases,
    // los descarta (condición de carrera de PositionDetails). Para que la prueba sea determinista se retrasa
    // la respuesta de candidatos: no se simula ningún dato, la respuesta es la del backend real.
    cy.intercept('GET', '**/positions/1/candidates', (req) => {
      req.on('response', (res) => res.setDelay(500));
    }).as('getCandidates');
    cy.visit('/positions/1');
    cy.wait('@getCandidates');
    cy.get('.card-header').should('have.length', PHASES.length);
    cy.contains('.card-title', 'Carlos García').should('exist');
  });

  describe('Carga de la página de position', () => {
    it('muestra el título de la posición', () => {
      cy.get('h2').should('have.text', 'Senior Full-Stack Engineer');
    });

    it('muestra una columna por cada fase del proceso, en orden', () => {
      cy.get('.card-header').then(($h) => {
        expect([...$h].map((h) => h.textContent)).to.deep.equal(PHASES);
      });
    });

    it('muestra cada tarjeta en la columna de su fase actual', () => {
      expectNames('Initial Screening', (names) => names.to.deep.equal(['Carlos García']));
      expectNames('Technical Interview', (names) => names.to.deep.equal(['John Doe', 'Jane Smith']));
      expectNames('Manager Interview', (names) => names.to.deep.equal([]));
    });
  });

  describe('Cambio de fase de un candidato', () => {
    it('al arrastrar la tarjeta a otra columna, la tarjeta se mueve a la nueva columna', () => {
      dragByKeyboard('Carlos García', 1);

      expectNames('Technical Interview', (names) => names.to.include('Carlos García'));
      expectNames('Initial Screening', (names) => names.to.not.include('Carlos García'));
    });

    it('actualiza la fase del candidato en el backend (PUT /candidates/:id)', () => {
      cy.intercept('PUT', '**/candidates/*').as('updateStage'); // sin simular la respuesta: llega al backend real
      backendPhaseOf('Carlos García').should('eq', 'Initial Screening');

      dragByKeyboard('Carlos García', 1);

      cy.wait('@updateStage').then(({ request, response }) => {
        expect(request.url).to.match(new RegExp(`/candidates/${CARLOS.candidateId}$`));
        expect(request.body).to.deep.equal({ applicationId: CARLOS.applicationId, currentInterviewStep: 2 });
        expect(response.statusCode).to.eq(200);
        expect(response.body.message).to.eq('Candidate stage updated successfully');
        expect(response.body.data.currentInterviewStep).to.eq(2);
      });
      backendPhaseOf('Carlos García').should('eq', 'Technical Interview');

      // Persistencia: tras recargar, la tarjeta sigue en la nueva fase.
      cy.reload();
      cy.wait('@getCandidates');
      cy.get('.card-header').should('have.length', PHASES.length);
      expectNames('Technical Interview', (names) => names.to.include('Carlos García'));
    });
  });
});
