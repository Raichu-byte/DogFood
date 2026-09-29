const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/db');
const jwt = require('jsonwebtoken');

describe('Mentor Matching, Support Queue & Office Hours API Tests (Phase 22)', () => {
  let organizer, judge, alice, bob;
  let organizerToken, judgeToken, aliceToken, bobToken;
  let activeEvent;

  beforeAll(async () => {
    organizer = await prisma.user.findUnique({ where: { email: 'organizer@dogfood.test' } });
    judge = await prisma.user.findUnique({ where: { email: 'judge1@dogfood.test' } });
    alice = await prisma.user.findUnique({ where: { email: 'alice@dogfood.test' } });
    bob = await prisma.user.findUnique({ where: { email: 'bob@dogfood.test' } });
    activeEvent = await prisma.event.findFirst();

    const secret = process.env.JWT_SECRET || 'supersecret_offline_jwt_key_2026';
    organizerToken = jwt.sign({ id: organizer.id, email: organizer.email, role: organizer.role }, secret);
    judgeToken = jwt.sign({ id: judge.id, email: judge.email, role: judge.role }, secret);
    aliceToken = jwt.sign({ id: alice.id, email: alice.email, role: alice.role }, secret);
    bobToken = jwt.sign({ id: bob.id, email: bob.email, role: bob.role }, secret);

    // Clean test state
    await prisma.supportTicket.deleteMany({ where: { eventId: activeEvent.id } });
    await prisma.officeHourSlot.deleteMany({ where: { eventId: activeEvent.id } });
    await prisma.mentorProfile.deleteMany({ where: { userId: { in: [organizer.id, judge.id, bob.id] } } });
  });

  describe('1. Mentor Profiles & Directory', () => {
    it('PUT /api/mentors/profile - should allow user to register/update mentor profile', async () => {
      const res = await request(app)
        .put('/api/mentors/profile')
        .set('Authorization', `Bearer ${judgeToken}`)
        .send({
          expertise: ['Rust', 'Distributed Systems', 'Cryptography'],
          company: 'Decentralized Labs',
          bio: 'Specialized in zero-knowledge proofs and consensus systems.',
          location: 'Mentor Table 4 / Discord #ask-elena',
          status: 'AVAILABLE'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.mentor).toBeDefined();
      expect(res.body.mentor.userId).toBe(judge.id);
      expect(res.body.mentor.company).toBe('Decentralized Labs');
      expect(res.body.mentor.expertise).toContain('Rust');
    });

    it('GET /api/mentors - should list public mentors filtered by skill', async () => {
      const res = await request(app).get('/api/mentors?skill=Rust');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.mentors)).toBe(true);
      expect(res.body.mentors.length).toBeGreaterThanOrEqual(1);

      const elena = res.body.mentors.find(m => m.userId === judge.id);
      expect(elena).toBeDefined();
      expect(elena.name).toBe(judge.name);
    });
  });

  describe('2. Technical Support Ticket Queue', () => {
    let createdTicketId;

    it('POST /api/support/tickets - should allow Alice to create a debugging ticket', async () => {
      const res = await request(app)
        .post('/api/support/tickets')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          eventId: activeEvent.id,
          title: 'Wasm panic on memory buffer allocate',
          description: 'Encountering out-of-bounds error when syncing vector index locally.',
          category: 'DEBUGGING',
          priority: 'HIGH',
          location: 'Table 12'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.ticket).toBeDefined();
      expect(res.body.ticket.title).toBe('Wasm panic on memory buffer allocate');
      expect(res.body.ticket.status).toBe('OPEN');
      expect(res.body.ticket.creatorId).toBe(alice.id);

      createdTicketId = res.body.ticket.id;
    });

    it('GET /api/support/tickets - should list open tickets for event', async () => {
      const res = await request(app)
        .get(`/api/support/tickets?eventId=${activeEvent.id}&status=OPEN`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.tickets)).toBe(true);
      expect(res.body.tickets.some(t => t.id === createdTicketId)).toBe(true);
    });

    it('PATCH /api/support/tickets/:id/claim - should allow Mentor Elena to claim the ticket', async () => {
      const res = await request(app)
        .patch(`/api/support/tickets/${createdTicketId}/claim`)
        .set('Authorization', `Bearer ${judgeToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.ticket.status).toBe('CLAIMED');
      expect(res.body.ticket.mentorId).toBe(judge.id);
      expect(res.body.ticket.mentor.name).toBe(judge.name);
    });

    it('PATCH /api/support/tickets/:id/status - should allow Elena to resolve the ticket and earn reputation', async () => {
      const initialJudge = await prisma.user.findUnique({ where: { id: judge.id } });
      const initialScore = initialJudge.reputationScore;

      const res = await request(app)
        .patch(`/api/support/tickets/${createdTicketId}/status`)
        .set('Authorization', `Bearer ${judgeToken}`)
        .send({
          status: 'RESOLVED',
          resolutionNotes: 'Fixed buffer alignment and increased web worker memory pool.'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.ticket.status).toBe('RESOLVED');
      expect(res.body.ticket.resolutionNotes).toContain('Fixed buffer alignment');

      const updatedJudge = await prisma.user.findUnique({ where: { id: judge.id } });
      expect(updatedJudge.reputationScore).toBe(initialScore + 25);
    });
  });

  describe('3. Office Hours Scheduling', () => {
    let slotId;

    it('POST /api/mentors/office-hours - should allow Elena to create an office hour slot', async () => {
      const start = new Date(Date.now() + 3600000); // 1 hour from now
      const end = new Date(Date.now() + 5400000);   // 1.5 hours from now

      const res = await request(app)
        .post('/api/mentors/office-hours')
        .set('Authorization', `Bearer ${judgeToken}`)
        .send({
          eventId: activeEvent.id,
          topic: 'Architecture Review & ZK Circuits',
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          location: 'Mentor Booth A'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.slot).toBeDefined();
      expect(res.body.slot.topic).toBe('Architecture Review & ZK Circuits');
      expect(res.body.slot.status).toBe('OPEN');

      slotId = res.body.slot.id;
    });

    it('POST /api/mentors/office-hours/:id/book - should allow Alice to book the slot', async () => {
      const res = await request(app)
        .post(`/api/mentors/office-hours/${slotId}/book`)
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.slot.status).toBe('BOOKED');
      expect(res.body.slot.bookedById).toBe(alice.id);
      expect(res.body.slot.bookedBy.name).toBe(alice.name);
    });

    it('POST /api/mentors/office-hours/:id/book - should reject double booking on already booked slot', async () => {
      const res = await request(app)
        .post(`/api/mentors/office-hours/${slotId}/book`)
        .set('Authorization', `Bearer ${bobToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('already booked');
    });

    it('DELETE /api/mentors/office-hours/:id/cancel - should allow Alice or Elena to cancel the slot', async () => {
      const res = await request(app)
        .delete(`/api/mentors/office-hours/${slotId}/cancel`)
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.slot.status).toBe('CANCELLED');
    });
  });
});
