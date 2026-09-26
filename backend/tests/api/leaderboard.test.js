const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/db');
const { hashPassword } = require('../../src/utils/auth');

describe('Leaderboard API Tests (Phase 13)', () => {
  let organizerToken;
  let adminToken;
  let participantToken;

  let organizer;
  let admin;
  let participant;

  let eventActive;
  let eventPublished;
  let trackAI;
  let trackWeb;

  let proj1;
  let proj2;
  let proj3;

  beforeAll(async () => {
    // 1. Cleanup
    await prisma.score.deleteMany({
      where: { assignment: { event: { slug: { in: ['phase13-active-hackathon', 'phase13-published-hackathon'] } } } },
    });
    await prisma.projectScoreSummary.deleteMany({
      where: { submission: { event: { slug: { in: ['phase13-active-hackathon', 'phase13-published-hackathon'] } } } },
    });
    await prisma.judgeAssignment.deleteMany({
      where: { event: { slug: { in: ['phase13-active-hackathon', 'phase13-published-hackathon'] } } },
    });
    await prisma.submission.deleteMany({
      where: { event: { slug: { in: ['phase13-active-hackathon', 'phase13-published-hackathon'] } } },
    });
    await prisma.teamMember.deleteMany({
      where: { team: { event: { slug: { in: ['phase13-active-hackathon', 'phase13-published-hackathon'] } } } },
    });
    await prisma.team.deleteMany({
      where: { event: { slug: { in: ['phase13-active-hackathon', 'phase13-published-hackathon'] } } },
    });
    await prisma.prize.deleteMany({
      where: { event: { slug: { in: ['phase13-active-hackathon', 'phase13-published-hackathon'] } } },
    });
    await prisma.rubricCriteria.deleteMany({
      where: { event: { slug: { in: ['phase13-active-hackathon', 'phase13-published-hackathon'] } } },
    });
    await prisma.track.deleteMany({
      where: { event: { slug: { in: ['phase13-active-hackathon', 'phase13-published-hackathon'] } } },
    });
    await prisma.event.deleteMany({
      where: { slug: { in: ['phase13-active-hackathon', 'phase13-published-hackathon'] } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['p13_org@example.com', 'p13_admin@example.com', 'p13_part@example.com'],
        },
      },
    });

    const passwordHash = await hashPassword('Password123!');

    // 2. Create Users
    organizer = await prisma.user.create({
      data: { email: 'p13_org@example.com', name: 'Org Leaderboard', passwordHash, role: 'ORGANIZER' },
    });
    admin = await prisma.user.create({
      data: { email: 'p13_admin@example.com', name: 'Admin Leaderboard', passwordHash, role: 'ADMIN' },
    });
    participant = await prisma.user.create({
      data: { email: 'p13_part@example.com', name: 'Part Leaderboard', passwordHash, role: 'PARTICIPANT' },
    });

    // 3. Logins
    const [resOrg, resAdmin, resPart] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'p13_org@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'p13_admin@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'p13_part@example.com', password: 'Password123!' }),
    ]);

    organizerToken = resOrg.body.token;
    adminToken = resAdmin.body.token;
    participantToken = resPart.body.token;

    // 4. Create Active Event (in JUDGING status -> locked for public)
    eventActive = await prisma.event.create({
      data: {
        name: 'Phase 13 Active Hackathon',
        slug: 'phase13-active-hackathon',
        description: 'Active event for testing locked leaderboard',
        status: 'JUDGING',
        submissionDeadline: new Date(Date.now() - 86400000),
        judgingDeadline: new Date(Date.now() + 86400000 * 5),
        votingDeadline: new Date(Date.now() + 86400000 * 10),
        organizerId: organizer.id,
      },
    });

    // 5. Create Published Event (in PUBLISHED status -> open for public)
    eventPublished = await prisma.event.create({
      data: {
        name: 'Phase 13 Published Hackathon',
        slug: 'phase13-published-hackathon',
        description: 'Published event with public leaderboard',
        status: 'PUBLISHED',
        submissionDeadline: new Date(Date.now() - 86400000 * 10),
        judgingDeadline: new Date(Date.now() - 86400000 * 5),
        votingDeadline: new Date(Date.now() - 86400000),
        organizerId: organizer.id,
      },
    });

    trackAI = await prisma.track.create({
      data: { name: 'AI Track', description: 'AI & ML', eventId: eventPublished.id },
    });

    trackWeb = await prisma.track.create({
      data: { name: 'Web Track', description: 'Web3 & Infra', eventId: eventPublished.id },
    });

    // 6. Create Projects in Published Event:
    // Project 1 (AI track): rawMean = 9.5, zScore = 1.8, votes = 10
    const t1 = await prisma.team.create({
      data: {
        name: 'Team Alpha AI',
        eventId: eventPublished.id,
        inviteCode: 'P13-T1',
        creatorId: participant.id,
        members: { create: [{ userId: participant.id, role: 'LEADER' }] },
      },
    });
    proj1 = await prisma.submission.create({
      data: {
        eventId: eventPublished.id,
        teamId: t1.id,
        trackId: trackAI.id,
        title: 'Alpha AI Vision',
        tagline: 'Computer vision on edge',
        description: 'Deep neural models',
        techStack: JSON.stringify(['PyTorch', 'Rust']),
        isDraft: false,
        submittedAt: new Date(),
      },
    });
    await prisma.projectScoreSummary.create({
      data: {
        submissionId: proj1.id,
        rawScoreMean: 9.5,
        normalizedZScore: 1.8,
        communityVotesCount: 10,
      },
    });

    // Project 2 (Web track): rawMean = 9.8, zScore = 1.2 (Higher raw, lower Z), votes = 50 (Top community)
    const t2 = await prisma.team.create({
      data: {
        name: 'Team Beta Web',
        eventId: eventPublished.id,
        inviteCode: 'P13-T2',
        creatorId: participant.id,
        members: { create: [{ userId: participant.id, role: 'LEADER' }] },
      },
    });
    proj2 = await prisma.submission.create({
      data: {
        eventId: eventPublished.id,
        teamId: t2.id,
        trackId: trackWeb.id,
        title: 'Beta Decentralized DB',
        tagline: 'High speed p2p storage',
        description: 'Distributed verifiable state',
        techStack: JSON.stringify(['Go', 'Libp2p']),
        isDraft: false,
        submittedAt: new Date(),
      },
    });
    await prisma.projectScoreSummary.create({
      data: {
        submissionId: proj2.id,
        rawScoreMean: 9.8,
        normalizedZScore: 1.2,
        communityVotesCount: 50,
      },
    });

    // Project 3 (AI track): rawMean = 7.0, zScore = -0.5, votes = 5
    const t3 = await prisma.team.create({
      data: {
        name: 'Team Gamma AI',
        eventId: eventPublished.id,
        inviteCode: 'P13-T3',
        creatorId: participant.id,
        members: { create: [{ userId: participant.id, role: 'LEADER' }] },
      },
    });
    proj3 = await prisma.submission.create({
      data: {
        eventId: eventPublished.id,
        teamId: t3.id,
        trackId: trackAI.id,
        title: 'Gamma Text Bot',
        tagline: 'NLP conversational agent',
        description: 'Transformer based dialogue',
        techStack: JSON.stringify(['Python']),
        isDraft: false,
        submittedAt: new Date(),
      },
    });
    await prisma.projectScoreSummary.create({
      data: {
        submissionId: proj3.id,
        rawScoreMean: 7.0,
        normalizedZScore: -0.5,
        communityVotesCount: 5,
      },
    });
  });

  afterAll(async () => {
    if (eventActive || eventPublished) {
      const eventIds = [eventActive?.id, eventPublished?.id].filter(Boolean);
      await prisma.projectScoreSummary.deleteMany({ where: { submission: { eventId: { in: eventIds } } } });
      await prisma.submission.deleteMany({ where: { eventId: { in: eventIds } } });
      await prisma.teamMember.deleteMany({ where: { team: { eventId: { in: eventIds } } } });
      await prisma.team.deleteMany({ where: { eventId: { in: eventIds } } });
      await prisma.track.deleteMany({ where: { eventId: { in: eventIds } } });
      await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
    }
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['p13_org@example.com', 'p13_admin@example.com', 'p13_part@example.com'],
        },
      },
    });
  });

  describe('Leaderboard Access Control & Status Rules', () => {
    it('should reject unauthenticated public from viewing leaderboard for ongoing JUDGING event (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/leaderboard/${eventActive.slug}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('LEADERBOARD_LOCKED');
    });

    it('should reject PARTICIPANT role from viewing locked ongoing leaderboard (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/leaderboard/${eventActive.slug}`)
        .set('Authorization', `Bearer ${participantToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('LEADERBOARD_LOCKED');
    });

    it('should allow event ORGANIZER to preview ongoing leaderboard (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/leaderboard/${eventActive.slug}`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.leaderboard).toBeDefined();
    });

    it('should allow ADMIN to preview ongoing leaderboard (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/leaderboard/${eventActive.slug}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.leaderboard).toBeDefined();
    });

    it('should allow unauthenticated public to view PUBLISHED event leaderboard (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/leaderboard/${eventPublished.slug}`);

      expect(res.status).toBe(200);
      expect(res.body.leaderboard).toHaveLength(3);
    });
  });

  describe('Sorting Modes & Dynamic Ranking', () => {
    it('should sort by normalized Z-Score by default (Rank 1 = Alpha AI Vision with Z=1.8)', async () => {
      const res = await request(app)
        .get(`/api/leaderboard/${eventPublished.slug}?mode=normalized`);

      expect(res.status).toBe(200);
      expect(res.body.leaderboard[0].title).toBe('Alpha AI Vision');
      expect(res.body.leaderboard[0].rank).toBe(1);
      expect(res.body.leaderboard[1].title).toBe('Beta Decentralized DB');
      expect(res.body.leaderboard[1].rank).toBe(2);
      expect(res.body.leaderboard[2].title).toBe('Gamma Text Bot');
      expect(res.body.leaderboard[2].rank).toBe(3);
    });

    it('should sort by raw score mean when mode=raw (Rank 1 = Beta Decentralized DB with raw=9.8)', async () => {
      const res = await request(app)
        .get(`/api/leaderboard/${eventPublished.slug}?mode=raw`);

      expect(res.status).toBe(200);
      expect(res.body.leaderboard[0].title).toBe('Beta Decentralized DB');
      expect(res.body.leaderboard[0].rank).toBe(1);
      expect(res.body.leaderboard[1].title).toBe('Alpha AI Vision');
      expect(res.body.leaderboard[1].rank).toBe(2);
    });

    it('should sort by community votes when mode=community (Rank 1 = Beta Decentralized DB with 50 votes)', async () => {
      const res = await request(app)
        .get(`/api/leaderboard/${eventPublished.slug}?mode=community`);

      expect(res.status).toBe(200);
      expect(res.body.leaderboard[0].title).toBe('Beta Decentralized DB');
      expect(res.body.leaderboard[0].scores.communityVotesCount).toBe(50);
    });
  });

  describe('Track Filtering & Zero Data Leakage', () => {
    it('should filter leaderboard by trackId and re-index rank numbers', async () => {
      const res = await request(app)
        .get(`/api/leaderboard/${eventPublished.slug}?trackId=${trackAI.id}`);

      expect(res.status).toBe(200);
      expect(res.body.leaderboard).toHaveLength(2);
      expect(res.body.leaderboard[0].title).toBe('Alpha AI Vision');
      expect(res.body.leaderboard[0].rank).toBe(1);
      expect(res.body.leaderboard[1].title).toBe('Gamma Text Bot');
      expect(res.body.leaderboard[1].rank).toBe(2);
    });

    it('should strip sensitive fields (passwords, emails) from public leaderboard', async () => {
      const res = await request(app)
        .get(`/api/leaderboard/${eventPublished.slug}`);

      expect(res.status).toBe(200);
      const topEntry = res.body.leaderboard[0];
      expect(topEntry.team.name).toBeDefined();
      expect(topEntry.team.members[0].user.name).toBe('Part Leaderboard');
      expect(topEntry.team.members[0].user.email).toBeUndefined();
      expect(topEntry.team.members[0].user.passwordHash).toBeUndefined();
    });
  });
});
