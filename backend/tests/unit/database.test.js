const prisma = require('../../src/db');

describe('Database Schema & Integrity Tests (Phase 2)', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should find the seeded organizer, judges, and participants', async () => {
    const users = await prisma.user.findMany();
    expect(users.length).toBeGreaterThanOrEqual(14); // 1 org + 1 admin + 4 judges + 8 participants

    const organizer = await prisma.user.findUnique({ where: { email: 'organizer@dogfood.test' } });
    expect(organizer).toBeDefined();
    expect(organizer.role).toEqual('ORGANIZER');

    const judge1 = await prisma.user.findUnique({ where: { email: 'judge1@dogfood.test' } });
    expect(judge1).toBeDefined();
    expect(judge1.role).toEqual('JUDGE');
  });

  it('should reject creating a user with a duplicate email (Unique Constraint)', async () => {
    await expect(
      prisma.user.create({
        data: {
          email: 'organizer@dogfood.test',
          name: 'Imposter',
          passwordHash: 'dummy',
          role: 'PARTICIPANT',
        },
      })
    ).rejects.toThrow();
  });

  it('should verify seeded event and related tracks, prizes, and criteria', async () => {
    const event = await prisma.event.findUnique({
      where: { slug: 'dogfood-2026' },
      include: {
        tracks: true,
        prizes: true,
        rubricCriteria: true,
        teams: true,
        submissions: true,
      },
    });

    expect(event).toBeDefined();
    expect(event.tracks.length).toEqual(3);
    expect(event.prizes.length).toEqual(3);
    expect(event.rubricCriteria.length).toEqual(4);
    expect(event.teams.length).toEqual(4);
    expect(event.submissions.length).toEqual(4);

    // Verify rubric weights sum to 1.0 (100%)
    const totalWeight = event.rubricCriteria.reduce((sum, c) => sum + c.weight, 0);
    expect(Math.round(totalWeight * 100) / 100).toEqual(1.0);
  });

  it('should verify judge assignments and score integrity', async () => {
    const assignments = await prisma.judgeAssignment.findMany({
      include: { scores: true },
    });

    expect(assignments.length).toEqual(12); // 4 judges * 3 projects each
    for (const a of assignments) {
      expect(a.scores.length).toEqual(4); // 4 criteria scored per assignment
    }
  });

  it('should reject assigning the same judge to the same project twice (Unique Constraint)', async () => {
    const firstAssignment = await prisma.judgeAssignment.findFirst();
    expect(firstAssignment).toBeDefined();

    await expect(
      prisma.judgeAssignment.create({
        data: {
          eventId: firstAssignment.eventId,
          judgeId: firstAssignment.judgeId,
          submissionId: firstAssignment.submissionId,
        },
      })
    ).rejects.toThrow();
  });

  it('should verify audit logs are recorded and queryable', async () => {
    const logs = await prisma.auditLog.findMany();
    expect(logs.length).toBeGreaterThanOrEqual(2);
    expect(logs[0]).toHaveProperty('action');
    expect(logs[0]).toHaveProperty('timestamp');
  });
});
