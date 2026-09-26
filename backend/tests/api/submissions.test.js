const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../../src/app');
const prisma = require('../../src/db');

describe('Submissions & Deadlines API Tests (Phase 7)', () => {
  let eventId;
  let trackId;
  let expiredEventId;
  let teamLeadToken;
  let teamMemberToken;
  let outsiderToken;
  let testTeamId;
  let createdSubmissionId;

  beforeAll(async () => {
    // 1. Fetch active event and track
    const event = await prisma.event.findFirst({
      where: { slug: 'dogfood-2026' },
      include: { tracks: true },
    });
    eventId = event.id;
    trackId = event.tracks[0].id;

    // 2. Create an expired event for deadline testing
    const now = Date.now();
    const expiredEvent = await prisma.event.create({
      data: {
        name: 'Past Hackathon 2025',
        slug: 'past-hackathon-2025',
        description: 'An expired hackathon.',
        submissionDeadline: new Date(now - 86400000), // 1 day in past!
        judgingDeadline: new Date(now + 86400000),
        votingDeadline: new Date(now + 2 * 86400000),
        organizerId: event.organizerId,
      },
    });
    expiredEventId = expiredEvent.id;

    // 3. Register test users
    const u1 = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Sub Lead', email: 'sublead@dogfood.test', password: 'Password123!' });
    teamLeadToken = u1.body.token;

    const u2 = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Sub Member', email: 'submember@dogfood.test', password: 'Password123!' });
    teamMemberToken = u2.body.token;

    const u3 = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Outsider', email: 'outsider@dogfood.test', password: 'Password123!' });
    outsiderToken = u3.body.token;

    // 4. Create team and add member
    const teamRes = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${teamLeadToken}`)
      .send({ eventId, name: 'NebulaProtocol' });
    testTeamId = teamRes.body.team.id;

    await request(app)
      .post('/api/teams/join')
      .set('Authorization', `Bearer ${teamMemberToken}`)
      .send({ inviteCode: teamRes.body.team.inviteCode });
  });

  afterAll(async () => {
    // Clean up test records
    await prisma.user.deleteMany({
      where: { email: { in: ['sublead@dogfood.test', 'submember@dogfood.test', 'outsider@dogfood.test'] } },
    });
    if (testTeamId) {
      await prisma.team.deleteMany({ where: { id: testTeamId } });
    }
    if (expiredEventId) {
      await prisma.event.deleteMany({ where: { id: expiredEventId } });
    }
    await prisma.$disconnect();
  });

  describe('POST /api/submissions/draft (Draft Saving)', () => {
    it('should allow a team member to create/save a submission draft (200 OK)', async () => {
      const res = await request(app)
        .post('/api/submissions/draft')
        .set('Authorization', `Bearer ${teamLeadToken}`)
        .send({
          eventId,
          teamId: testTeamId,
          title: 'NebulaKV — Distributed In-Memory Cache',
          tagline: 'High-throughput peer-to-peer memory caching engine.',
          description: 'NebulaKV uses localized Raft consensus for ultra-fast cache replication.',
          trackId,
          techStack: ['Go', 'gRPC', 'WebAssembly'],
          repoUrl: 'https://github.com/dogfood-test/nebula-kv',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('submission');
      expect(res.body.submission.title).toEqual('NebulaKV — Distributed In-Memory Cache');
      expect(res.body.submission.isDraft).toBe(true);
      expect(res.body.submission.submittedAt).toBeNull();

      createdSubmissionId = res.body.submission.id;
    });

    it('should reject non-team member from modifying the team draft (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/submissions/draft')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({
          eventId,
          teamId: testTeamId,
          title: 'Malicious Overwrite Attempt',
        });

      expect(res.statusCode).toEqual(403);
      expect(res.body.code).toEqual('NOT_TEAM_MEMBER');
    });

    it('should reject draft submission if event deadline has passed (403 Forbidden)', async () => {
      // Create team in expired event directly for testing
      const expTeam = await prisma.team.create({
        data: {
          eventId: expiredEventId,
          name: 'ExpiredHackTeam',
          inviteCode: 'EXP-999',
          creatorId: (await prisma.user.findFirst({ where: { email: 'sublead@dogfood.test' } })).id,
          members: {
            create: {
              userId: (await prisma.user.findFirst({ where: { email: 'sublead@dogfood.test' } })).id,
              role: 'LEADER',
            },
          },
        },
      });

      const res = await request(app)
        .post('/api/submissions/draft')
        .set('Authorization', `Bearer ${teamLeadToken}`)
        .send({
          eventId: expiredEventId,
          teamId: expTeam.id,
          title: 'Late Submission Attempt',
        });

      expect(res.statusCode).toEqual(403);
      expect(res.body.code).toEqual('DEADLINE_PASSED');

      await prisma.team.deleteMany({ where: { id: expTeam.id } });
    });
  });

  describe('GET /api/submissions/:id (Draft Privacy vs Public Visibility)', () => {
    it('should allow team member to view their draft submission (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/submissions/${createdSubmissionId}`)
        .set('Authorization', `Bearer ${teamMemberToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.submission.id).toEqual(createdSubmissionId);
      expect(res.body.submission.isDraft).toBe(true);
    });

    it('should reject outsider/anonymous visitor from viewing private draft (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/submissions/${createdSubmissionId}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.code).toEqual('DRAFT_PRIVATE');
    });
  });

  describe('POST /api/submissions/:id/ship (Final Ship & Lock)', () => {
    it('should reject final shipping if pre-flight checklist is incomplete (400 Bad Request)', async () => {
      // Temporarily strip required fields on draft
      await prisma.submission.update({
        where: { id: createdSubmissionId },
        data: {
          tagline: '',
          description: '',
          techStack: JSON.stringify([]),
        },
      });

      const res = await request(app)
        .post(`/api/submissions/${createdSubmissionId}/ship`)
        .set('Authorization', `Bearer ${teamLeadToken}`);

      expect(res.statusCode).toEqual(400);
      expect(res.body.code).toEqual('PREFLIGHT_CHECK_FAILED');
      expect(res.body.missingFields.length).toBeGreaterThanOrEqual(2);

      // Restore complete draft
      await prisma.submission.update({
        where: { id: createdSubmissionId },
        data: {
          tagline: 'High-throughput peer-to-peer memory caching engine.',
          description: 'NebulaKV uses localized Raft consensus for ultra-fast cache replication.',
          techStack: JSON.stringify(['Go', 'gRPC', 'WebAssembly']),
        },
      });
    });

    it('should successfully finalize and lock valid submission (200 OK)', async () => {
      const res = await request(app)
        .post(`/api/submissions/${createdSubmissionId}/ship`)
        .set('Authorization', `Bearer ${teamLeadToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.submission.isDraft).toBe(false);
      expect(res.body.submission.submittedAt).not.toBeNull();
    });

    it('should strictly reject subsequent edit attempts on a locked submission (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/submissions/draft')
        .set('Authorization', `Bearer ${teamLeadToken}`)
        .send({
          eventId,
          teamId: testTeamId,
          title: 'Sneaky Post-Lock Modification',
        });

      expect(res.statusCode).toEqual(403);
      expect(res.body.code).toEqual('SUBMISSION_LOCKED');
    });
  });

  describe('POST /api/submissions/upload (Local Media Upload)', () => {
    const dummyFilePath = path.resolve(__dirname, 'dummy_test_image.png');

    beforeAll(() => {
      // Create a tiny 1x1 PNG buffer for testing
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
        0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
        0x42, 0x60, 0x82
      ]);
      fs.writeFileSync(dummyFilePath, pngHeader);
    });

    afterAll(() => {
      if (fs.existsSync(dummyFilePath)) {
        fs.unlinkSync(dummyFilePath);
      }
    });

    it('should upload image file and return static file URL', async () => {
      const res = await request(app)
        .post('/api/submissions/upload')
        .set('Authorization', `Bearer ${teamLeadToken}`)
        .attach('file', dummyFilePath);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('fileUrl');
      expect(res.body.fileUrl.startsWith('/uploads/')).toBe(true);
    });
  });
});
