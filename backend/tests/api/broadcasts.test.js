const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/db');
const { hashPassword } = require('../../src/utils/auth');
const realtimeService = require('../../src/services/realtimeService');
const jwt = require('jsonwebtoken');

describe('Organizer Broadcast System & Multi-Channel Alert Manager (Phase 20)', () => {
  let organizerToken;
  let participantToken;
  let judgeToken;
  let organizer;
  let participant;
  let judge;
  let event;

  beforeAll(async () => {
    // 1. Cleanup old records
    await prisma.notification.deleteMany({
      where: {
        user: {
          email: { in: ['p20_organizer@example.com', 'p20_participant@example.com', 'p20_judge@example.com'] },
        },
      },
    });
    await prisma.announcement.deleteMany({
      where: {
        event: { slug: 'phase20-broadcast-hackathon' },
      },
    });
    await prisma.event.deleteMany({
      where: { slug: 'phase20-broadcast-hackathon' },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ['p20_organizer@example.com', 'p20_participant@example.com', 'p20_judge@example.com'] },
      },
    });

    const passwordHash = await hashPassword('Password123!');

    // 2. Create isolated test users
    organizer = await prisma.user.create({
      data: {
        email: 'p20_organizer@example.com',
        name: 'Broadcast Organizer',
        passwordHash,
        role: 'ORGANIZER',
      },
    });

    participant = await prisma.user.create({
      data: {
        email: 'p20_participant@example.com',
        name: 'Broadcast Participant',
        passwordHash,
        role: 'PARTICIPANT',
      },
    });

    judge = await prisma.user.create({
      data: {
        email: 'p20_judge@example.com',
        name: 'Broadcast Judge',
        passwordHash,
        role: 'JUDGE',
      },
    });

    // 3. Create tokens
    organizerToken = jwt.sign(
      { id: organizer.id, role: organizer.role, email: organizer.email },
      process.env.JWT_SECRET || 'dogfood_jwt_secret_dev_key_2026_offline',
      { expiresIn: '1h' }
    );

    participantToken = jwt.sign(
      { id: participant.id, role: participant.role, email: participant.email },
      process.env.JWT_SECRET || 'dogfood_jwt_secret_dev_key_2026_offline',
      { expiresIn: '1h' }
    );

    judgeToken = jwt.sign(
      { id: judge.id, role: judge.role, email: judge.email },
      process.env.JWT_SECRET || 'dogfood_jwt_secret_dev_key_2026_offline',
      { expiresIn: '1h' }
    );

    // 4. Create test event
    event = await prisma.event.create({
      data: {
        name: 'Phase 20 Broadcast Hackathon',
        slug: 'phase20-broadcast-hackathon',
        description: 'Testing multi-channel broadcasts and banner takeovers',
        organizerId: organizer.id,
        submissionDeadline: new Date(Date.now() + 86400000),
        judgingDeadline: new Date(Date.now() + 172800000),
        votingDeadline: new Date(Date.now() + 259200000),
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.notification.deleteMany({
      where: {
        user: {
          email: { in: ['p20_organizer@example.com', 'p20_participant@example.com', 'p20_judge@example.com'] },
        },
      },
    });
    await prisma.announcement.deleteMany({
      where: {
        event: { slug: 'phase20-broadcast-hackathon' },
      },
    });
    await prisma.event.deleteMany({
      where: { slug: 'phase20-broadcast-hackathon' },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ['p20_organizer@example.com', 'p20_participant@example.com', 'p20_judge@example.com'] },
      },
    });
  });

  describe('1. Priority Broadcast Creation & RBAC', () => {
    it('should reject unauthenticated requests to broadcast (401 Unauthorized)', async () => {
      const res = await request(app)
        .post(`/api/events/${event.slug}/announcements`)
        .send({
          title: 'Unauthenticated Alert',
          content: 'This should fail',
        });

      expect(res.status).toBe(401);
    });

    it('should reject PARTICIPANT role from posting broadcasts (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/events/${event.slug}/announcements`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          title: 'Hacker Announcement',
          content: 'Participants cannot broadcast',
        });

      expect(res.status).toBe(403);
    });

    it('should allow ORGANIZER to create an INFO broadcast', async () => {
      const res = await request(app)
        .post(`/api/events/${event.slug}/announcements`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          title: 'Opening Ceremony Schedule',
          content: 'Opening ceremony starts at 10:00 AM UTC in main arena.',
          priority: 'INFO',
          targetAudience: 'ALL',
        });

      expect(res.status).toBe(201);
      expect(res.body.announcement.title).toBe('Opening Ceremony Schedule');
      expect(res.body.announcement.priority).toBe('INFO');
      expect(res.body.announcement.targetAudience).toBe('ALL');
      expect(res.body.announcement.isBannerActive).toBe(false);
    });

    it('should allow ORGANIZER to create a CRITICAL_ALERT with banner takeover active', async () => {
      const res = await request(app)
        .post(`/api/events/${event.slug}/announcements`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          title: 'Deadline Freeze Warning',
          content: 'Submissions freeze strictly in 30 minutes! Lock your repos.',
          priority: 'CRITICAL_ALERT',
          targetAudience: 'PARTICIPANTS_ONLY',
          isBannerActive: true,
          isPinned: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.announcement.title).toBe('Deadline Freeze Warning');
      expect(res.body.announcement.priority).toBe('CRITICAL_ALERT');
      expect(res.body.announcement.isBannerActive).toBe(true);
      expect(res.body.announcement.isPinned).toBe(true);
    });
  });

  describe('2. Active Banner Takeover API', () => {
    it('should fetch active critical banner for event (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/events/${event.slug}/broadcasts/active-banner`);

      expect(res.status).toBe(200);
      expect(res.body.activeBanner).not.toBeNull();
      expect(res.body.activeBanner.title).toBe('Deadline Freeze Warning');
      expect(res.body.activeBanner.priority).toBe('CRITICAL_ALERT');
      expect(res.body.activeBanner.isBannerActive).toBe(true);
    });

    it('should allow organizer to toggle banner active state on/off (PUT /toggle-banner)', async () => {
      const activeRes = await request(app).get(`/api/events/${event.slug}/broadcasts/active-banner`);
      const bannerId = activeRes.body.activeBanner.id;

      // Deactivate
      const deactRes = await request(app)
        .put(`/api/announcements/${bannerId}/toggle-banner`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(deactRes.status).toBe(200);
      expect(deactRes.body.announcement.isBannerActive).toBe(false);

      // Verify active banner is now null
      const checkRes = await request(app).get(`/api/events/${event.slug}/broadcasts/active-banner`);
      expect(checkRes.body.activeBanner).toBeNull();

      // Re-activate
      const reactRes = await request(app)
        .put(`/api/announcements/${bannerId}/toggle-banner`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(reactRes.status).toBe(200);
      expect(reactRes.body.announcement.isBannerActive).toBe(true);
    });
  });

  describe('3. Audience & Priority Filtering', () => {
    beforeAll(async () => {
      // Create a Judges-only broadcast
      await request(app)
        .post(`/api/events/${event.slug}/announcements`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          title: 'Scoring Matrix Calibration Guidelines',
          content: 'Judges please calibrate rubrics according to Z-score norms.',
          priority: 'IMPORTANT',
          targetAudience: 'JUDGES_ONLY',
        });
    });

    it('should filter announcements by priority', async () => {
      const res = await request(app)
        .get(`/api/events/${event.slug}/announcements?priority=CRITICAL_ALERT`);

      expect(res.status).toBe(200);
      expect(res.body.announcements.every(a => a.priority === 'CRITICAL_ALERT')).toBe(true);
    });

    it('should filter announcements by targetAudience', async () => {
      const res = await request(app)
        .get(`/api/events/${event.slug}/announcements?targetAudience=JUDGES_ONLY`);

      expect(res.status).toBe(200);
      expect(res.body.announcements.every(a => a.targetAudience === 'JUDGES_ONLY')).toBe(true);
      expect(res.body.announcements[0].title).toBe('Scoring Matrix Calibration Guidelines');
    });

    it('should prioritize pinned announcements first in listing', async () => {
      const res = await request(app)
        .get(`/api/events/${event.slug}/announcements`);

      expect(res.status).toBe(200);
      expect(res.body.announcements[0].isPinned).toBe(true);
    });
  });

  describe('4. Real-Time SSE Broadcast & Audit Dispatch', () => {
    it('should publish BROADCAST_CREATED event across event channel', async () => {
      const eventChannel = `event:${event.id}`;
      let receivedPayload = null;

      const eventPromise = new Promise((resolve) => {
        const onBroadcast = (payload) => {
          receivedPayload = payload;
          realtimeService.off(eventChannel, onBroadcast);
          resolve();
        };
        realtimeService.on(eventChannel, onBroadcast);
      });

      const res = await request(app)
        .post(`/api/events/${event.slug}/announcements`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          title: 'Emergency Maintenance Alert',
          content: 'Local server restart in 5 minutes.',
          priority: 'CRITICAL_ALERT',
        });

      expect(res.status).toBe(201);
      await eventPromise;

      expect(receivedPayload).not.toBeNull();
      expect(receivedPayload.channel).toBe(eventChannel);
      expect(receivedPayload.type).toBe('ANNOUNCEMENT_CREATED');
      expect(receivedPayload.data.title).toBe('Emergency Maintenance Alert');
    });
  });
});
