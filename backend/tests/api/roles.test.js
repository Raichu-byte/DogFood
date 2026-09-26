const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/db');

describe('Role-Based Access Control (RBAC) API Tests (Phase 4)', () => {
  let adminToken;
  let organizerToken;
  let judgeToken;
  let participantToken;
  let targetParticipantId;

  beforeAll(async () => {
    // 1. Login Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@dogfood.test', password: 'Password123!' });
    adminToken = adminRes.body.token;

    // 2. Login Organizer
    const orgRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'organizer@dogfood.test', password: 'Password123!' });
    organizerToken = orgRes.body.token;

    // 3. Login Judge
    const judgeRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'judge1@dogfood.test', password: 'Password123!' });
    judgeToken = judgeRes.body.token;

    // 4. Login Participant (Alice)
    const partRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@dogfood.test', password: 'Password123!' });
    participantToken = partRes.body.token;
    targetParticipantId = partRes.body.user.id;
  });

  afterAll(async () => {
    // Reset Alice back to PARTICIPANT if altered
    if (targetParticipantId) {
      await prisma.user.update({
        where: { id: targetParticipantId },
        data: { role: 'PARTICIPANT' },
      });
    }
    await prisma.$disconnect();
  });

  describe('GET /api/admin/users (RBAC Verification)', () => {
    it('should allow ADMIN to list users (200 OK)', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('users');
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.users.length).toBeGreaterThanOrEqual(14);
    });

    it('should allow ORGANIZER to list users (200 OK)', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('users');
    });

    it('should reject JUDGE from accessing organizer/admin endpoints (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${judgeToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.code).toEqual('ROLE_FORBIDDEN');
      expect(res.body.currentRole).toEqual('JUDGE');
    });

    it('should reject PARTICIPANT from accessing organizer/admin endpoints (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${participantToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.code).toEqual('ROLE_FORBIDDEN');
      expect(res.body.currentRole).toEqual('PARTICIPANT');
    });

    it('should reject unauthenticated request (VISITOR) with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/admin/users');

      expect(res.statusCode).toEqual(401);
      expect(res.body.code).toEqual('AUTH_TOKEN_MISSING');
    });
  });

  describe('PUT /api/admin/users/:id/role (Privilege Boundary Verification)', () => {
    it('should allow ADMIN to promote a participant to JUDGE role (200 OK)', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${targetParticipantId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'JUDGE' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.user.role).toEqual('JUDGE');

      // Revert back to PARTICIPANT
      await request(app)
        .put(`/api/admin/users/${targetParticipantId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'PARTICIPANT' });
    });

    it('should reject ORGANIZER from promoting a user to ADMIN (403 Forbidden)', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${targetParticipantId}/role`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ role: 'ADMIN' });

      expect(res.statusCode).toEqual(403);
      expect(res.body.code).toEqual('INSUFFICIENT_ADMIN_PRIVILEGE');
    });

    it('should reject PARTICIPANT from updating user roles (403 Forbidden)', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${targetParticipantId}/role`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ role: 'ADMIN' });

      expect(res.statusCode).toEqual(403);
      expect(res.body.code).toEqual('ROLE_FORBIDDEN');
    });

    it('should reject invalid role specification (400 Bad Request)', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${targetParticipantId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'SUPER_USER_FAKE' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.code).toEqual('INVALID_ROLE');
    });
  });
});
