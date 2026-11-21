const companyName = 'Position Cypress E2E';
const positionTitle = 'Ingeniero de calidad E2E';
const stageNames = ['Revision inicial', 'Entrevista tecnica'];
const candidates = [
  { firstName: 'Lucia', lastName: 'Vega', email: 'lucia.position@example.test' },
  { firstName: 'Mateo', lastName: 'Rios', email: 'mateo.position@example.test' },
];

async function resetPosition() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || new URL(databaseUrl).pathname !== '/lti_position_e2e') {
    throw new Error('Define DATABASE_URL para la base de pruebas lti_position_e2e.');
  }

  const { PrismaClient } = require('../../backend/node_modules/@prisma/client');
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });

  try {
    return await prisma.$transaction(async (db) => {
      const include = { interviewFlow: { include: { interviewSteps: true } } };
      const existingPosition = await db.position.findFirst({
        where: { title: positionTitle, company: { name: companyName } },
        include,
      });
      const position = existingPosition ?? await db.position.create({
        data: {
          title: positionTitle,
          description: 'Posicion de prueba de Cypress',
          jobDescription: 'Pruebas de calidad',
          location: 'Quito',
          isVisible: true,
          company: {
            connectOrCreate: { where: { name: companyName }, create: { name: companyName } },
          },
          interviewFlow: {
            create: {
              interviewSteps: {
                create: stageNames.map((name, orderIndex) => ({
                  name,
                  orderIndex,
                  interviewType: { create: { name } },
                })),
              },
            },
          },
        },
        include,
      });

      // Seed candidates and applications in opposite order so their IDs differ in a fresh database.
      const candidatesByEmail = new Map();
      for (const candidateData of [...candidates].reverse()) {
        const candidate = await db.candidate.upsert({
          where: { email: candidateData.email },
          create: candidateData,
          update: candidateData,
        });
        candidatesByEmail.set(candidate.email, candidate);
      }

      const stages = [];
      for (const [index, name] of stageNames.entries()) {
        const step = position.interviewFlow.interviewSteps.find((item) => item.name === name);
        const candidateData = candidates[index];
        const candidate = candidatesByEmail.get(candidateData.email);
        const applicationKey = { positionId: position.id, candidateId: candidate.id };
        const existingApplication = await db.application.findFirst({ where: applicationKey });
        const application = existingApplication
          ? await db.application.update({
              where: { id: existingApplication.id },
              data: { currentInterviewStep: step.id },
            })
          : await db.application.create({
              data: {
                ...applicationKey,
                applicationDate: new Date('2024-06-01T00:00:00Z'),
                currentInterviewStep: step.id,
              },
            });

        stages.push({
          id: step.id,
          name,
          candidate: {
            id: candidate.id,
            applicationId: application.id,
            name: `${candidateData.firstName} ${candidateData.lastName}`,
          },
        });
      }

      return { id: position.id, title: positionTitle, stages };
    });
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { resetPosition };
