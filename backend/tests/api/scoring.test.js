const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/db');
const { hashPassword } = require('../../src/utils/auth');

describe('Multi-Dimensional Scoring Engine API Tests (Phase 11)', () => {
  let organizerToken;
  let adminToken;
  let judge1Token;
  let judge2Token;
  let participantToken;

  let organizer;
  let judge1;
  let judge2;
  let participant;

  let event;
  let criterionTech;
  let criterionDesign;
  let team;
  let submission;
  let assignment1;
  let assignment2;

  beforeAll(async () => {
    // 1. Cleanup
    await prisma.score.deleteMany({ where: { assignment: { event: { slug: 'phase11-scoring-hackathon' } } } });
    await prisma.projectScoreSummary.deleteMany({ where: { submission: { event: { slug: 'phase11-scoring-hackathon' } } } });
    await prisma.judgeAssignment.deleteMany({ where: { event: { slug: 'phase11-scoring-hackathon' } } });
    await prisma.submission.deleteMany({ where: { event: { slug: 'phase11-scoring-hackathon' } } });
    await prisma.teamMember.deleteMany({ where: { team: { event: { slug: 'phase11-scoring-hackathon' } } } });
    await prisma.team.deleteMany({ where: { event: { slug: 'phase11-scoring-hackathon' } } });
    await prisma.rubricCriteria.deleteMany({ where: { event: { slug: 'phase11-scoring-hackathon' } } });
    await prisma.event.deleteMany({ where: { slug: 'phase11-scoring-hackathon' } });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'p11_org@example.com',
            'p11_admin@example.com',
            'p11_judge1@example.com',
            'p11_judge2@example.com',
            'p11_part@example.com',
          ],
        },
      },
    });

    const passwordHash = await hashPassword('Password123!');

    // 2. Create Users
    organizer = await prisma.user.create({
      data: { email: 'p11_org@example.com', name: 'Org Scoring', passwordHash, role: 'ORGANIZER' },
    });
    const admin = await prisma.user.create({
      data: { email: 'p11_admin@example.com', name: 'Admin Scoring', passwordHash, role: 'ADMIN' },
    });
    judge1 = await prisma.user.create({
      data: { email: 'p11_judge1@example.com', name: 'Judge One', passwordHash, role: 'JUDGE' },
    });
    judge2 = await prisma.user.create({
      data: { email: 'p11_judge2@example.com', name: 'Judge Two', passwordHash, role: 'JUDGE' },
    });
    participant = await prisma.user.create({
      data: { email: 'p11_part@example.com', name: 'Part User', passwordHash, role: 'PARTICIPANT' },
    });

    // 3. Authenticate to get JWT tokens
    const [resOrg, resAdmin, resJ1, resJ2, resPart] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'p11_org@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'p11_admin@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'p11_judge1@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'p11_judge2@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'p11_part@example.com', password: 'Password123!' }),
    ]);

    organizerToken = resOrg.body.token;
    adminToken = resAdmin.body.token;
    judge1Token = resJ1.body.token;
    judge2Token = resJ2.body.token;
    participantToken = resPart.body.token;

    // 4. Create Event with Rubrics
    event = await prisma.event.create({
      data: {
        name: 'Phase 11 Scoring Hackathon',
        slug: 'phase11-scoring-hackathon',
        description: 'Multi-dimensional scoring test event',
        status: 'JUDGING',
        submissionDeadline: new Date(Date.now() - 86400000),
        judgingDeadline: new Date(Date.now() + 86400000 * 5),
        votingDeadline: new Date(Date.now() + 86400000 * 10),
        organizerId: organizer.id,
      },
    });

    criterionTech = await prisma.rubricCriteria.create({
      data: {
        eventId: event.id,
        name: 'Technical Depth',
        description: 'Quality of architecture and implementation',
        weight: 0.60,
        minScore: 1.0,
        maxScore: 10.0,
      },
    });

    criterionDesign = await prisma.rubricCriteria.create({
      data: {
        eventId: event.id,
        name: 'UI / UX Design',
        description: 'Elegance and usability of interface',
        weight: 0.40,
        minScore: 1.0,
        maxScore: 10.0,
      },
    });

    // 5. Team & Submission
    team = await prisma.team.create({
      data: {
        name: 'Scoring Team Alpha',
        eventId: event.id,
        inviteCode: 'SCORE-ALPHA',
        creatorId: participant.id,
        members: {
          create: [{ userId: participant.id, role: 'LEADER' }],
        },
      },
    });

    submission = await prisma.submission.create({
      data: {
        eventId: event.id,
        teamId: team.id,
        title: 'Quantum Score Visualizer',
        tagline: 'Real-time multi-dimensional analytics',
        description: 'Visualizing judge rubric distributions in 3D',
        techStack: JSON.stringify(['ThreeJS', 'WebGPU']),
        isDraft: false,
        submittedAt: new Date(),
      },
    });

    // 6. Judge Assignments
    assignment1 = await prisma.judgeAssignment.create({
      data: {
        eventId: event.id,
        judgeId: judge1.id,
        submissionId: submission.id,
        status: 'PENDING',
      },
    });

    assignment2 = await prisma.judgeAssignment.create({
      data: {
        eventId: event.id,
        judgeId: judge2.id,
        submissionId: submission.id,
        status: 'PENDING',
      },
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
            'p11_org@example.com',
            'p11_admin@example.com',
            'p11_judge1@example.com',
            'p11_judge2@example.com',
            'p11_part@example.com',
          ],
        },
      },
    });
  });

  describe('POST /api/judging/scores (Score Submission & Validation)', () => {
    it('should reject score submission without authentication (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/judging/scores')
        .send({
          assignmentId: assignment1.id,
          scores: [{ criteriaId: criterionTech.id, scoreValue: 8.5 }],
        });

      expect(res.status).toBe(401);
    });

    it('should reject judge from submitting scores for another judge’s assignment (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/judging/scores')
        .set('Authorization', `Bearer ${judge2Token}`) // Judge 2 attempting Judge 1's assignment
        .send({
          assignmentId: assignment1.id,
          scores: [{ criteriaId: criterionTech.id, scoreValue: 8.5 }],
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('NOT_ASSIGNED_JUDGE');
    });

    it('should reject scoreValue exceeding maximum allowed bound (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/judging/scores')
        .set('Authorization', `Bearer ${judge1Token}`)
        .send({
          assignmentId: assignment1.id,
          scores: [{ criteriaId: criterionTech.id, scoreValue: 15.0 }], // Max is 10.0
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('SCORE_OUT_OF_BOUNDS');
    });

    it('should reject scoreValue below minimum allowed bound (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/judging/scores')
        .set('Authorization', `Bearer ${judge1Token}`)
        .send({
          assignmentId: assignment1.id,
          scores: [{ criteriaId: criterionTech.id, scoreValue: 0.5 }], // Min is 1.0
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('SCORE_OUT_OF_BOUNDS');
    });

    it('should reject criteriaId not belonging to the event rubric (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/judging/scores')
        .set('Authorization', `Bearer ${judge1Token}`)
        .send({
          assignmentId: assignment1.id,
          scores: [{ criteriaId: 'non-existent-crit-id', scoreValue: 8.0 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_CRITERIA_ID');
    });

    it('should successfully submit valid multi-dimensional scores and transition assignment to COMPLETED', async () => {
      const res = await request(app)
        .post('/api/judging/scores')
        .set('Authorization', `Bearer ${judge1Token}`)
        .send({
          assignmentId: assignment1.id,
          scores: [
            { criteriaId: criterionTech.id, scoreValue: 9.0, feedback: 'Excellent architecture and memory efficiency.' },
            { criteriaId: criterionDesign.id, scoreValue: 8.0, feedback: 'Clean UI and intuitive controls.' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.assignment.status).toBe('COMPLETED');
      expect(res.body.assignment.scores).toHaveLength(2);

      // Verify ProjectScoreSummary was calculated:
      // Judge 1 weighted score = (9.0 * 0.60) + (8.0 * 0.40) = 5.4 + 3.2 = 8.6
      const summary = await prisma.projectScoreSummary.findUnique({
        where: { submissionId: submission.id },
      });
      expect(summary).toBeDefined();
      expect(summary.rawScoreMean).toBe(8.6);
    });

    it('should allow second judge to submit scores and automatically update project score mean', async () => {
      // Judge 2 gives 8.0 tech and 7.0 design
      // Judge 2 weighted score = (8.0 * 0.60) + (7.0 * 0.40) = 4.8 + 2.8 = 7.6
      // Combined mean = (8.6 + 7.6) / 2 = 8.1
      const res = await request(app)
        .post('/api/judging/scores')
        .set('Authorization', `Bearer ${judge2Token}`)
        .send({
          assignmentId: assignment2.id,
          scores: [
            { criteriaId: criterionTech.id, scoreValue: 8.0, feedback: 'Solid implementation.' },
            { criteriaId: criterionDesign.id, scoreValue: 7.0, feedback: 'Good UI presentation.' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.assignment.status).toBe('COMPLETED');

      const summary = await prisma.projectScoreSummary.findUnique({
        where: { submissionId: submission.id },
      });
      expect(summary.rawScoreMean).toBe(8.1);
    });
  });

  describe('GET /api/judging/scores/:assignmentId (Score Retrieval)', () => {
    it('should allow assigned judge to inspect their submitted score breakdown', async () => {
      const res = await request(app)
        .get(`/api/judging/scores/${assignment1.id}`)
        .set('Authorization', `Bearer ${judge1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.assignment.scores).toHaveLength(2);
      expect(res.body.assignment.scores[0].feedback).toBe('Excellent architecture and memory efficiency.');
    });

    it('should allow organizer to inspect any assignment score breakdown', async () => {
      const res = await request(app)
        .get(`/api/judging/scores/${assignment1.id}`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.assignment.scores).toHaveLength(2);
    });
  });
});
