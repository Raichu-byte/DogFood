const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/db');
const jwt = require('jsonwebtoken');

describe('Real-Time Polling & Community Sentiment System API Tests (Phase 24)', () => {
  let organizer, judge, alice, bob, charlie;
  let organizerToken, judgeToken, aliceToken, bobToken, charlieToken;
  let testEvent, singleChoicePoll, multiChoicePoll;

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

    testEvent = await prisma.event.findFirst({
      where: { slug: 'dogfood-2026' }
    });

    if (!testEvent) {
      testEvent = await prisma.event.create({
        data: {
          slug: 'dogfood-2026',
          name: 'Dogfood Championship 2026',
          status: 'ACTIVE',
          description: 'Flagship autonomous tournament',
          submissionDeadline: new Date(Date.now() + 86400000 * 7),
          judgingDeadline: new Date(Date.now() + 86400000 * 10)
        }
      });
    }

    // Clean test state
    await prisma.pollVote.deleteMany({
      where: {
        poll: { eventId: testEvent.id }
      }
    });
    await prisma.pollOption.deleteMany({
      where: {
        poll: { eventId: testEvent.id }
      }
    });
    await prisma.poll.deleteMany({
      where: { eventId: testEvent.id }
    });
  });

  describe('1. Poll Creation & Validation', () => {
    it('POST /api/polls - should reject unauthenticated request with 401', async () => {
      const res = await request(app)
        .post('/api/polls')
        .send({
          eventId: testEvent.id,
          question: 'What is your primary smart contract language?',
          options: ['Rust', 'Solidity']
        });

      expect(res.statusCode).toBe(401);
    });

    it('POST /api/polls - should reject missing question or less than 2 options with 400', async () => {
      const res = await request(app)
        .post('/api/polls')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          eventId: testEvent.id,
          question: 'Incomplete Poll',
          options: ['Only one option']
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/at least 2 options/i);
    });

    it('POST /api/polls - should allow organizer to create a single-choice poll (201 Created)', async () => {
      const res = await request(app)
        .post('/api/polls')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          eventId: testEvent.id,
          question: 'Which zero-knowledge proving system is your team implementing?',
          description: 'Tournament-wide sentiment on ZK proving technology.',
          category: 'TECH_STACK',
          allowMultiple: false,
          options: [
            'Plonky2 / Plonky3',
            'Halo2 / KZG',
            'Groth16 / Circom',
            'STARKs / Boojum'
          ]
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.poll).toBeDefined();
      expect(res.body.poll.question).toBe('Which zero-knowledge proving system is your team implementing?');
      expect(res.body.poll.options.length).toBe(4);
      expect(res.body.poll.allowMultiple).toBe(false);
      expect(res.body.poll.status).toBe('ACTIVE');

      singleChoicePoll = res.body.poll;
    });

    it('POST /api/polls - should allow Alice to create a multi-choice sentiment poll', async () => {
      const res = await request(app)
        .post('/api/polls')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          eventId: testEvent.id,
          question: 'What offline features are most critical for tournament execution?',
          category: 'SENTIMENT',
          allowMultiple: true,
          options: [
            'Local CRDT Sync',
            'Peer-to-Peer WebRTC Mesh',
            'Embedded SQLite Storage',
            'Deterministic Replay Sandbox'
          ]
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.poll.allowMultiple).toBe(true);
      expect(res.body.poll.options.length).toBe(4);

      multiChoicePoll = res.body.poll;
    });
  });

  describe('2. Querying Polls & Breakdown Calculation', () => {
    it('GET /api/polls - should list public polls with option percentage statistics', async () => {
      const res = await request(app).get(`/api/polls?eventId=${testEvent.id}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.polls)).toBe(true);
      expect(res.body.polls.length).toBeGreaterThanOrEqual(2);

      const poll = res.body.polls.find(p => p.id === singleChoicePoll.id);
      expect(poll).toBeDefined();
      expect(poll.totalVotes).toBe(0);
      expect(poll.options.every(o => o.percentage === 0)).toBe(true);
    });

    it('GET /api/polls - should filter by category', async () => {
      const res = await request(app).get(`/api/polls?category=TECH_STACK`);

      expect(res.statusCode).toBe(200);
      expect(res.body.polls.every(p => p.category === 'TECH_STACK')).toBe(true);
    });

    it('GET /api/polls/:id - should return single poll with voter state', async () => {
      const res = await request(app)
        .get(`/api/polls/${singleChoicePoll.id}`)
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.poll.id).toBe(singleChoicePoll.id);
      expect(res.body.poll.hasVoted).toBe(false);
    });
  });

  describe('3. Voting & Reputation Reward (+5 Points)', () => {
    it('POST /api/polls/:id/vote - should reject unauthenticated voting (401)', async () => {
      const optionId = singleChoicePoll.options[0].id;
      const res = await request(app)
        .post(`/api/polls/${singleChoicePoll.id}/vote`)
        .send({ optionIds: optionId });

      expect(res.statusCode).toBe(401);
    });

    it('POST /api/polls/:id/vote - should allow Alice to vote on option and earn +5 reputation points', async () => {
      const aliceInitial = await prisma.user.findUnique({ where: { id: alice.id } });
      const initialScore = aliceInitial.reputationScore;
      const targetOptionId = singleChoicePoll.options[0].id; // Plonky2

      const res = await request(app)
        .post(`/api/polls/${singleChoicePoll.id}/vote`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ optionIds: targetOptionId });

      expect(res.statusCode).toBe(200);
      expect(res.body.poll.totalVotes).toBe(1);
      expect(res.body.pointsAwarded).toBe(5);

      const votedOpt = res.body.poll.options.find(o => o.id === targetOptionId);
      expect(votedOpt.votesCount).toBe(1);
      expect(votedOpt.percentage).toBe(100);
      expect(votedOpt.hasUserVoted).toBe(true);

      // Verify reputation incremented
      const aliceUpdated = await prisma.user.findUnique({ where: { id: alice.id } });
      expect(aliceUpdated.reputationScore).toBe(initialScore + 5);

      // Verify reputation log
      const log = await prisma.reputationLog.findFirst({
        where: { userId: alice.id, action: 'POLL_VOTER' }
      });
      expect(log).toBeDefined();
    });

    it('POST /api/polls/:id/vote - should prevent Alice from voting a second time on single-choice poll (400)', async () => {
      const anotherOptionId = singleChoicePoll.options[1].id;

      const res = await request(app)
        .post(`/api/polls/${singleChoicePoll.id}/vote`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ optionIds: anotherOptionId });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/already voted on this poll/i);
    });

    it('POST /api/polls/:id/vote - should allow Bob to vote and compute accurate 50%/50% distribution', async () => {
      const targetOptionId = singleChoicePoll.options[1].id; // Halo2

      const res = await request(app)
        .post(`/api/polls/${singleChoicePoll.id}/vote`)
        .set('Authorization', `Bearer ${bobToken}`)
        .send({ optionIds: targetOptionId });

      expect(res.statusCode).toBe(200);
      expect(res.body.poll.totalVotes).toBe(2);

      const opt1 = res.body.poll.options.find(o => o.id === singleChoicePoll.options[0].id);
      const opt2 = res.body.poll.options.find(o => o.id === targetOptionId);

      expect(opt1.percentage).toBe(50);
      expect(opt2.percentage).toBe(50);
    });

    it('POST /api/polls/:id/vote - should allow Charlie to vote on multiple options in multi-choice poll', async () => {
      const opt1 = multiChoicePoll.options[0].id;
      const opt2 = multiChoicePoll.options[2].id;

      const res = await request(app)
        .post(`/api/polls/${multiChoicePoll.id}/vote`)
        .set('Authorization', `Bearer ${charlieToken}`)
        .send({ optionIds: [opt1, opt2] });

      expect(res.statusCode).toBe(200);
      expect(res.body.poll.totalVotes).toBe(2);
      expect(res.body.poll.hasVoted).toBe(true);
      expect(res.body.poll.userVotedOptionIds).toContain(opt1);
      expect(res.body.poll.userVotedOptionIds).toContain(opt2);
    });
  });

  describe('4. Closing Poll & Status Constraints', () => {
    it('PATCH /api/polls/:id/close - should reject unauthorized user with 403', async () => {
      const res = await request(app)
        .patch(`/api/polls/${singleChoicePoll.id}/close`)
        .set('Authorization', `Bearer ${bobToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('PATCH /api/polls/:id/close - should allow organizer to close poll', async () => {
      const res = await request(app)
        .patch(`/api/polls/${singleChoicePoll.id}/close`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.poll.status).toBe('CLOSED');
    });

    it('POST /api/polls/:id/vote - should reject voting on CLOSED poll (400)', async () => {
      const res = await request(app)
        .post(`/api/polls/${singleChoicePoll.id}/vote`)
        .set('Authorization', `Bearer ${charlieToken}`)
        .send({ optionIds: singleChoicePoll.options[0].id });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/cannot vote on a poll with status: CLOSED/i);
    });
  });
});
