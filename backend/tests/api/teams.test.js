const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/db');

describe('Teams API Tests (Phase 6)', () => {
  let eventId;
  let user1Token;
  let user2Token;
  let user3Token;
  let createdTeamId;
  let createdInviteCode;

  beforeAll(async () => {
    // 1. Fetch active event
    const event = await prisma.event.findFirst({ where: { slug: 'dogfood-2026' } });
    eventId = event.id;

    // 2. Register three fresh test participants
    const u1 = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Team Lead One', email: 'lead1@dogfood.test', password: 'Password123!' });
    user1Token = u1.body.token;

    const u2 = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Team Member Two', email: 'member2@dogfood.test', password: 'Password123!' });
    user2Token = u2.body.token;

    const u3 = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Team Member Three', email: 'member3@dogfood.test', password: 'Password123!' });
    user3Token = u3.body.token;
  });

  afterAll(async () => {
    // Clean up created test users and teams
    await prisma.user.deleteMany({
      where: { email: { in: ['lead1@dogfood.test', 'member2@dogfood.test', 'member3@dogfood.test'] } },
    });
    if (createdTeamId) {
      await prisma.team.deleteMany({ where: { id: createdTeamId } });
    }
    await prisma.$disconnect();
  });

  describe('POST /api/teams (Team Creation)', () => {
    it('should allow authenticated participant to create a team (201 Created)', async () => {
      const res = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          eventId,
          name: 'QuantumPioneers',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('team');
      expect(res.body.team.name).toEqual('QuantumPioneers');
      expect(res.body.team).toHaveProperty('inviteCode');
      expect(res.body.team.members.length).toEqual(1);
      expect(res.body.team.members[0].role).toEqual('LEADER');

      createdTeamId = res.body.team.id;
      createdInviteCode = res.body.team.inviteCode;
    });

    it('should reject creating a team with duplicate name in same event (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          eventId,
          name: 'QuantumPioneers',
        });

      expect(res.statusCode).toEqual(409);
      expect(res.body.code).toEqual('TEAM_NAME_EXISTS');
    });

    it('should reject user from creating a second team in the same event (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          eventId,
          name: 'SecondTeamAttempt',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.code).toEqual('ALREADY_IN_ANOTHER_TEAM');
    });

    it('should reject unauthenticated request from creating a team (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/teams')
        .send({ eventId, name: 'AnonymousTeam' });

      expect(res.statusCode).toEqual(401);
      expect(res.body.code).toEqual('AUTH_TOKEN_MISSING');
    });
  });

  describe('POST /api/teams/join (Team Joining via Invite Code)', () => {
    it('should allow a participant to join a team with valid inviteCode (200 OK)', async () => {
      const res = await request(app)
        .post('/api/teams/join')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ inviteCode: createdInviteCode });

      expect(res.statusCode).toEqual(200);
      expect(res.body.team.name).toEqual('QuantumPioneers');
      expect(res.body.team.members.length).toEqual(2);

      const newMember = res.body.team.members.find(m => m.user.email === 'member2@dogfood.test');
      expect(newMember).toBeDefined();
      expect(newMember.role).toEqual('MEMBER');
    });

    it('should reject joining with invalid or non-existent invite code (404 Not Found)', async () => {
      const res = await request(app)
        .post('/api/teams/join')
        .set('Authorization', `Bearer ${user3Token}`)
        .send({ inviteCode: 'INVALID-999' });

      expect(res.statusCode).toEqual(404);
      expect(res.body.code).toEqual('INVALID_INVITE_CODE');
    });

    it('should reject participant from joining the same team twice (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/teams/join')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ inviteCode: createdInviteCode });

      expect(res.statusCode).toEqual(400);
      expect(res.body.code).toEqual('ALREADY_TEAM_MEMBER');
    });

    it('should reject user who is already in a team from joining another team in same event (400 Bad Request)', async () => {
      // Create another team with user3
      const otherTeamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${user3Token}`)
        .send({ eventId, name: 'CosmicVoyagers' });

      const otherCode = otherTeamRes.body.team.inviteCode;

      // User2 is already in QuantumPioneers, tries to join CosmicVoyagers
      const res = await request(app)
        .post('/api/teams/join')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ inviteCode: otherCode });

      expect(res.statusCode).toEqual(400);
      expect(res.body.code).toEqual('ALREADY_IN_ANOTHER_TEAM');

      // Cleanup other team
      await prisma.team.deleteMany({ where: { id: otherTeamRes.body.team.id } });
    });
  });

  describe('GET /api/teams/my-team (User Team Query)', () => {
    it('should return current user’s team in the active event', async () => {
      const res = await request(app)
        .get(`/api/teams/my-team?eventId=${eventId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.team).toBeDefined();
      expect(res.body.team.name).toEqual('QuantumPioneers');
      expect(res.body.team.members.length).toEqual(2);
    });

    it('should return null when user has no team in the event', async () => {
      const res = await request(app)
        .get(`/api/teams/my-team?eventId=${eventId}`)
        .set('Authorization', `Bearer ${user3Token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.team).toBeNull();
    });
  });

  describe('GET /api/teams/:id (Public Team Inspection)', () => {
    it('should return public team details and roster by ID', async () => {
      const res = await request(app).get(`/api/teams/${createdTeamId}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.team.id).toEqual(createdTeamId);
      expect(res.body.team.name).toEqual('QuantumPioneers');
      expect(res.body.team.members.length).toEqual(2);
    });

    it('should return 404 for non-existent team ID', async () => {
      const res = await request(app).get('/api/teams/non_existent_team_id');

      expect(res.statusCode).toEqual(404);
      expect(res.body.code).toEqual('TEAM_NOT_FOUND');
    });
  });
});
