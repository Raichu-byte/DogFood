const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/db');
const { hashPassword } = require('../../src/utils/auth');

describe('Winner Declaration & Prize Assignment API Tests (Phase 15)', () => {
  let organizerToken;
  let adminToken;
  let participantToken;

  let organizer;
  let admin;
  let participant;

  let event;
  let prizeGrand;
  let prizeTrack;
  let trackAI;
  let winningSub;

  beforeAll(async () => {
    // 1. Cleanup
    await prisma.prize.deleteMany({
      where: { event: { slug: 'phase15-winners-hackathon' } },
    });
    await prisma.submission.deleteMany({
      where: { event: { slug: 'phase15-winners-hackathon' } },
    });
    await prisma.teamMember.deleteMany({
      where: { team: { event: { slug: 'phase15-winners-hackathon' } } },
    });
    await prisma.team.deleteMany({
      where: { event: { slug: 'phase15-winners-hackathon' } },
    });
    await prisma.track.deleteMany({
      where: { event: { slug: 'phase15-winners-hackathon' } },
    });
    await prisma.event.deleteMany({
      where: { slug: 'phase15-winners-hackathon' },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['p15_org@example.com', 'p15_admin@example.com', 'p15_part@example.com'],
        },
      },
    });

    const passwordHash = await hashPassword('Password123!');

    // 2. Create Users
    organizer = await prisma.user.create({
      data: { email: 'p15_org@example.com', name: 'Org Winners', passwordHash, role: 'ORGANIZER' },
    });
    admin = await prisma.user.create({
      data: { email: 'p15_admin@example.com', name: 'Admin Winners', passwordHash, role: 'ADMIN' },
    });
    participant = await prisma.user.create({
      data: { email: 'p15_part@example.com', name: 'Winner Dev', passwordHash, role: 'PARTICIPANT' },
    });

    // 3. Logins
    const [resOrg, resAdmin, resPart] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'p15_org@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'p15_admin@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'p15_part@example.com', password: 'Password123!' }),
    ]);

    organizerToken = resOrg.body.token;
    adminToken = resAdmin.body.token;
    participantToken = resPart.body.token;

    // 4. Create Event (Starts in JUDGING status)
    event = await prisma.event.create({
      data: {
        name: 'Phase 15 Winners Hackathon',
        slug: 'phase15-winners-hackathon',
        description: 'Event for prize assignments and results publishing',
        status: 'JUDGING',
        submissionDeadline: new Date(Date.now() - 86400000 * 5),
        judgingDeadline: new Date(Date.now() + 86400000 * 2),
        votingDeadline: new Date(Date.now() + 86400000 * 5),
        organizerId: organizer.id,
      },
    });

    trackAI = await prisma.track.create({
      data: {
        eventId: event.id,
        name: 'AI Innovations Track',
        description: 'Machine intelligence systems',
      },
    });

    prizeGrand = await prisma.prize.create({
      data: {
        eventId: event.id,
        title: 'Grand Champion Prize',
        amount: '$10,000',
        description: 'Highest overall performance',
      },
    });

    prizeTrack = await prisma.prize.create({
      data: {
        eventId: event.id,
        trackId: trackAI.id,
        title: 'Best AI Architecture',
        amount: '$5,000',
        description: 'Best project in AI Innovations track',
      },
    });

    // 5. Team & Submission
    const team = await prisma.team.create({
      data: {
        name: 'Champion AI Team',
        eventId: event.id,
        inviteCode: 'P15-CHAMP',
        creatorId: participant.id,
        members: { create: [{ userId: participant.id, role: 'LEADER' }] },
      },
    });

    winningSub = await prisma.submission.create({
      data: {
        eventId: event.id,
        teamId: team.id,
        trackId: trackAI.id,
        title: 'Apex Autonomous Mesh',
        tagline: 'Decentralized AI swarm orchestration',
        description: 'P2P neural inference and consensus swarm',
        techStack: JSON.stringify(['Rust', 'Wasm', 'libp2p']),
        isDraft: false,
        submittedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    if (event) {
      await prisma.prize.deleteMany({ where: { eventId: event.id } });
      await prisma.submission.deleteMany({ where: { eventId: event.id } });
      await prisma.teamMember.deleteMany({ where: { team: { eventId: event.id } } });
      await prisma.team.deleteMany({ where: { eventId: event.id } });
      await prisma.track.deleteMany({ where: { eventId: event.id } });
      await prisma.event.deleteMany({ where: { id: event.id } });
    }
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['p15_org@example.com', 'p15_admin@example.com', 'p15_part@example.com'],
        },
      },
    });
  });

  describe('POST /api/events/:idOrSlug/winners/assign (Prize Allocation)', () => {
    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app)
        .post(`/api/events/${event.slug}/winners/assign`)
        .send({ prizeAssignments: [{ prizeId: prizeGrand.id, submissionId: winningSub.id }] });
      expect(res.status).toBe(401);
    });

    it('should reject PARTICIPANT role from assigning winners with 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/events/${event.slug}/winners/assign`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ prizeAssignments: [{ prizeId: prizeGrand.id, submissionId: winningSub.id }] });
      expect(res.status).toBe(403);
    });

    it('should reject invalid prizeId with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/events/${event.slug}/winners/assign`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ prizeAssignments: [{ prizeId: 'non-existent-prize-id', submissionId: winningSub.id }] });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_PRIZE_ID');
    });

    it('should successfully assign winning submission to Grand Champion prize', async () => {
      const res = await request(app)
        .post(`/api/events/${event.slug}/winners/assign`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          prizeAssignments: [
            { prizeId: prizeGrand.id, submissionId: winningSub.id },
            { prizeId: prizeTrack.id, submissionId: winningSub.id },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.prizes).toHaveLength(2);
      expect(res.body.prizes[0].winningSubmissionId).toBe(winningSub.id);
      expect(res.body.prizes[1].winningSubmissionId).toBe(winningSub.id);

      // Verify DB update
      const checkPrize = await prisma.prize.findUnique({
        where: { id: prizeGrand.id },
      });
      expect(checkPrize.winningSubmissionId).toBe(winningSub.id);
    });
  });

  describe('GET /api/events/:idOrSlug/winners (Winner Visibility)', () => {
    it('should reject unauthenticated public query when event is not yet PUBLISHED (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/events/${event.slug}/winners`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('WINNERS_NOT_PUBLISHED');
    });

    it('should allow organizer to preview winners before publishing (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/events/${event.slug}/winners`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.prizes).toHaveLength(2);
      expect(res.body.prizes[0].winningSubmission.title).toBe('Apex Autonomous Mesh');
    });
  });

  describe('POST /api/events/:idOrSlug/publish (Publishing Results)', () => {
    it('should allow organizer to publish event results and unlock public winner showcase', async () => {
      const publishRes = await request(app)
        .post(`/api/events/${event.slug}/publish`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(publishRes.status).toBe(200);
      expect(publishRes.body.event.status).toBe('PUBLISHED');

      // Now unauthenticated public query succeeds
      const publicRes = await request(app)
        .get(`/api/events/${event.slug}/winners`);

      expect(publicRes.status).toBe(200);
      expect(publicRes.body.prizes).toHaveLength(2);
      expect(publicRes.body.prizes[0].winningSubmission.title).toBe('Apex Autonomous Mesh');
      expect(publicRes.body.prizes[0].winningSubmission.techStack).toContain('Rust');

      // Verify zero sensitive data leakage
      const winningTeam = publicRes.body.prizes[0].winningSubmission.team;
      expect(winningTeam.members[0].user.name).toBe('Winner Dev');
      expect(winningTeam.members[0].user.email).toBeUndefined();
      expect(winningTeam.members[0].user.passwordHash).toBeUndefined();
    });
  });
});
