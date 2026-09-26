const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/db');
const { hashPassword } = require('../../src/utils/auth');

describe('Judging Assignment Engine API Tests (Phase 10)', () => {
  let organizerToken;
  let adminToken;
  let judge1Token;
  let judge2Token;
  let judge3Token;
  let participantToken;

  let organizer;
  let judge1;
  let judge2;
  let judge3;
  let participantAlice;
  let participantBob;

  let event;
  let team1;
  let team2;
  let team3;
  let sub1;
  let sub2;
  let sub3;

  beforeAll(async () => {
    // 1. Pre-cleanup
    await prisma.score.deleteMany({ where: { assignment: { event: { slug: 'phase10-judging-hackathon' } } } });
    await prisma.judgeAssignment.deleteMany({ where: { event: { slug: 'phase10-judging-hackathon' } } });
    await prisma.submission.deleteMany({ where: { event: { slug: 'phase10-judging-hackathon' } } });
    await prisma.teamMember.deleteMany({ where: { team: { event: { slug: 'phase10-judging-hackathon' } } } });
    await prisma.team.deleteMany({ where: { event: { slug: 'phase10-judging-hackathon' } } });
    await prisma.rubricCriteria.deleteMany({ where: { event: { slug: 'phase10-judging-hackathon' } } });
    await prisma.event.deleteMany({ where: { slug: 'phase10-judging-hackathon' } });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'p10_org@example.com',
            'p10_admin@example.com',
            'p10_judge1@example.com',
            'p10_judge2@example.com',
            'p10_judge3@example.com',
            'p10_alice@example.com',
            'p10_bob@example.com',
          ],
        },
      },
    });

    const passwordHash = await hashPassword('Password123!');

    // 2. Create Users
    organizer = await prisma.user.create({
      data: { email: 'p10_org@example.com', name: 'Org Olivia', passwordHash, role: 'ORGANIZER' },
    });
    const admin = await prisma.user.create({
      data: { email: 'p10_admin@example.com', name: 'Admin Adam', passwordHash, role: 'ADMIN' },
    });
    judge1 = await prisma.user.create({
      data: { email: 'p10_judge1@example.com', name: 'Judge Judy', passwordHash, role: 'JUDGE' },
    });
    judge2 = await prisma.user.create({
      data: { email: 'p10_judge2@example.com', name: 'Judge Jack', passwordHash, role: 'JUDGE' },
    });
    judge3 = await prisma.user.create({
      data: { email: 'p10_judge3@example.com', name: 'Judge Jill', passwordHash, role: 'JUDGE' },
    });
    participantAlice = await prisma.user.create({
      data: { email: 'p10_alice@example.com', name: 'Alice Algorithm', passwordHash, role: 'PARTICIPANT' },
    });
    participantBob = await prisma.user.create({
      data: { email: 'p10_bob@example.com', name: 'Bob Byte', passwordHash, role: 'PARTICIPANT' },
    });

    // 3. Logins to get tokens
    const [resOrg, resAdmin, resJ1, resJ2, resJ3, resPart] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'p10_org@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'p10_admin@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'p10_judge1@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'p10_judge2@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'p10_judge3@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'p10_alice@example.com', password: 'Password123!' }),
    ]);

    organizerToken = resOrg.body.token;
    adminToken = resAdmin.body.token;
    judge1Token = resJ1.body.token;
    judge2Token = resJ2.body.token;
    judge3Token = resJ3.body.token;
    participantToken = resPart.body.token;

    // 4. Create Event
    event = await prisma.event.create({
      data: {
        name: 'Phase 10 Judging Event',
        slug: 'phase10-judging-hackathon',
        description: 'Testing judge allocation and COI avoidance',
        status: 'JUDGING',
        submissionDeadline: new Date(Date.now() - 86400000),
        judgingDeadline: new Date(Date.now() + 86400000 * 5),
        votingDeadline: new Date(Date.now() + 86400000 * 10),
        organizerId: organizer.id,
      },
    });

    // 5. Create 3 Teams & Submissions (with COI setup for Judge 1 on Team 1)
    // Team 1 has Judge 1 as a member (COI!)
    team1 = await prisma.team.create({
      data: {
        name: 'Team Alpha COI',
        eventId: event.id,
        inviteCode: 'ALPHA-COI',
        creatorId: participantAlice.id,
        members: {
          create: [
            { userId: participantAlice.id, role: 'LEADER' },
            { userId: judge1.id, role: 'MEMBER' }, // Judge 1 is in this team!
          ],
        },
      },
    });

    sub1 = await prisma.submission.create({
      data: {
        eventId: event.id,
        teamId: team1.id,
        title: 'Alpha Neural Net',
        tagline: 'High speed vision neural network',
        description: 'Complete project description for Alpha Neural Net',
        techStack: JSON.stringify(['Python', 'PyTorch']),
        isDraft: false,
        submittedAt: new Date(),
      },
    });

    // Team 2 (Clean)
    team2 = await prisma.team.create({
      data: {
        name: 'Team Beta',
        eventId: event.id,
        inviteCode: 'BETA-CLEAN',
        creatorId: participantBob.id,
        members: {
          create: [{ userId: participantBob.id, role: 'LEADER' }],
        },
      },
    });

    sub2 = await prisma.submission.create({
      data: {
        eventId: event.id,
        teamId: team2.id,
        title: 'Beta Blockchain Store',
        tagline: 'Decentralized verifiable storage network',
        description: 'Complete project description for Beta Blockchain Store',
        techStack: JSON.stringify(['Solidity', 'Rust']),
        isDraft: false,
        submittedAt: new Date(),
      },
    });

    // Team 3 (Clean)
    team3 = await prisma.team.create({
      data: {
        name: 'Team Gamma',
        eventId: event.id,
        inviteCode: 'GAMMA-CLEAN',
        creatorId: participantAlice.id,
        members: {
          create: [{ userId: participantAlice.id, role: 'LEADER' }],
        },
      },
    });

    sub3 = await prisma.submission.create({
      data: {
        eventId: event.id,
        teamId: team3.id,
        title: 'Gamma Quantum Tool',
        tagline: 'Interactive quantum gate explorer',
        description: 'Complete project description for Gamma Quantum Tool',
        techStack: JSON.stringify(['TypeScript', 'Three.js']),
        isDraft: false,
        submittedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    if (event) {
      await prisma.score.deleteMany({ where: { assignment: { eventId: event.id } } });
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
            'p10_org@example.com',
            'p10_admin@example.com',
            'p10_judge1@example.com',
            'p10_judge2@example.com',
            'p10_judge3@example.com',
            'p10_alice@example.com',
            'p10_bob@example.com',
          ],
        },
      },
    });
  });

  describe('Automated Round-Robin Assignment (POST /api/judging/assign/round-robin)', () => {
    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/judging/assign/round-robin')
        .send({ eventId: event.id });
      expect(res.status).toBe(401);
    });

    it('should reject PARTICIPANT role with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/judging/assign/round-robin')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ eventId: event.id });
      expect(res.status).toBe(403);
    });

    it('should successfully distribute projects to judges while strictly preventing COI', async () => {
      const res = await request(app)
        .post('/api/judging/assign/round-robin')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          eventId: event.id,
          judgesPerProject: 2,
          clearExisting: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.totalProjects).toBe(3);
      expect(res.body.data.createdCount).toBeGreaterThan(0);

      // Verify that Judge 1 is NEVER assigned to Team 1 (sub1) due to Conflict of Interest
      const coiAssignment = await prisma.judgeAssignment.findUnique({
        where: {
          judgeId_submissionId: {
            judgeId: judge1.id,
            submissionId: sub1.id,
          },
        },
      });
      expect(coiAssignment).toBeNull();

      // Verify each project has assignments
      const sub1Assignments = await prisma.judgeAssignment.findMany({
        where: { submissionId: sub1.id },
      });
      expect(sub1Assignments.length).toBe(2);
      // Assignments must be judge2, judge3, or organizer/admin, but NOT judge1
      const assignedJudgeIds = sub1Assignments.map(a => a.judgeId);
      expect(assignedJudgeIds).not.toContain(judge1.id);
    });
  });

  describe('Manual Assignment (POST /api/judging/assign/manual)', () => {
    it('should reject assigning a judge to a submission when Conflict of Interest exists (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/judging/assign/manual')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          eventId: event.id,
          judgeId: judge1.id,
          submissionId: sub1.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('CONFLICT_OF_INTEREST');
    });

    it('should reject assigning a non-judge user role (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/judging/assign/manual')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          eventId: event.id,
          judgeId: participantAlice.id,
          submissionId: sub2.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_JUDGE_ROLE');
    });

    it('should successfully manually assign an eligible judge without COI (201 Created)', async () => {
      // First ensure judge1 is not assigned to sub2
      await prisma.judgeAssignment.deleteMany({
        where: { judgeId: judge1.id, submissionId: sub2.id },
      });

      const res = await request(app)
        .post('/api/judging/assign/manual')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          eventId: event.id,
          judgeId: judge1.id,
          submissionId: sub2.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.assignment.judgeId).toBe(judge1.id);
      expect(res.body.assignment.submissionId).toBe(sub2.id);
    });

    it('should reject duplicate assignment with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/judging/assign/manual')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          eventId: event.id,
          judgeId: judge1.id,
          submissionId: sub2.id,
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('ASSIGNMENT_EXISTS');
    });
  });

  describe('Listing & Metrics (GET /api/judging/assignments)', () => {
    it('should return assignments and coverage metrics for organizer', async () => {
      const res = await request(app)
        .get(`/api/judging/assignments?eventId=${event.id}`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.assignments).toBeDefined();
      expect(res.body.metrics.totalAssignments).toBeGreaterThan(0);
      expect(res.body.metrics.pendingAssignments).toBeDefined();
    });
  });

  describe('Judge Queue (GET /api/judging/my-assignments)', () => {
    it('should allow logged-in judge to fetch their own assigned evaluation queue', async () => {
      const res = await request(app)
        .get(`/api/judging/my-assignments?eventId=${event.id}`)
        .set('Authorization', `Bearer ${judge1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.assignments).toBeDefined();
      expect(Array.isArray(res.body.assignments)).toBe(true);
      // All returned assignments must belong to judge1
      res.body.assignments.forEach(a => {
        expect(a.judgeId).toBe(judge1.id);
        // None should be sub1 (COI)
        expect(a.submissionId).not.toBe(sub1.id);
      });
    });
  });

  describe('Remove Assignment (DELETE /api/judging/assignments/:id)', () => {
    it('should allow organizer to remove a judge assignment', async () => {
      // Find an existing assignment
      const assignment = await prisma.judgeAssignment.findFirst({
        where: { eventId: event.id },
      });
      expect(assignment).toBeDefined();

      const res = await request(app)
        .delete(`/api/judging/assignments/${assignment.id}`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/removed successfully/i);

      // Verify deleted in DB
      const check = await prisma.judgeAssignment.findUnique({
        where: { id: assignment.id },
      });
      expect(check).toBeNull();
    });
  });
});
