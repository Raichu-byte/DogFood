const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/db');
const jwt = require('jsonwebtoken');

describe('Reputation, Trust Graph & Badging System API Tests (Phase 21)', () => {
  let organizer, judge, alice, bob, charlie;
  let organizerToken, judgeToken, aliceToken, bobToken, charlieToken;

  beforeAll(async () => {
    // 1. Fetch seeded users
    organizer = await prisma.user.findUnique({ where: { email: 'organizer@dogfood.test' } });
    judge = await prisma.user.findUnique({ where: { email: 'judge1@dogfood.test' } });
    alice = await prisma.user.findUnique({ where: { email: 'alice@dogfood.test' } });
    bob = await prisma.user.findUnique({ where: { email: 'bob@dogfood.test' } });
    charlie = await prisma.user.findUnique({ where: { email: 'charlie@dogfood.test' } });

    const secret = process.env.JWT_SECRET || 'supersecret_offline_jwt_key_2026';
    organizerToken = jwt.sign({ id: organizer.id, email: organizer.email, role: organizer.role }, secret);
    judgeToken = jwt.sign({ id: judge.id, email: judge.email, role: judge.role }, secret);
    aliceToken = jwt.sign({ id: alice.id, email: alice.email, role: alice.role }, secret);
    bobToken = jwt.sign({ id: bob.id, email: bob.email, role: bob.role }, secret);
    charlieToken = jwt.sign({ id: charlie.id, email: charlie.email, role: charlie.role }, secret);

    // Clean test state
    const userIds = [organizer.id, judge.id, alice.id, bob.id, charlie.id];
    await prisma.endorsement.deleteMany({
      where: {
        OR: [
          { senderId: { in: userIds } },
          { receiverId: { in: userIds } }
        ]
      }
    });
    await prisma.userBadge.deleteMany({
      where: { userId: { in: userIds } }
    });
    await prisma.reputationLog.deleteMany({
      where: { userId: { in: userIds } }
    });
    await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { reputationScore: 0 }
    });
  });

  describe('1. Badge Catalog & Definitions', () => {
    it('GET /api/reputation/badges - should return public catalog of badges', async () => {
      const res = await request(app).get('/api/reputation/badges');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.badges)).toBe(true);
      expect(res.body.badges.length).toBeGreaterThanOrEqual(5);

      const genesis = res.body.badges.find(b => b.slug === 'FIRST_SUBMISSION');
      expect(genesis).toBeDefined();
      expect(genesis.name).toBe('Genesis Builder');
      expect(genesis.points).toBe(50);
      expect(genesis.tier).toBe('BRONZE');
    });
  });

  describe('2. User Reputation Profiles & Levels', () => {
    it('GET /api/users/:id/reputation - should return reputation profile with level calculation', async () => {
      const res = await request(app).get(`/api/users/${alice.id}/reputation`);

      expect(res.statusCode).toBe(200);
      expect(res.body.profile).toBeDefined();
      expect(res.body.profile.id).toBe(alice.id);
      expect(res.body.profile.name).toBe(alice.name);
      expect(typeof res.body.profile.reputationScore).toBe('number');
      expect(typeof res.body.profile.level).toBe('number');
      expect(typeof res.body.profile.rankTitle).toBe('string');
      expect(Array.isArray(res.body.profile.badges)).toBe(true);
      expect(Array.isArray(res.body.profile.endorsements)).toBe(true);
    });

    it('GET /api/reputation/me - should return authenticated user profile', async () => {
      const res = await request(app)
        .get('/api/reputation/me')
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.profile.id).toBe(alice.id);
    });
  });

  describe('3. Peer Skill Endorsement & Trust Graph', () => {
    it('POST /api/users/:id/endorse - should reject unauthenticated request with 401', async () => {
      const res = await request(app)
        .post(`/api/users/${bob.id}/endorse`)
        .send({ skill: 'React' });

      expect(res.statusCode).toBe(401);
    });

    it('POST /api/users/:id/endorse - should prevent self-endorsement with 400', async () => {
      const res = await request(app)
        .post(`/api/users/${alice.id}/endorse`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ skill: 'Rust' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/cannot endorse yourself/i);
    });

    it('POST /api/users/:id/endorse - should allow Alice to endorse Bob for React and increment reputation', async () => {
      const initialProfile = await request(app).get(`/api/users/${bob.id}/reputation`);
      const initialScore = initialProfile.body.profile.reputationScore;

      const res = await request(app)
        .post(`/api/users/${bob.id}/endorse`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          skill: 'React',
          comment: 'Exceptional state management and performance optimization.'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.endorsement).toBeDefined();
      expect(res.body.endorsement.skill).toBe('React');
      expect(res.body.pointsAwarded).toBe(15);

      const updatedProfile = await request(app).get(`/api/users/${bob.id}/reputation`);
      expect(updatedProfile.body.profile.reputationScore).toBe(initialScore + 15);
      
      const reactEndorsement = updatedProfile.body.profile.endorsements.find(e => e.skill === 'React');
      expect(reactEndorsement).toBeDefined();
      expect(reactEndorsement.count).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/users/:id/endorse - should reject duplicate endorsement for the same skill (400)', async () => {
      const res = await request(app)
        .post(`/api/users/${bob.id}/endorse`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ skill: 'React' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/already endorsed/i);
    });

    it('Automatic Badge Trigger - should award TRUSTED_BUILDER badge when user accumulates 3 endorsements', async () => {
      // Judge endorses Bob for TypeScript
      await request(app)
        .post(`/api/users/${bob.id}/endorse`)
        .set('Authorization', `Bearer ${judgeToken}`)
        .send({ skill: 'TypeScript' });

      // Charlie endorses Bob for Tailwind
      await request(app)
        .post(`/api/users/${bob.id}/endorse`)
        .set('Authorization', `Bearer ${charlieToken}`)
        .send({ skill: 'Tailwind' });

      const bobProfile = await request(app).get(`/api/users/${bob.id}/reputation`);
      const trustedBadge = bobProfile.body.profile.badges.find(b => b.slug === 'TRUSTED_BUILDER');
      expect(trustedBadge).toBeDefined();
      expect(trustedBadge.name).toBe('Trusted Builder');
    });
  });

  describe('4. Admin & Organizer Manual Badge Awarding', () => {
    it('POST /api/admin/badges/award - should reject PARTICIPANT role with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/admin/badges/award')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({
          userId: alice.id,
          badgeSlug: 'CODE_PIONEER'
        });

      expect(res.statusCode).toBe(403);
    });

    it('POST /api/admin/badges/award - should allow ORGANIZER to award badge to user (201 Created)', async () => {
      const res = await request(app)
        .post('/api/admin/badges/award')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          userId: alice.id,
          badgeSlug: 'CODE_PIONEER',
          reason: 'Outstanding contribution to tournament core protocols.'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.userBadge).toBeDefined();
      expect(res.body.userBadge.badge.slug).toBe('CODE_PIONEER');

      const aliceProfile = await request(app).get(`/api/users/${alice.id}/reputation`);
      const pioneer = aliceProfile.body.profile.badges.find(b => b.slug === 'CODE_PIONEER');
      expect(pioneer).toBeDefined();
      expect(pioneer.points).toBe(300);
    });
  });

  describe('5. Reputation Leaderboard & Standings', () => {
    it('GET /api/reputation/leaderboard - should rank top users by reputationScore descending', async () => {
      const res = await request(app).get('/api/reputation/leaderboard');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.leaderboard)).toBe(true);
      expect(res.body.leaderboard.length).toBeGreaterThan(0);

      // Verify descending order
      for (let i = 0; i < res.body.leaderboard.length - 1; i++) {
        expect(res.body.leaderboard[i].reputationScore).toBeGreaterThanOrEqual(
          res.body.leaderboard[i + 1].reputationScore
        );
      }

      const topUser = res.body.leaderboard[0];
      expect(topUser.rank).toBe(1);
      expect(topUser.level).toBeDefined();
      expect(topUser.rankTitle).toBeDefined();
    });
  });
});
