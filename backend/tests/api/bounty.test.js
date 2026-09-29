const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/db');
const jwt = require('jsonwebtoken');

describe('Community Bounties & Side Challenges Engine API Tests (Phase 23)', () => {
  let organizer, judge, alice, bob, charlie;
  let organizerToken, judgeToken, aliceToken, bobToken, charlieToken;
  let testEvent, testBounty;

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

    // Ensure active event
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

    // Clean test state for bounties
    await prisma.bountySubmission.deleteMany({
      where: {
        bounty: { eventId: testEvent.id }
      }
    });
    await prisma.bounty.deleteMany({
      where: { eventId: testEvent.id }
    });
  });

  describe('1. Bounty Creation & Management', () => {
    it('POST /api/bounties - should reject unauthenticated request with 401', async () => {
      const res = await request(app)
        .post('/api/bounties')
        .send({
          eventId: testEvent.id,
          title: 'Unauthenticated Bounty',
          description: 'No auth token',
          rewardAmount: '$500 USDC'
        });

      expect(res.statusCode).toBe(401);
    });

    it('POST /api/bounties - should reject missing required fields with 400', async () => {
      const res = await request(app)
        .post('/api/bounties')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          eventId: testEvent.id,
          title: 'Missing Details'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('POST /api/bounties - should allow organizer to create a new bounty challenge (201 Created)', async () => {
      const res = await request(app)
        .post('/api/bounties')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          eventId: testEvent.id,
          title: 'Optimize Zero-Knowledge State Prover',
          description: 'Implement a sub-50ms recursive ZK proof generator for transaction rollup batches.',
          rewardAmount: '$2,500 USDC + Hardware Wallet',
          category: 'PERFORMANCE',
          sponsorName: 'ZK Labs Global',
          sponsorLogo: 'https://dogfood.local/sponsors/zklabs.svg',
          requirements: 'Must pass all 100 differential fuzz tests and benchmark under 50ms on M-series Apple Silicon.',
          deadline: new Date(Date.now() + 86400000 * 3).toISOString()
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.bounty).toBeDefined();
      expect(res.body.bounty.title).toBe('Optimize Zero-Knowledge State Prover');
      expect(res.body.bounty.category).toBe('PERFORMANCE');
      expect(res.body.bounty.status).toBe('OPEN');

      testBounty = res.body.bounty;
    });

    it('PUT /api/bounties/:id - should allow creator to update bounty metadata', async () => {
      const res = await request(app)
        .put(`/api/bounties/${testBounty.id}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          rewardAmount: '$3,000 USDC + Hardware Wallet',
          sponsorName: 'ZK Labs International'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.bounty.rewardAmount).toBe('$3,000 USDC + Hardware Wallet');
      expect(res.body.bounty.sponsorName).toBe('ZK Labs International');
    });

    it('PUT /api/bounties/:id - should reject non-creator / unauthorized user with 403', async () => {
      const res = await request(app)
        .put(`/api/bounties/${testBounty.id}`)
        .set('Authorization', `Bearer ${bobToken}`)
        .send({
          title: 'Hacked Bounty Title'
        });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('2. Querying Bounties', () => {
    it('GET /api/bounties - should list public bounties with submissions count', async () => {
      const res = await request(app).get('/api/bounties');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.bounties)).toBe(true);
      expect(res.body.bounties.length).toBeGreaterThanOrEqual(1);

      const found = res.body.bounties.find(b => b.id === testBounty.id);
      expect(found).toBeDefined();
      expect(found.title).toBe('Optimize Zero-Knowledge State Prover');
      expect(found.submissionsCount).toBe(0);
      expect(found.status).toBe('OPEN');
    });

    it('GET /api/bounties - should filter by category', async () => {
      const res = await request(app).get('/api/bounties?category=PERFORMANCE');

      expect(res.statusCode).toBe(200);
      expect(res.body.bounties.every(b => b.category === 'PERFORMANCE')).toBe(true);
    });

    it('GET /api/bounties/:id - should return single bounty details', async () => {
      const res = await request(app).get(`/api/bounties/${testBounty.id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.bounty).toBeDefined();
      expect(res.body.bounty.id).toBe(testBounty.id);
      expect(res.body.bounty.creator.name).toBe(organizer.name);
    });
  });

  describe('3. Submitting Work to Bounties', () => {
    let aliceSubmissionId;

    it('POST /api/bounties/:id/submit - should reject submission without required fields (400)', async () => {
      const res = await request(app)
        .post(`/api/bounties/${testBounty.id}/submit`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ title: 'Incomplete' });

      expect(res.statusCode).toBe(400);
    });

    it('POST /api/bounties/:id/submit - should allow Alice to submit a solution (201 Created)', async () => {
      const res = await request(app)
        .post(`/api/bounties/${testBounty.id}/submit`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          title: 'SIMD-Accelerated Plonky2 Prover Pipeline',
          description: 'Vectorized FFT transforms using AVX-512 and Apple NEON SIMD intrinsics.',
          proofUrl: 'https://github.com/alice/zk-fast-prover'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.submission).toBeDefined();
      expect(res.body.submission.title).toBe('SIMD-Accelerated Plonky2 Prover Pipeline');
      expect(res.body.submission.status).toBe('PENDING');
      expect(res.body.submission.submitter.name).toBe(alice.name);

      aliceSubmissionId = res.body.submission.id;
    });

    it('POST /api/bounties/:id/submit - should prevent duplicate submissions from the same user (400)', async () => {
      const res = await request(app)
        .post(`/api/bounties/${testBounty.id}/submit`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          title: 'Second Submission Attempt',
          description: 'Another version',
          proofUrl: 'https://github.com/alice/zk-fast-prover-v2'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/already submitted a solution/i);
    });

    it('POST /api/bounties/:id/submit - should allow Bob to submit his solution', async () => {
      const res = await request(app)
        .post(`/api/bounties/${testBounty.id}/submit`)
        .set('Authorization', `Bearer ${bobToken}`)
        .send({
          title: 'GPU CUDA Batch Prover for Groth16',
          description: 'Massively parallel Multi-Scalar Multiplication kernel in CUDA.',
          proofUrl: 'https://github.com/bob/cuda-msm-groth16'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.submission.submitter.name).toBe(bob.name);
    });

    it('GET /api/bounties/:id/submissions - should allow organizer to list all submissions', async () => {
      const res = await request(app)
        .get(`/api/bounties/${testBounty.id}/submissions`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.submissions.length).toBe(2);
    });

    it('GET /api/bounties/:id/submissions - participant should only see their own submission', async () => {
      const res = await request(app)
        .get(`/api/bounties/${testBounty.id}/submissions`)
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.submissions.length).toBe(1);
      expect(res.body.submissions[0].submitter.id).toBe(alice.id);
    });
  });

  describe('4. Reviewing & Awarding Bounty Champions', () => {
    let aliceSubmissionId;

    beforeAll(async () => {
      const sub = await prisma.bountySubmission.findFirst({
        where: { bountyId: testBounty.id, submitterId: alice.id }
      });
      aliceSubmissionId = sub.id;
    });

    it('PATCH /api/bounties/:id/submissions/:subId/review - should reject unauthorized user with 403', async () => {
      const res = await request(app)
        .patch(`/api/bounties/${testBounty.id}/submissions/${aliceSubmissionId}/review`)
        .set('Authorization', `Bearer ${charlieToken}`)
        .send({ status: 'APPROVED' });

      expect(res.statusCode).toBe(403);
    });

    it('PATCH /api/bounties/:id/submissions/:subId/review - should approve Alice and award bounty with +100 reputation points', async () => {
      const aliceInitial = await prisma.user.findUnique({ where: { id: alice.id } });
      const initialPoints = aliceInitial.reputationScore;

      const res = await request(app)
        .patch(`/api/bounties/${testBounty.id}/submissions/${aliceSubmissionId}/review`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          status: 'APPROVED',
          feedback: 'Incredible performance, achieved 34ms proving time with zero proof failures!'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.submission.status).toBe('APPROVED');

      // Verify Bounty status marked AWARDED
      const updatedBounty = await prisma.bounty.findUnique({ where: { id: testBounty.id } });
      expect(updatedBounty.status).toBe('AWARDED');
      expect(updatedBounty.winnerSubmissionId).toBe(aliceSubmissionId);

      // Verify Alice reputation incremented by 100
      const aliceUpdated = await prisma.user.findUnique({ where: { id: alice.id } });
      expect(aliceUpdated.reputationScore).toBe(initialPoints + 100);

      // Verify reputation log entry
      const log = await prisma.reputationLog.findFirst({
        where: {
          userId: alice.id,
          action: 'BOUNTY_CHAMPION'
        }
      });
      expect(log).toBeDefined();
      expect(log.points).toBe(100);
    });

    it('POST /api/bounties/:id/submit - should reject submissions on an AWARDED bounty (400)', async () => {
      const res = await request(app)
        .post(`/api/bounties/${testBounty.id}/submit`)
        .set('Authorization', `Bearer ${charlieToken}`)
        .send({
          title: 'Late Submission',
          description: 'Trying to submit after award',
          proofUrl: 'https://github.com/charlie/late-entry'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/cannot submit work to a bounty with status: AWARDED/i);
    });
  });
});
