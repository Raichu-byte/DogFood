const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/db');
const { hashPassword } = require('../../src/utils/auth');

describe('Team Matching & Hacker Directory API (Phase 18)', () => {
  let organizerToken;
  let leader1Token;
  let leader2Token;
  let hacker1Token;
  let hacker2Token;

  let organizer;
  let leader1;
  let leader2;
  let hacker1;
  let hacker2;

  let event;
  let team1;
  let team2;
  let applicationRequest;
  let invitationRequest;

  beforeAll(async () => {
    // 1. Cleanup old test records
    await prisma.joinRequest.deleteMany({
      where: {
        team: { event: { slug: 'phase18-matchmaking-hackathon' } },
      },
    });
    await prisma.teamMember.deleteMany({
      where: {
        team: { event: { slug: 'phase18-matchmaking-hackathon' } },
      },
    });
    await prisma.submission.deleteMany({
      where: {
        event: { slug: 'phase18-matchmaking-hackathon' },
      },
    });
    await prisma.team.deleteMany({
      where: {
        event: { slug: 'phase18-matchmaking-hackathon' },
      },
    });
    await prisma.event.deleteMany({
      where: { slug: 'phase18-matchmaking-hackathon' },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'p18_organizer@example.com',
            'p18_leader1@example.com',
            'p18_leader2@example.com',
            'p18_hacker1@example.com',
            'p18_hacker2@example.com',
          ],
        },
      },
    });

    const passwordHash = await hashPassword('Password123!');

    // 2. Create test users with skill tags
    organizer = await prisma.user.create({
      data: {
        email: 'p18_organizer@example.com',
        name: 'Olivia Organizer',
        passwordHash,
        role: 'ORGANIZER',
      },
    });

    leader1 = await prisma.user.create({
      data: {
        email: 'p18_leader1@example.com',
        name: 'Liam Leader',
        passwordHash,
        role: 'PARTICIPANT',
        skills: JSON.stringify(['Rust', 'WebAssembly']),
        bio: 'Distributed systems architect',
      },
    });

    leader2 = await prisma.user.create({
      data: {
        email: 'p18_leader2@example.com',
        name: 'Lucy Leader',
        passwordHash,
        role: 'PARTICIPANT',
        skills: JSON.stringify(['Python', 'PyTorch']),
        bio: 'AI researcher',
      },
    });

    hacker1 = await prisma.user.create({
      data: {
        email: 'p18_hacker1@example.com',
        name: 'Harry Hacker',
        passwordHash,
        role: 'PARTICIPANT',
        skills: JSON.stringify(['React', 'TypeScript', 'TailwindCSS']),
        bio: 'Frontend visual designer & frontend dev',
        lookingForTeam: true,
        rolesSeeking: JSON.stringify(['Frontend Developer', 'UI Designer']),
      },
    });

    hacker2 = await prisma.user.create({
      data: {
        email: 'p18_hacker2@example.com',
        name: 'Hannah Hacker',
        passwordHash,
        role: 'PARTICIPANT',
        skills: JSON.stringify(['Solidity', 'EVM', 'Rust']),
        bio: 'Smart contract security auditor',
        lookingForTeam: true,
        rolesSeeking: JSON.stringify(['Smart Contract Engineer']),
      },
    });

    // 3. Obtain auth tokens
    const [resOrg, resL1, resL2, resH1, resH2] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'p18_organizer@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'p18_leader1@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'p18_leader2@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'p18_hacker1@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'p18_hacker2@example.com', password: 'Password123!' }),
    ]);

    organizerToken = resOrg.body.token;
    leader1Token = resL1.body.token;
    leader2Token = resL2.body.token;
    hacker1Token = resH1.body.token;
    hacker2Token = resH2.body.token;

    // 4. Create Event & Teams
    const now = Date.now();
    event = await prisma.event.create({
      data: {
        name: 'Matchmaking Championship',
        slug: 'phase18-matchmaking-hackathon',
        description: 'Team matchmaking and directory testing',
        organizerId: organizer.id,
        status: 'ACTIVE',
        submissionDeadline: new Date(now + 86400000 * 5),
        judgingDeadline: new Date(now + 86400000 * 7),
        votingDeadline: new Date(now + 86400000 * 9),
      },
    });

    team1 = await prisma.team.create({
      data: {
        name: 'Aether Core',
        eventId: event.id,
        inviteCode: 'P18-AETH',
        creatorId: leader1.id,
        description: 'Building offline CRDT sync protocol',
        isLookingForMembers: true,
        skillsNeeded: JSON.stringify(['React', 'TypeScript']),
        openRoles: JSON.stringify(['Frontend Engineer']),
        maxMembers: 3,
        members: {
          create: [{ userId: leader1.id, role: 'LEADER' }],
        },
      },
    });

    team2 = await prisma.team.create({
      data: {
        name: 'Neural Hive',
        eventId: event.id,
        inviteCode: 'P18-HIVE',
        creatorId: leader2.id,
        description: 'Edge LLM orchestration engine',
        isLookingForMembers: true,
        skillsNeeded: JSON.stringify(['Solidity', 'Rust']),
        openRoles: JSON.stringify(['Smart Contract Dev']),
        maxMembers: 2,
        members: {
          create: [{ userId: leader2.id, role: 'LEADER' }],
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.joinRequest.deleteMany({
      where: {
        team: { event: { slug: 'phase18-matchmaking-hackathon' } },
      },
    });
    await prisma.teamMember.deleteMany({
      where: {
        team: { event: { slug: 'phase18-matchmaking-hackathon' } },
      },
    });
    await prisma.submission.deleteMany({
      where: {
        event: { slug: 'phase18-matchmaking-hackathon' },
      },
    });
    await prisma.team.deleteMany({
      where: {
        event: { slug: 'phase18-matchmaking-hackathon' },
      },
    });
    await prisma.event.deleteMany({
      where: { slug: 'phase18-matchmaking-hackathon' },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'p18_organizer@example.com',
            'p18_leader1@example.com',
            'p18_leader2@example.com',
            'p18_hacker1@example.com',
            'p18_hacker2@example.com',
          ],
        },
      },
    });
  });

  describe('1. Hacker Directory & Profile Management', () => {
    it('should list hackers in the directory with skill filtering', async () => {
      const res = await request(app)
        .get('/api/matchmaking/hackers?skill=React');

      expect(res.status).toBe(200);
      expect(res.body.hackers.length).toBeGreaterThanOrEqual(1);
      const h1 = res.body.hackers.find(h => h.id === hacker1.id);
      expect(h1).toBeDefined();
      expect(h1.name).toBe('Harry Hacker');
      expect(h1.skills).toContain('React');
      expect(h1.email).toBeUndefined(); // Zero sensitive leakage
    });

    it('should allow logged-in hacker to update bio, skills, and roles seeking', async () => {
      const res = await request(app)
        .put('/api/matchmaking/profile')
        .set('Authorization', `Bearer ${hacker1Token}`)
        .send({
          bio: 'Senior Full Stack Specialist & WebGPU explorer',
          skills: ['React', 'TypeScript', 'WebGPU', 'TailwindCSS'],
          githubUsername: 'harry-builder',
          lookingForTeam: true,
          rolesSeeking: ['Lead Frontend Engineer', 'UI/UX Lead'],
        });

      expect(res.status).toBe(200);
      expect(res.body.profile.skills).toContain('WebGPU');
      expect(res.body.profile.githubUsername).toBe('harry-builder');
      expect(res.body.profile.rolesSeeking).toContain('Lead Frontend Engineer');
    });
  });

  describe('2. Team Discovery & Matchmaking Settings', () => {
    it('should list recruiting teams with skill-needed filtering', async () => {
      const res = await request(app)
        .get(`/api/matchmaking/teams?eventId=${event.id}&skill=Solidity`);

      expect(res.status).toBe(200);
      expect(res.body.teams).toHaveLength(1);
      expect(res.body.teams[0].name).toBe('Neural Hive');
      expect(res.body.teams[0].skillsNeeded).toContain('Solidity');
      expect(res.body.teams[0].members[0].name).toBe('Lucy Leader');
      expect(res.body.teams[0].members[0].email).toBeUndefined();
    });

    it('should allow team leader to update recruiting settings and open roles', async () => {
      const res = await request(app)
        .put(`/api/matchmaking/teams/${team1.id}`)
        .set('Authorization', `Bearer ${leader1Token}`)
        .send({
          description: 'High performance CRDT synchronization over WebSockets and WebRTC',
          isLookingForMembers: true,
          skillsNeeded: ['React', 'WebGPU', 'TypeScript'],
          openRoles: ['Lead Frontend Engineer'],
          maxMembers: 4,
        });

      expect(res.status).toBe(200);
      expect(res.body.team.maxMembers).toBe(4);
      expect(res.body.team.skillsNeeded).toContain('WebGPU');
    });

    it('should prevent non-leader from modifying team matchmaking settings', async () => {
      const res = await request(app)
        .put(`/api/matchmaking/teams/${team1.id}`)
        .set('Authorization', `Bearer ${hacker1Token}`)
        .send({ maxMembers: 10 });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });
  });

  describe('3. Applications & Invitations Lifecycle', () => {
    it('should allow hacker to submit join application to a recruiting team', async () => {
      const res = await request(app)
        .post(`/api/matchmaking/teams/${team1.id}/apply`)
        .set('Authorization', `Bearer ${hacker1Token}`)
        .send({
          message: 'I have deep experience with React and WebSockets!',
          role: 'Frontend Engineer',
        });

      expect(res.status).toBe(201);
      expect(res.body.request.id).toBeDefined();
      expect(res.body.request.type).toBe('APPLICATION');
      expect(res.body.request.status).toBe('PENDING');

      applicationRequest = res.body.request;
    });

    it('should prevent duplicate pending applications from the same hacker', async () => {
      const res = await request(app)
        .post(`/api/matchmaking/teams/${team1.id}/apply`)
        .set('Authorization', `Bearer ${hacker1Token}`)
        .send({ message: 'Duplicate attempt' });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('REQUEST_ALREADY_PENDING');
    });

    it('should allow team leader to send an invitation to a hacker', async () => {
      const res = await request(app)
        .post(`/api/matchmaking/teams/${team2.id}/invite`)
        .set('Authorization', `Bearer ${leader2Token}`)
        .send({
          userId: hacker2.id,
          message: 'We need your Solidity audit expertise on Neural Hive!',
          role: 'Smart Contract Auditor',
        });

      expect(res.status).toBe(201);
      expect(res.body.invite.id).toBeDefined();
      expect(res.body.invite.type).toBe('INVITATION');
      expect(res.body.invite.status).toBe('PENDING');

      invitationRequest = res.body.invite;
    });

    it('should allow team leader to view incoming team requests', async () => {
      const res = await request(app)
        .get(`/api/matchmaking/teams/${team1.id}/requests`)
        .set('Authorization', `Bearer ${leader1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.totalCount).toBe(1);
      expect(res.body.requests[0].id).toBe(applicationRequest.id);
      expect(res.body.requests[0].user.name).toBe('Harry Hacker');
    });

    it('should allow hacker to view their applications and received invites', async () => {
      const res = await request(app)
        .get('/api/matchmaking/my-requests')
        .set('Authorization', `Bearer ${hacker2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.totalCount).toBe(1);
      expect(res.body.requests[0].id).toBe(invitationRequest.id);
      expect(res.body.requests[0].type).toBe('INVITATION');
    });

    it('should allow team leader to ACCEPT join application, adding hacker to team', async () => {
      const res = await request(app)
        .patch(`/api/matchmaking/requests/${applicationRequest.id}/respond`)
        .set('Authorization', `Bearer ${leader1Token}`)
        .send({ action: 'ACCEPT' });

      expect(res.status).toBe(200);
      expect(res.body.request.status).toBe('ACCEPTED');
      expect(res.body.member.role).toBe('MEMBER');

      // Verify DB membership
      const membership = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: team1.id,
            userId: hacker1.id,
          },
        },
      });
      expect(membership).toBeDefined();
      expect(membership.role).toBe('MEMBER');
    });

    it('should reject application if hacker is now already a member of a team in this event', async () => {
      // Hacker 1 attempts to apply to Team 2
      const res = await request(app)
        .post(`/api/matchmaking/teams/${team2.id}/apply`)
        .set('Authorization', `Bearer ${hacker1Token}`)
        .send({ message: 'Applying to second team' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('ALREADY_IN_A_TEAM');
    });

    it('should allow invited hacker to ACCEPT team invitation and join team', async () => {
      const res = await request(app)
        .patch(`/api/matchmaking/requests/${invitationRequest.id}/respond`)
        .set('Authorization', `Bearer ${hacker2Token}`)
        .send({ action: 'ACCEPT' });

      expect(res.status).toBe(200);
      expect(res.body.request.status).toBe('ACCEPTED');

      const membership = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: team2.id,
            userId: hacker2.id,
          },
        },
      });
      expect(membership).toBeDefined();
    });

    it('should reject applications when team has reached maximum capacity', async () => {
      // Team 2 maxMembers was 2 (Leader 2 + Hacker 2 = 2 members, FULL)
      // Create Hacker 3
      const passwordHash = await hashPassword('Password123!');
      const hacker3 = await prisma.user.create({
        data: {
          email: 'p18_hacker3@example.com',
          name: 'Henry Hacker',
          passwordHash,
          role: 'PARTICIPANT',
        },
      });
      const loginH3 = await request(app).post('/api/auth/login').send({
        email: 'p18_hacker3@example.com',
        password: 'Password123!',
      });

      const res = await request(app)
        .post(`/api/matchmaking/teams/${team2.id}/apply`)
        .set('Authorization', `Bearer ${loginH3.body.token}`)
        .send({ message: 'Can I join?' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('TEAM_FULL');

      // Cleanup Hacker 3
      await prisma.user.delete({ where: { id: hacker3.id } });
    });
  });
});
