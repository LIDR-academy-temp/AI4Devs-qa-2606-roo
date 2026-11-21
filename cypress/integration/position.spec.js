const api = 'http://localhost:3010';
const stageSelector = '[data-stage-id]';
const stageById = (id) => `[data-stage-id="${id}"]`;
const cardById = (id) => `[data-rbd-draggable-id="${id}"]`;

function waitForPosition() {
  cy.wait(['@positionFlow', '@positionCandidates']).then((requests) => {
    requests.forEach(({ response }) => {
      expect(response.statusCode).to.be.oneOf([200, 304]);
    });
  });
}

function expectCardInStage(candidate, stage) {
  cy.get(cardById(candidate.id)).should('have.length', 1);
  cy.get(stageById(stage.id)).find(cardById(candidate.id))
    .should('be.visible')
    .find('.card-title').should('have.text', candidate.name);
}

function center(element) {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { clientX: Math.round(left + width / 2), clientY: Math.round(top + height / 2) };
}

function mouse(target, type, point) {
  const win = target.ownerDocument.defaultView;
  target.dispatchEvent(new win.MouseEvent(type, {
    ...point,
    bubbles: true,
    cancelable: true,
    button: 0,
    buttons: type === 'mouseup' ? 0 : 1,
  }));
}

function dragCardToStage(candidate, destination) {
  const card = cardById(candidate.id);
  const destinationColumn = stageById(destination.id);

  cy.get(card).scrollIntoView().should('be.visible').then(($card) => {
    const start = center($card[0]);
    mouse($card[0], 'mousedown', start);
    // react-beautiful-dnd lifts the card after the mouse crosses its movement threshold.
    mouse($card[0], 'mousemove', { ...start, clientX: start.clientX + 8 });
  });

  cy.get(card).should('have.css', 'position', 'fixed');
  cy.get(destinationColumn).should('be.visible').then(($destination) => {
    const target = $destination[0];
    const dropPoint = center(target);
    mouse(target, 'mousemove', dropPoint);

    // The mouse sensor applies movement on the next animation frame.
    cy.get(card).should(($card) => {
      const moved = center($card[0]);
      const { left, right, top, bottom } = target.getBoundingClientRect();
      expect(moved.clientX, 'dragged card X').to.be.within(left, right);
      expect(moved.clientY, 'dragged card Y').to.be.within(top, bottom);
    }).then(() => mouse(target, 'mouseup', dropPoint));
  });
}

describe('Position', () => {
  let loadResponses;

  beforeEach(function () {
    loadResponses = [];
    cy.task('resetPosition').then((position) => {
      this.position = position;
      const path = `/positions/${position.id}`;

      const recordResponse = (request) => {
        request.on('after:response', (response) => {
          loadResponses.push({
            path: new URL(request.url).pathname,
            status: response.statusCode,
            timestamp: new Date().toISOString(),
          });
        });
      };
      cy.intercept('GET', `${api}${path}/interviewFlow`, recordResponse).as('positionFlow');
      cy.intercept('GET', `${api}${path}/candidates`, recordResponse).as('positionCandidates');
      cy.visit(path);
      waitForPosition();
    });
  });

  afterEach(() => {
    cy.task('logPositionRequests', loadResponses, { log: false });
  });

  it('carga el titulo, las fases y los candidatos de la posicion', function () {
    const { title, stages } = this.position;
    cy.get('h2').should('be.visible').and('have.text', title);
    cy.get(stageSelector).should('have.length', stages.length).each(($stage) => {
      cy.wrap($stage).should('be.visible');
    });

    stages.forEach((stage) => {
      cy.get(stageById(stage.id)).should('have.length', 1)
        .find('.card-header').should('have.text', stage.name);
      expectCardInStage(stage.candidate, stage);
    });
  });

  it('arrastra un candidato a otra fase y conserva el cambio al recargar', function () {
    const { id, stages: [source, destination] } = this.position;
    const { candidate } = source;
    expectCardInStage(candidate, source);
    cy.intercept('PUT', `${api}/candidates/*`).as('moveCandidate');

    dragCardToStage(candidate, destination);

    cy.wait('@moveCandidate').then(({ request, response }) => {
      expect(new URL(request.url).pathname).to.equal(`/candidates/${candidate.id}`);
      expect(request.body).to.deep.equal({
        applicationId: candidate.applicationId,
        currentInterviewStep: destination.id,
      });
      expect(response.statusCode).to.equal(200);
    });

    expectCardInStage(candidate, destination);
    cy.get(stageById(source.id)).find(cardById(candidate.id)).should('not.exist');

    cy.request(`${api}/positions/${id}/candidates`).then(({ status, body }) => {
      expect(status).to.equal(200);
      const application = body.find((item) => item.applicationId === candidate.applicationId);
      expect(application, 'application returned by Express').to.exist;
      expect(application.currentInterviewStep).to.equal(destination.name);
    });

    cy.reload();
    waitForPosition();
    expectCardInStage(candidate, destination);
    cy.get(stageById(source.id)).find(cardById(candidate.id)).should('not.exist');
  });
});
