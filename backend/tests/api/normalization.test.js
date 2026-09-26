const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/db');
const { hashPassword } = require('../../src/utils/auth');

describe('Z-Score Normalization Engine API Tests (Phase 12)', () => {
  let organizerToken;
  let adminToken;
  let judgeAToken;
  let judgeBToken;
  let judgeCToken;
  let participantToken;

  let organizer;
  let judgeA;
  let judgeB;
  let judgeC;
  let participant;

  let event;
  let criterion;
  let project1;
  let project2;
  let project3;

  beforeAll(async () => {
    // 1. Cleanup
    await prisma.score.deleteMany({ where: { assignment: { event: { slug: 'phase12-normalization-hackathon' } } } });
    await prisma.projectScoreSummary.deleteMany({ where: { submission: { event: { slug: 'phase12-normalization-hackathon' } } } });
    await prisma.judgeAssignment.deleteMany({ where: { event: { slug: 'phase12-normalization-hackathon' } } });
    await prisma.submission.deleteMany({ where: { event: { slug: 'phase12-normalization-hackathon' } } });
    await prisma.teamMember.deleteMany({ where: { team: { event: { slug: 'phase12-normalization-hackathon' } } } });
    await prisma.team.deleteMany({ where: { event: { slug: 'phase12-normalization-hackathon' } } });
    await prisma.rubricCriteria.deleteMany({ where: { event: { slug: 'phase12-normalization-hackathon' } } });
    await prisma.event.deleteMany({ where: { slug: 'phase12-normalization-hackathon' } });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'p12_org@example.com',
            'p12_admin@example.com',
            'p12_judge_a@example.com',
            'p12_judge_b@example.com',
            'p12_judge_c@example.com',
            'p12_part@example.com',
          ],
        },
      },
    });

    const passwordHash = await hashPassword('Password123!');

    // 2. Create Users
    organizer = await prisma.user.create({
      data: { email: 'p12_org@example.com', name: 'Org Norm', passwordHash, role: 'ORGANIZER' },
    });
    const admin = await prisma.user.create({
      data: { email: 'p12_admin@example.com', name: 'Admin Norm', passwordHash, role: 'ADMIN' },
    });
    judgeA = await prisma.user.create({
      data: { email: 'p12_judge_a@example.com', name: 'Judge Harsh', passwordHash, role: 'JUDGE' },
    });
    judgeB = await prisma.user.create({
      data: { email: 'p12_judge_b@example.com', name: 'Judge Lenient', passwordHash, role: 'JUDGE' },
    });
    judgeC = await prisma.user.create({
      data: { email: 'p12_judge_c@example.com', name: 'Judge Uniform', passwordHash, role: 'JUDGE' },
    });
    participant = await prisma.user.create({
      data: { email: 'p12_part@example.com', name: 'Part User', passwordHash, role: 'PARTICIPANT' },
    });

    // 3. Logins
    const [resOrg, resAdmin, resJA, resJB, resJC, resPart] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'p12_org@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'p12_admin@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'p12_judge_a@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'p12_judge_b@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'p12_judge_c@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'p12_part@example.com', password: 'Password123!' }),
    ]);

    organizerToken = resOrg.body.token;
    adminToken = resAdmin.body.token;
    judgeAToken = resJA.body.token;
    judgeBToken = resJB.body.token;
    judgeCToken = resJC.body.token;
    participantToken = resPart.body.token;

    // 4. Create Event & Criteria
    event = await prisma.event.create({
      data: {
        name: 'Phase 12 Normalization Event',
        slug: 'phase12-normalization-hackathon',
        description: 'Z-score statistical normalization testing',
        status: 'JUDGING',
        submissionDeadline: new Date(Date.now() - 86400000),
        judgingDeadline: new Date(Date.now() + 86400000 * 5),
        votingDeadline: new Date(Date.now() + 86400000 * 10),
        organizerId: organizer.id,
      },
    });

    criterion = await prisma.rubricCriteria.create({
      data: {
        eventId: event.id,
        name: 'Overall Impact',
        description: 'Overall project quality',
        weight: 1.0,
        minScore: 1.0,
        maxScore: 10.0,
      },
    });

    // 5. Teams & Projects (Project 1, Project 2, Project 3)
    const t1 = await prisma.team.create({
      data: {
        name: 'Team Project One',
        eventId: event.id,
        inviteCode: 'P12-T1',
        creatorId: participant.id,
        members: { create: [{ userId: participant.id, role: 'LEADER' }] },
      },
    });
    project1 = await prisma.submission.create({
      data: {
        eventId: event.id,
        teamId: t1.id,
        title: 'Project Lower Rated',
        tagline: 'Underdog project',
        description: 'Testing lower relative rating',
        techStack: JSON.stringify(['Node']),
        isDraft: false,
        submittedAt: new Date(),
      },
    });

    const t2 = await prisma.team.create({
      data: {
        name: 'Team Project Two',
        eventId: event.id,
        inviteCode: 'P12-T2',
        creatorId: participant.id,
        members: { create: [{ userId: participant.id, role: 'LEADER' }] },
      },
    });
    project2 = await prisma.submission.create({
      data: {
        eventId: event.id,
        teamId: t2.id,
        title: 'Project Higher Rated',
        tagline: 'Champion project',
        description: 'Testing higher relative rating',
        techStack: JSON.stringify(['Rust']),
        isDraft: false,
        submittedAt: new Date(),
      },
    });

    const t3 = await prisma.team.create({
      data: {
        name: 'Team Project Three',
        eventId: event.id,
        inviteCode: 'P12-T3',
        creatorId: participant.id,
        members: { create: [{ userId: participant.id, role: 'LEADER' }] },
      },
    });
    project3 = await prisma.submission.create({
      data: {
        eventId: event.id,
        teamId: t3.id,
        title: 'Project Uniform Tested',
        tagline: 'Uniform judge test project',
        description: 'Testing zero-variance edge cases',
        techStack: JSON.stringify(['Python']),
        isDraft: false,
        submittedAt: new Date(),
      },
    });

    // 6. Judge Assignments & Scoring Setup:
    // Judge A (Harsh):
    //   - Project 1 score = 4.0
    //   - Project 2 score = 6.0
    //   (Mean = 5.0, Variance = 1.0, StdDev = 1.0. Z1 = -1.0, Z2 = +1.0)
    const assignA1 = await prisma.judgeAssignment.create({
      data: { eventId: event.id, judgeId: judgeA.id, submissionId: project1.id, status: 'COMPLETED' },
    });
    await prisma.score.create({
      data: { assignmentId: assignA1.id, criteriaId: criterion.id, scoreValue: 4.0 },
    });

    const assignA2 = await prisma.judgeAssignment.create({
      data: { eventId: event.id, judgeId: judgeA.id, submissionId: project2.id, status: 'COMPLETED' },
    });
    await prisma.score.create({
      data: { assignmentId: assignA2.id, criteriaId: criterion.id, scoreValue: 6.0 },
    });

    // Judge B (Lenient):
    //   - Project 1 score = 8.0
    //   - Project 2 score = 10.0
    //   (Mean = 9.0, Variance = 1.0, StdDev = 1.0. Z1 = -1.0, Z2 = +1.0)
    const assignB1 = await prisma.judgeAssignment.create({
      data: { eventId: event.id, judgeId: judgeB.id, submissionId: project1.id, status: 'COMPLETED' },
    });
    await prisma.score.create({
      data: { assignmentId: assignB1.id, criteriaId: criterion.id, scoreValue: 8.0 },
    });

    const assignB2 = await prisma.judgeAssignment.create({
      data: { eventId: event.id, judgeId: judgeB.id, submissionId: project2.id, status: 'COMPLETED' },
    });
    await prisma.score.create({
      data: { assignmentId: assignB2.id, criteriaId: criterion.id, scoreValue: 10.0 },
    });

    // Judge C (Uniform: gives 7.0 to both Project 2 and Project 3 -> StdDev = 0, zero-variance test)
    const assignC2 = await prisma.judgeAssignment.create({
      data: { eventId: event.id, judgeId: judgeC.id, submissionId: project2.id, status: 'COMPLETED' },
    });
    await prisma.score.create({
      data: { assignmentId: assignC2.id, criteriaId: criterion.id, scoreValue: 7.0 },
    });

    const assignC3 = await prisma.judgeAssignment.create({
      data: { eventId: event.id, judgeId: judgeC.id, submissionId: project3.id, status: 'COMPLETED' },
    });
    await prisma.score.create({
      data: { assignmentId: assignC3.id, criteriaId: criterion.id, scoreValue: 7.0 },
    });
  });

  afterAll(async () => {
    if (event) {
      await prisma.score.deleteMany({ where: { assignment: { eventId: event.id } } });
      await prisma.projectScoreSummary.deleteMany({ where: { submission: { eventId: event.id } } });
      await prisma.judgeAssignment.deleteMany({ where: { eventId: event.id } });
      await prisma.submission.deleteMany({ where: { eventId: event.id } });
      await prisma.teamMember.deleteMany({ where: { team: { eventId: event.id } } });
      await prisma.team.deleteMany({ where: { eventId: event.id } });
      await prisma.rubricCriteria.deleteMany({ where: { eventId: event.id } });
      await prisma.event.deleteMany({ where: { id: event.id } });
    }
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'p12_org@example.com',
            'p12_admin@example.com',
            'p12_judge_a@example.com',
            'p12_judge_b@example.com',
            'p12_judge_c@example.com',
            'p12_part@example.com',
          ],
        },
      },
    });
  });

  describe('POST /api/judging/normalize (Z-Score Normalization Execution)', () => {
    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/judging/normalize')
        .send({ eventId: event.id });
      expect(res.status).toBe(401);
    });

    it('should reject non-organizer role with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/judging/normalize')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ eventId: event.id });
      expect(res.status).toBe(403);
    });

    it('should accurately compute Z-Scores and update database summaries', async () => {
      const res = await request(app)
        .post('/api/judging/normalize')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ eventId: event.id });

      expect(res.status).toBe(200);
      expect(res.body.data.totalEvaluations).toBe(6);
      expect(res.body.data.judgeStats).toHaveLength(3);

      // Verify Judge Stats
      const statsA = res.body.data.judgeStats.find(s => s.judgeId === judgeA.id);
      expect(statsA.mean).toBe(5.0);
      expect(statsA.stdDev).toBe(1.0);

      const statsB = res.body.data.judgeStats.find(s => s.judgeId === judgeB.id);
      expect(statsB.mean).toBe(9.0);
      expect(statsB.stdDev).toBe(1.0);

      const statsC = res.body.data.judgeStats.find(s => s.judgeId === judgeC.id);
      expect(statsC.stdDev).toBe(0.0);
      expect(statsC.hasZeroVariance).toBe(true);

      // Verify Project 1 Z-Score:
      // Evaluated by Judge A (score 4.0 -> Z = -1.0) and Judge B (score 8.0 -> Z = -1.0)
      // Project 1 mean Z = (-1.0 + -1.0) / 2 = -1.0
      const summary1 = await prisma.projectScoreSummary.findUnique({
        where: { submissionId: project1.id },
      });
      expect(summary1.normalizedZScore).toBe(-1.0);
      expect(summary1.rawScoreMean).toBe(6.0); // (4 + 8) / 2 = 6.0

      // Verify Project 2 Z-Score:
      // Evaluated by Judge A (Z = +1.0), Judge B (Z = +1.0), Judge C (Z = 0.0)
      // Project 2 mean Z = (1.0 + 1.0 + 0.0) / 3 = 0.6667
      const summary2 = await prisma.projectScoreSummary.findUnique({
        where: { submissionId: project2.id },
      });
      expect(summary2.normalizedZScore).toBeCloseTo(0.6667, 3);
    });
  });

  describe('GET /api/judging/stats/:eventId (Judging Overview & Analytics)', () => {
    it('should return overview progress and full normalization statistics for organizer', async () => {
      const res = await request(app)
        .get(`/api/judging/stats/${event.id}`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.overview.totalAssignments).toBe(6);
      expect(res.body.overview.completedAssignments).toBe(6);
      expect(res.body.overview.progressPercent).toBe(100);
      expect(res.body.normalization.projectSummaries).toHaveLength(3);
    });
  });
});
