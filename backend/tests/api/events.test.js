const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/db');

describe('Events API Tests (Phase 5)', () => {
  let organizerToken;
  let participantToken;
  let adminToken;
  let createdEventId;

  beforeAll(async () => {
    // 1. Login Organizer
    const orgRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'organizer@dogfood.test', password: 'Password123!' });
    organizerToken = orgRes.body.token;

    // 2. Login Participant
    const partRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@dogfood.test', password: 'Password123!' });
    participantToken = partRes.body.token;

    // 3. Login Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@dogfood.test', password: 'Password123!' });
    adminToken = adminRes.body.token;
  });

  afterAll(async () => {
    // Clean up created test event
    if (createdEventId) {
      await prisma.event.deleteMany({ where: { id: createdEventId } });
    }
    await prisma.$disconnect();
  });

  describe('GET /api/events (Public Listing)', () => {
    it('should allow unauthenticated visitors to list events (200 OK)', async () => {
      const res = await request(app).get('/api/events');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('events');
      expect(Array.isArray(res.body.events)).toBe(true);
      expect(res.body.events.length).toBeGreaterThanOrEqual(1);

      const seededEvent = res.body.events.find(e => e.slug === 'dogfood-2026');
      expect(seededEvent).toBeDefined();
      expect(seededEvent.tracks.length).toEqual(3);
    });
  });

  describe('GET /api/events/:idOrSlug (Public Event Details)', () => {
    it('should return event details with tracks, prizes, and criteria by slug', async () => {
      const res = await request(app).get('/api/events/dogfood-2026');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('event');
      expect(res.body.event.slug).toEqual('dogfood-2026');
      expect(res.body.event.tracks.length).toEqual(3);
      expect(res.body.event.prizes.length).toEqual(3);
      expect(res.body.event.rubricCriteria.length).toEqual(4);
      expect(res.body.event.organizer.email).toEqual('organizer@dogfood.test');
    });

    it('should return 404 for non-existent event', async () => {
      const res = await request(app).get('/api/events/unknown-hackathon-999');

      expect(res.statusCode).toEqual(404);
      expect(res.body.code).toEqual('EVENT_NOT_FOUND');
    });
  });

  describe('POST /api/events (Event Creation)', () => {
    const now = Date.now();
    const validEventData = {
      name: 'Autumn Systems Hackathon 2026',
      slug: 'autumn-systems-2026',
      description: 'A 48-hour low-level systems hackathon.',
      submissionDeadline: new Date(now + 2 * 86400000).toISOString(),
      judgingDeadline: new Date(now + 4 * 86400000).toISOString(),
      votingDeadline: new Date(now + 6 * 86400000).toISOString(),
      tracks: [
        { name: 'Kernel & Drivers', description: 'Operating system extensions' },
        { name: 'Compilers', description: 'Parser and codegen systems' },
      ],
      prizes: [
        { title: 'Best Compiler', amount: '$4,000' },
      ],
      rubricCriteria: [
        { name: 'Architecture', description: 'System design', weight: 0.50, minScore: 1, maxScore: 10 },
        { name: 'Execution', description: 'Speed and memory usage', weight: 0.50, minScore: 1, maxScore: 10 },
      ],
    };

    it('should allow ORGANIZER to create event with nested tracks, prizes, and criteria (201 Created)', async () => {
      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(validEventData);

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('event');
      expect(res.body.event.name).toEqual(validEventData.name);
      expect(res.body.event.tracks.length).toEqual(2);
      expect(res.body.event.prizes.length).toEqual(1);
      expect(res.body.event.rubricCriteria.length).toEqual(2);
      createdEventId = res.body.event.id;
    });

    it('should reject event creation with chronologically inverted dates (400 Bad Request)', async () => {
      const invalidDates = {
        ...validEventData,
        slug: 'invalid-dates-hack',
        submissionDeadline: new Date(now + 5 * 86400000).toISOString(),
        judgingDeadline: new Date(now + 2 * 86400000).toISOString(), // judging before submission!
      };

      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(invalidDates);

      expect(res.statusCode).toEqual(400);
      expect(res.body.code).toEqual('CHRONOLOGY_ERROR');
    });

    it('should reject event creation with invalid rubric criteria weights sum (400 Bad Request)', async () => {
      const invalidRubric = {
        ...validEventData,
        slug: 'invalid-rubric-hack',
        rubricCriteria: [
          { name: 'Criterion 1', weight: 0.30 },
          { name: 'Criterion 2', weight: 0.30 }, // Sum is 0.60 != 1.0!
        ],
      };

      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(invalidRubric);

      expect(res.statusCode).toEqual(400);
      expect(res.body.code).toEqual('INVALID_RUBRIC_WEIGHTS');
    });

    it('should reject event creation with duplicate slug (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          ...validEventData,
          slug: 'dogfood-2026', // Already exists in seed
        });

      expect(res.statusCode).toEqual(409);
      expect(res.body.code).toEqual('SLUG_EXISTS');
    });

    it('should reject PARTICIPANT from creating events (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ ...validEventData, slug: 'participant-attempt' });

      expect(res.statusCode).toEqual(403);
      expect(res.body.code).toEqual('ROLE_FORBIDDEN');
    });

    it('should reject unauthenticated request from creating events (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/events')
        .send(validEventData);

      expect(res.statusCode).toEqual(401);
      expect(res.body.code).toEqual('AUTH_TOKEN_MISSING');
    });
  });

  describe('PUT /api/events/:id (Event Modification)', () => {
    it('should allow organizer to update their event details (200 OK)', async () => {
      if (!createdEventId) return;

      const res = await request(app)
        .put(`/api/events/${createdEventId}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          description: 'Updated description for systems hackathon.',
          status: 'JUDGING',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.event.description).toEqual('Updated description for systems hackathon.');
      expect(res.body.event.status).toEqual('JUDGING');
    });

    it('should allow ADMIN to update any event (200 OK)', async () => {
      if (!createdEventId) return;

      const res = await request(app)
        .put(`/api/events/${createdEventId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'PUBLISHED',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.event.status).toEqual('PUBLISHED');
    });
  });
});
