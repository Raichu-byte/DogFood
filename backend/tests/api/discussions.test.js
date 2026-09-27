const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/db');
const { hashPassword } = require('../../src/utils/auth');
const realtimeService = require('../../src/services/realtimeService');

describe('Real-Time Discussion & Commenting Engine API (Phase 17)', () => {
  let organizerToken;
  let participant1Token;
  let participant2Token;
  let adminToken;

  let organizer;
  let participant1;
  let participant2;
  let admin;

  let event;
  let submission;
  let topComment;
  let replyComment;
  let announcement;

  beforeAll(async () => {
    // 1. Cleanup old data
    await prisma.comment.deleteMany({
      where: {
        submission: {
          event: { slug: 'phase17-discussion-hackathon' },
        },
      },
    });
    await prisma.announcement.deleteMany({
      where: {
        event: { slug: 'phase17-discussion-hackathon' },
      },
    });
    await prisma.auditLog.deleteMany({
      where: {
        event: { slug: 'phase17-discussion-hackathon' },
      },
    });
    await prisma.submission.deleteMany({
      where: {
        event: { slug: 'phase17-discussion-hackathon' },
      },
    });
    await prisma.teamMember.deleteMany({
      where: {
        team: { event: { slug: 'phase17-discussion-hackathon' } },
      },
    });
    await prisma.team.deleteMany({
      where: {
        event: { slug: 'phase17-discussion-hackathon' },
      },
    });
    await prisma.event.deleteMany({
      where: { slug: 'phase17-discussion-hackathon' },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'p17_organizer@example.com',
            'p17_participant1@example.com',
            'p17_participant2@example.com',
            'p17_admin@example.com',
          ],
        },
      },
    });

    const passwordHash = await hashPassword('Password123!');

    // 2. Create test users
    organizer = await prisma.user.create({
      data: {
        email: 'p17_organizer@example.com',
        passwordHash,
        name: 'Olivia Organizer',
        role: 'ORGANIZER',
      },
    });

    participant1 = await prisma.user.create({
      data: {
        email: 'p17_participant1@example.com',
        passwordHash,
        name: 'Paul Participant',
        role: 'PARTICIPANT',
      },
    });

    participant2 = await prisma.user.create({
      data: {
        email: 'p17_participant2@example.com',
        passwordHash,
        name: 'Penny Peer',
        role: 'PARTICIPANT',
      },
    });

    admin = await prisma.user.create({
      data: {
        email: 'p17_admin@example.com',
        passwordHash,
        name: 'Adam Admin',
        role: 'ADMIN',
      },
    });

    // 3. Login to get JWT tokens
    const loginOrg = await request(app).post('/api/auth/login').send({
      email: 'p17_organizer@example.com',
      password: 'Password123!',
    });
    organizerToken = loginOrg.body.token;

    const loginP1 = await request(app).post('/api/auth/login').send({
      email: 'p17_participant1@example.com',
      password: 'Password123!',
    });
    participant1Token = loginP1.body.token;

    const loginP2 = await request(app).post('/api/auth/login').send({
      email: 'p17_participant2@example.com',
      password: 'Password123!',
    });
    participant2Token = loginP2.body.token;

    const loginAdm = await request(app).post('/api/auth/login').send({
      email: 'p17_admin@example.com',
      password: 'Password123!',
    });
    adminToken = loginAdm.body.token;

    // 4. Create Event & Submission
    const now = Date.now();
    event = await prisma.event.create({
      data: {
        name: 'Phase 17 Community Hackathon',
        slug: 'phase17-discussion-hackathon',
        description: 'Discussion and announcements engine testing',
        organizerId: organizer.id,
        status: 'ACTIVE',
        submissionDeadline: new Date(now + 86400000 * 2),
        judgingDeadline: new Date(now + 86400000 * 4),
        votingDeadline: new Date(now + 86400000 * 6),
      },
    });

    const team = await prisma.team.create({
      data: {
        name: 'Synergy Labs',
        eventId: event.id,
        inviteCode: 'P17-SYN',
        creatorId: participant1.id,
        members: {
          create: [{ userId: participant1.id, role: 'LEADER' }],
        },
      },
    });

    submission = await prisma.submission.create({
      data: {
        eventId: event.id,
        teamId: team.id,
        title: 'HyperMesh',
        tagline: 'Decentralized state streaming',
        description: 'P2P protocol for real-time collaboration',
        techStack: JSON.stringify(['Node.js', 'WebSockets', 'Rust']),
        isDraft: false,
        submittedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.comment.deleteMany({
      where: {
        submission: {
          event: { slug: 'phase17-discussion-hackathon' },
        },
      },
    });
    await prisma.announcement.deleteMany({
      where: {
        event: { slug: 'phase17-discussion-hackathon' },
      },
    });
    await prisma.auditLog.deleteMany({
      where: {
        event: { slug: 'phase17-discussion-hackathon' },
      },
    });
    await prisma.submission.deleteMany({
      where: {
        event: { slug: 'phase17-discussion-hackathon' },
      },
    });
    await prisma.teamMember.deleteMany({
      where: {
        team: { event: { slug: 'phase17-discussion-hackathon' } },
      },
    });
    await prisma.team.deleteMany({
      where: {
        event: { slug: 'phase17-discussion-hackathon' },
      },
    });
    await prisma.event.deleteMany({
      where: { slug: 'phase17-discussion-hackathon' },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'p17_organizer@example.com',
            'p17_participant1@example.com',
            'p17_participant2@example.com',
            'p17_admin@example.com',
          ],
        },
      },
    });
  });

  describe('1. Project Threaded Comments API', () => {
    it('should create a top-level comment on a submission', async () => {
      const res = await request(app)
        .post(`/api/submissions/${submission.id}/comments`)
        .set('Authorization', `Bearer ${participant2Token}`)
        .send({
          content: 'Awesome architecture! How does it handle packet loss?',
        });

      expect(res.status).toBe(201);
      expect(res.body.comment.id).toBeDefined();
      expect(res.body.comment.content).toBe('Awesome architecture! How does it handle packet loss?');
      expect(res.body.comment.parentId).toBeNull();
      expect(res.body.comment.author.name).toBe('Penny Peer');
      expect(res.body.comment.author.email).toBeUndefined(); // Zero sensitive leak

      topComment = res.body.comment;
    });

    it('should create a threaded reply to an existing comment', async () => {
      const res = await request(app)
        .post(`/api/submissions/${submission.id}/comments`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .send({
          content: 'We use forward error correction (FEC) with parity blocks.',
          parentId: topComment.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.comment.id).toBeDefined();
      expect(res.body.comment.parentId).toBe(topComment.id);
      expect(res.body.comment.author.name).toBe('Paul Participant');

      replyComment = res.body.comment;
    });

    it('should reject comment with empty or blank content', async () => {
      const res = await request(app)
        .post(`/api/submissions/${submission.id}/comments`)
        .set('Authorization', `Bearer ${participant2Token}`)
        .send({ content: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_FAILED');
    });

    it('should reject threaded reply with non-existent parentId', async () => {
      const res = await request(app)
        .post(`/api/submissions/${submission.id}/comments`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .send({
          content: 'Reply to phantom parent',
          parentId: 'non-existent-parent-id-12345',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_PARENT_COMMENT');
    });

    it('should retrieve comments structured as a nested threaded tree', async () => {
      const res = await request(app)
        .get(`/api/submissions/${submission.id}/comments`);

      expect(res.status).toBe(200);
      expect(res.body.totalCount).toBe(2);
      expect(res.body.comments).toHaveLength(1); // 1 root comment
      expect(res.body.comments[0].id).toBe(topComment.id);
      expect(res.body.comments[0].replies).toHaveLength(1);
      expect(res.body.comments[0].replies[0].id).toBe(replyComment.id);
      expect(res.body.comments[0].replies[0].content).toBe('We use forward error correction (FEC) with parity blocks.');
    });

    it('should allow comment author to edit comment content', async () => {
      const res = await request(app)
        .put(`/api/comments/${topComment.id}`)
        .set('Authorization', `Bearer ${participant2Token}`)
        .send({
          content: 'Awesome architecture! How does it handle packet loss and jitter?',
        });

      expect(res.status).toBe(200);
      expect(res.body.comment.content).toContain('jitter?');
      expect(res.body.comment.isEdited).toBe(true);
    });

    it('should prevent non-author from editing another user comment', async () => {
      const res = await request(app)
        .put(`/api/comments/${topComment.id}`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .send({
          content: 'Malicious edit',
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('should allow organizer to pin a comment', async () => {
      const res = await request(app)
        .patch(`/api/comments/${topComment.id}/pin`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.comment.isPinned).toBe(true);
    });

    it('should reject unauthorized participant from pinning a comment', async () => {
      const res = await request(app)
        .patch(`/api/comments/${topComment.id}/pin`)
        .set('Authorization', `Bearer ${participant1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('should soft-delete parent comment if replies exist (preserve tree structure)', async () => {
      const res = await request(app)
        .delete(`/api/comments/${topComment.id}`)
        .set('Authorization', `Bearer ${participant2Token}`);

      expect(res.status).toBe(200);

      // Verify tree structure is preserved with masked content
      const treeRes = await request(app)
        .get(`/api/submissions/${submission.id}/comments`);

      expect(treeRes.status).toBe(200);
      expect(treeRes.body.comments[0].isDeleted).toBe(true);
      expect(treeRes.body.comments[0].content).toBe('[This comment has been deleted]');
      expect(treeRes.body.comments[0].author.name).toBe('[Deleted]');
      expect(treeRes.body.comments[0].replies).toHaveLength(1);
    });

    it('should hard-delete leaf comment when no replies exist', async () => {
      const res = await request(app)
        .delete(`/api/comments/${replyComment.id}`)
        .set('Authorization', `Bearer ${participant1Token}`);

      expect(res.status).toBe(200);

      const dbCheck = await prisma.comment.findUnique({
        where: { id: replyComment.id },
      });
      expect(dbCheck).toBeNull();
    });
  });

  describe('2. Organizer Event Announcements Engine', () => {
    it('should allow organizer to create a pinned announcement', async () => {
      const res = await request(app)
        .post(`/api/events/${event.slug}/announcements`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          title: 'Judging Phase Begins Tomorrow',
          content: 'Please ensure all repositories and live demo URLs are finalized before midnight.',
          isPinned: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.announcement.id).toBeDefined();
      expect(res.body.announcement.title).toBe('Judging Phase Begins Tomorrow');
      expect(res.body.announcement.isPinned).toBe(true);
      expect(res.body.announcement.author.name).toBe('Olivia Organizer');
      expect(res.body.announcement.author.email).toBeUndefined();

      announcement = res.body.announcement;
    });

    it('should prevent regular participant from creating announcements', async () => {
      const res = await request(app)
        .post(`/api/events/${event.slug}/announcements`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .send({
          title: 'Unauthorized announcement',
          content: 'Spam text',
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('should allow public access to view event announcements', async () => {
      const res = await request(app)
        .get(`/api/events/${event.slug}/announcements`);

      expect(res.status).toBe(200);
      expect(res.body.totalCount).toBe(1);
      expect(res.body.announcements[0].title).toBe('Judging Phase Begins Tomorrow');
      expect(res.body.announcements[0].isPinned).toBe(true);
    });

    it('should allow organizer to update an announcement', async () => {
      const res = await request(app)
        .put(`/api/announcements/${announcement.id}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          content: 'Updated: Judging commences promptly at 10:00 AM UTC.',
        });

      expect(res.status).toBe(200);
      expect(res.body.announcement.content).toContain('10:00 AM UTC');
    });

    it('should allow organizer to delete an announcement', async () => {
      const res = await request(app)
        .delete(`/api/announcements/${announcement.id}`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);

      const dbCheck = await prisma.announcement.findUnique({
        where: { id: announcement.id },
      });
      expect(dbCheck).toBeNull();
    });
  });

  describe('3. Local Real-Time PubSub & Diagnostics', () => {
    it('should expose realtime diagnostic stats', async () => {
      const res = await request(app).get('/api/realtime/stats');

      expect(res.status).toBe(200);
      expect(res.body.totalConnections).toBeDefined();
      expect(res.body.channels).toBeDefined();
    });

    it('should broadcast event messages through local event emitter', (done) => {
      const testChannel = `submission:${submission.id}`;
      const onMessage = (payload) => {
        expect(payload.channel).toBe(testChannel);
        expect(payload.type).toBe('TEST_EVENT');
        expect(payload.data.hello).toBe('world');
        realtimeService.off(testChannel, onMessage);
        done();
      };

      realtimeService.on(testChannel, onMessage);
      realtimeService.publish(testChannel, 'TEST_EVENT', { hello: 'world' });
    });
  });
});
