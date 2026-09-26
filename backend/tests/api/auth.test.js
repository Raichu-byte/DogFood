const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/db');

describe('Authentication API Tests (Phase 3)', () => {
  const testUser = {
    name: 'Test Hacker',
    email: 'hacker@dogfood.test',
    password: 'SecurePassword123!',
    role: 'PARTICIPANT',
  };

  afterAll(async () => {
    // Clean up test user
    await prisma.user.deleteMany({
      where: { email: { in: ['hacker@dogfood.test', 'newjudge@dogfood.test'] } },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new participant and return JWT token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toEqual(testUser.email);
      expect(res.body.user.name).toEqual(testUser.name);
      expect(res.body.user.role).toEqual('PARTICIPANT');
      // SECURITY: passwordHash must NEVER be exposed
      expect(res.body.user).not.toHaveProperty('passwordHash');
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should reject registration with duplicate email (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.statusCode).toEqual(409);
      expect(res.body.code).toEqual('EMAIL_ALREADY_EXISTS');
    });

    it('should reject registration with missing required fields (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'incomplete@dogfood.test' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.code).toEqual('VALIDATION_FAILED');
    });

    it('should reject registration with invalid email format (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Bob', email: 'not-an-email', password: 'Password123!' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.code).toEqual('INVALID_EMAIL');
    });

    it('should reject registration with short password (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Bob', email: 'bob2@dogfood.test', password: '123' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.code).toEqual('WEAK_PASSWORD');
    });

    it('should reject privilege escalation attempt to ORGANIZER or ADMIN (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Hacker', email: 'evil@dogfood.test', password: 'Password123!', role: 'ORGANIZER' });

      expect(res.statusCode).toEqual(403);
      expect(res.body.code).toEqual('ROLE_ELEVATION_DENIED');
    });

    it('should allow valid self-registration as JUDGE role', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'New Judge', email: 'newjudge@dogfood.test', password: 'Password123!', role: 'JUDGE' });

      expect(res.statusCode).toEqual(201);
      expect(res.body.user.role).toEqual('JUDGE');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate seeded organizer with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'organizer@dogfood.test',
          password: 'Password123!',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toEqual('organizer@dogfood.test');
      expect(res.body.user.role).toEqual('ORGANIZER');
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('should reject login with wrong password (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'organizer@dogfood.test',
          password: 'WrongPassword999!',
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.code).toEqual('INVALID_CREDENTIALS');
    });

    it('should reject login with non-existent email (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nobody@dogfood.test',
          password: 'Password123!',
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.code).toEqual('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/auth/me (Protected Route)', () => {
    let validToken;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'organizer@dogfood.test',
          password: 'Password123!',
        });
      validToken = loginRes.body.token;
    });

    it('should return user profile when valid Bearer token provided', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.user.email).toEqual('organizer@dogfood.test');
      expect(res.body.user.role).toEqual('ORGANIZER');
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('should reject request missing Authorization header (401 Unauthorized)', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.statusCode).toEqual(401);
      expect(res.body.code).toEqual('AUTH_TOKEN_MISSING');
    });

    it('should reject request with malformed or invalid token (401 Unauthorized)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_fake_token_123');

      expect(res.statusCode).toEqual(401);
      expect(res.body.code).toEqual('AUTH_TOKEN_INVALID');
    });
  });
});
