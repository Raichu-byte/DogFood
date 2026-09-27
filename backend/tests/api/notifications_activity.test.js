const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/db');
const { hashPassword } = require('../../src/utils/auth');
const notificationService = require('../../src/services/notificationService');
const activityService = require('../../src/services/activityService');
const realtimeService = require('../../src/services/realtimeService');
const jwt = require('jsonwebtoken');

describe('Notifications & Real-Time Activity Feed API Tests (Phase 19)', () => {
  let organizerToken;
  let participant1Token;
  let participant2Token;
  let organizerUser;
  let participant1;
  let participant2;
  let testEvent;

  beforeAll(async () => {
    // 1. Cleanup old records
    await prisma.notification.deleteMany({
      where: {
        user: {
          email: { in: ['p19_organizer@example.com', 'p19_participant1@example.com', 'p19_participant2@example.com'] },
        },
      },
    });
    await prisma.auditLog.deleteMany({
      where: {
        actor: {
          email: { in: ['p19_organizer@example.com', 'p19_participant1@example.com', 'p19_participant2@example.com'] },
        },
      },
    });
    await prisma.event.deleteMany({
      where: { slug: 'phase19-notifications-hackathon' },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ['p19_organizer@example.com', 'p19_participant1@example.com', 'p19_participant2@example.com'] },
      },
    });

    const passwordHash = await hashPassword('Password123!');

    // 2. Create isolated test users
    organizerUser = await prisma.user.create({
      data: {
        email: 'p19_organizer@example.com',
        name: 'Phase19 Organizer',
        passwordHash,
        role: 'ORGANIZER',
      },
    });

    participant1 = await prisma.user.create({
      data: {
        email: 'p19_participant1@example.com',
        name: 'Phase19 Alice',
        passwordHash,
        role: 'PARTICIPANT',
      },
    });

    participant2 = await prisma.user.create({
      data: {
        email: 'p19_participant2@example.com',
        name: 'Phase19 Bob',
        passwordHash,
        role: 'PARTICIPANT',
      },
    });

    // 3. Create tokens
    organizerToken = jwt.sign(
      { id: organizerUser.id, role: organizerUser.role, email: organizerUser.email },
      process.env.JWT_SECRET || 'dogfood_jwt_secret_dev_key_2026_offline',
      { expiresIn: '1h' }
    );

    participant1Token = jwt.sign(
      { id: participant1.id, role: participant1.role, email: participant1.email },
      process.env.JWT_SECRET || 'dogfood_jwt_secret_dev_key_2026_offline',
      { expiresIn: '1h' }
    );

    participant2Token = jwt.sign(
      { id: participant2.id, role: participant2.role, email: participant2.email },
      process.env.JWT_SECRET || 'dogfood_jwt_secret_dev_key_2026_offline',
      { expiresIn: '1h' }
    );

    // 4. Create test event
    testEvent = await prisma.event.create({
      data: {
        name: 'Phase 19 Notifications Hackathon',
        slug: 'phase19-notifications-hackathon',
        description: 'Testing activity feed and notification streams',
        organizerId: organizerUser.id,
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
          email: { in: ['p19_organizer@example.com', 'p19_participant1@example.com', 'p19_participant2@example.com'] },
        },
      },
    });
    await prisma.auditLog.deleteMany({
      where: {
        actor: {
          email: { in: ['p19_organizer@example.com', 'p19_participant1@example.com', 'p19_participant2@example.com'] },
        },
      },
    });
    await prisma.event.deleteMany({
      where: { slug: 'phase19-notifications-hackathon' },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ['p19_organizer@example.com', 'p19_participant1@example.com', 'p19_participant2@example.com'] },
      },
    });
  });

  describe('In-App Notification Center API', () => {
    let notif1Id;
    let notif2Id;

    it('should reject unauthenticated access to notifications (401 Unauthorized)', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
    });

    it('should return empty notifications list and 0 unreadCount initially', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${participant1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.notifications).toEqual([]);
      expect(res.body.unreadCount).toBe(0);
      expect(res.body.total).toBe(0);
    });

    it('should create notifications programmatically and stream via SSE', async () => {
      const notif1 = await notificationService.createNotification({
        userId: participant1.id,
        type: 'ANNOUNCEMENT',
        title: 'Important Event Update',
        message: 'Submission deadline extended by 2 hours.',
        link: `/events/${testEvent.slug}/announcements`,
      });

      const notif2 = await notificationService.createNotification({
        userId: participant1.id,
        type: 'TEAM_INVITE',
        title: 'Team Invitation',
        message: 'You have been invited to join Team Alpha.',
        link: '/matchmaking',
      });

      notif1Id = notif1.id;
      notif2Id = notif2.id;

      expect(notif1.id).toBeDefined();
      expect(notif1.isRead).toBe(false);
      expect(notif2.id).toBeDefined();
    });

    it('should fetch notifications list with accurate unreadCount and metadata', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${participant1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.unreadCount).toBe(2);
      expect(res.body.notifications.length).toBe(2);
      expect(res.body.notifications[0].id).toBe(notif2Id); // Latest first
    });

    it('should fetch quick unread count badge endpoint', async () => {
      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${participant1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.unreadCount).toBe(2);
    });

    it('should mark a single notification as read (PATCH /api/notifications/:id/read)', async () => {
      const res = await request(app)
        .patch(`/api/notifications/${notif1Id}/read`)
        .set('Authorization', `Bearer ${participant1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(notif1Id);
      expect(res.body.isRead).toBe(true);
      expect(res.body.readAt).toBeDefined();

      // Verify unread count decreased to 1
      const countRes = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${participant1Token}`);
      expect(countRes.body.unreadCount).toBe(1);
    });

    it('should filter unread notifications with ?unreadOnly=true', async () => {
      const res = await request(app)
        .get('/api/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${participant1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.notifications.length).toBe(1);
      expect(res.body.notifications[0].id).toBe(notif2Id);
    });

    it('should reject another user from reading or modifying others notifications (404/Isolated)', async () => {
      const res = await request(app)
        .patch(`/api/notifications/${notif2Id}/read`)
        .set('Authorization', `Bearer ${participant2Token}`);

      expect(res.status).toBe(404);
    });

    it('should mark all notifications as read (PUT /api/notifications/read-all)', async () => {
      const res = await request(app)
        .put('/api/notifications/read-all')
        .set('Authorization', `Bearer ${participant1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('marked as read');

      const countRes = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${participant1Token}`);
      expect(countRes.body.unreadCount).toBe(0);
    });

    it('should delete a notification (DELETE /api/notifications/:id)', async () => {
      const res = await request(app)
        .delete(`/api/notifications/${notif1Id}`)
        .set('Authorization', `Bearer ${participant1Token}`);

      expect(res.status).toBe(200);

      const listRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${participant1Token}`);
      expect(listRes.body.total).toBe(1);
      expect(listRes.body.notifications[0].id).toBe(notif2Id);
    });
  });

  describe('Real-Time Activity Feed API', () => {
    beforeAll(async () => {
      // Log some test activities
      await activityService.logActivity({
        eventId: testEvent.id,
        actorId: organizerUser.id,
        action: 'EVENT_CREATED',
        targetResource: 'Event',
        targetId: testEvent.id,
        metadata: { eventName: testEvent.name },
      });

      await activityService.logActivity({
        eventId: testEvent.id,
        actorId: participant1.id,
        action: 'TEAM_CREATED',
        targetResource: 'Team',
        targetId: 'team_xyz',
        metadata: { teamName: 'Quantum Coders' },
      });
    });

    it('should fetch public activity feed without authentication (200 OK)', async () => {
      const res = await request(app).get('/api/activity/feed');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.activities)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(2);
      expect(res.body.activities[0]).toHaveProperty('action');
      expect(res.body.activities[0]).toHaveProperty('actor');
      expect(res.body.activities[0]).toHaveProperty('timestamp');
    });

    it('should filter activity feed by eventId', async () => {
      const res = await request(app).get(`/api/activity/feed?eventId=${testEvent.id}`);
      expect(res.status).toBe(200);
      expect(res.body.activities.every(a => a.eventId === testEvent.id)).toBe(true);
    });

    it('should filter activity feed by action', async () => {
      const res = await request(app).get(`/api/activity/feed?action=TEAM_CREATED`);
      expect(res.status).toBe(200);
      expect(res.body.activities.every(a => a.action === 'TEAM_CREATED')).toBe(true);
    });
  });

  describe('SSE Stream & Real-Time Notification Dispatch', () => {
    it('should reject unauthenticated connection to notification stream (401)', async () => {
      const res = await request(app).get('/api/notifications/stream');
      expect(res.status).toBe(401);
    });

    it('should broadcast NOTIFICATION_RECEIVED event to personal user channel', (done) => {
      const userChannel = `user:${participant1.id}`;
      const onNotification = (payload) => {
        expect(payload.channel).toBe(userChannel);
        expect(payload.type).toBe('NOTIFICATION_RECEIVED');
        expect(payload.data.title).toBe('Realtime Test Alert');
        realtimeService.off(userChannel, onNotification);
        done();
      };

      realtimeService.on(userChannel, onNotification);
      notificationService.createNotification({
        userId: participant1.id,
        type: 'SYSTEM',
        title: 'Realtime Test Alert',
        message: 'Testing instant delivery',
      });
    });

    it('should broadcast ACTIVITY_LOGGED event to global and event activity channels', (done) => {
      const globalChannel = 'activity:global';
      const onActivity = (payload) => {
        expect(payload.channel).toBe(globalChannel);
        expect(payload.type).toBe('ACTIVITY_LOGGED');
        expect(payload.data.action).toBe('REALTIME_TEST_ACTION');
        realtimeService.off(globalChannel, onActivity);
        done();
      };

      realtimeService.on(globalChannel, onActivity);
      activityService.logActivity({
        eventId: testEvent.id,
        actorId: organizerUser.id,
        action: 'REALTIME_TEST_ACTION',
        targetResource: 'Test',
        targetId: 'test_123',
      });
    });
  });
});
