const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/db');
const { hashPassword } = require('../../src/utils/auth');

describe('Community Voting API Tests (Phase 14)', () => {
  let organizerToken;
  let voter1Token;
  let voter2Token;
  let teamMemberToken;

  let organizer;
  let voter1;
  let voter2;
  let teamMember;

  let eventOpen;
  let eventClosed;
  let projectAlpha;
  let projectBeta;
  let projectClosed;

  beforeAll(async () => {
    // 1. Cleanup
    await prisma.communityVote.deleteMany({
      where: { event: { slug: { in: ['p14-open-voting-hackathon', 'p14-closed-voting-hackathon'] } } },
    });
    await prisma.projectScoreSummary.deleteMany({
      where: { submission: { event: { slug: { in: ['p14-open-voting-hackathon', 'p14-closed-voting-hackathon'] } } } },
    });
    await prisma.submission.deleteMany({
      where: { event: { slug: { in: ['p14-open-voting-hackathon', 'p14-closed-voting-hackathon'] } } },
    });
    await prisma.teamMember.deleteMany({
      where: { team: { event: { slug: { in: ['p14-open-voting-hackathon', 'p14-closed-voting-hackathon'] } } } },
    });
    await prisma.team.deleteMany({
      where: { event: { slug: { in: ['p14-open-voting-hackathon', 'p14-closed-voting-hackathon'] } } },
    });
    await prisma.event.deleteMany({
      where: { slug: { in: ['p14-open-voting-hackathon', 'p14-closed-voting-hackathon'] } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['p14_org@example.com', 'p14_voter1@example.com', 'p14_voter2@example.com', 'p14_member@example.com'],
        },
      },
    });

    const passwordHash = await hashPassword('Password123!');

    // 2. Create Users
    organizer = await prisma.user.create({
      data: { email: 'p14_org@example.com', name: 'Org Voter', passwordHash, role: 'ORGANIZER' },
    });
    voter1 = await prisma.user.create({
      data: { email: 'p14_voter1@example.com', name: 'Victor Voter One', passwordHash, role: 'PARTICIPANT' },
    });
    voter2 = await prisma.user.create({
      data: { email: 'p14_voter2@example.com', name: 'Valerie Voter Two', passwordHash, role: 'PARTICIPANT' },
    });
    teamMember = await prisma.user.create({
      data: { email: 'p14_member@example.com', name: 'Alpha Member', passwordHash, role: 'PARTICIPANT' },
    });

    // 3. Logins
    const [resOrg, resV1, resV2, resTM] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'p14_org@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'p14_voter1@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'p14_voter2@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'p14_member@example.com', password: 'Password123!' }),
    ]);

    organizerToken = resOrg.body.token;
    voter1Token = resV1.body.token;
    voter2Token = resV2.body.token;
    teamMemberToken = resTM.body.token;

    // 4. Create Open & Closed Events
    eventOpen = await prisma.event.create({
      data: {
        name: 'Phase 14 Open Voting Event',
        slug: 'p14-open-voting-hackathon',
        description: 'Event with active voting deadline',
        status: 'VOTING',
        submissionDeadline: new Date(Date.now() - 86400000 * 5),
        judgingDeadline: new Date(Date.now() - 86400000 * 2),
        votingDeadline: new Date(Date.now() + 86400000 * 5), // Open
        organizerId: organizer.id,
      },
    });

    eventClosed = await prisma.event.create({
      data: {
        name: 'Phase 14 Closed Voting Event',
        slug: 'p14-closed-voting-hackathon',
        description: 'Event with expired voting deadline',
        status: 'FINALIZED',
        submissionDeadline: new Date(Date.now() - 86400000 * 10),
        judgingDeadline: new Date(Date.now() - 86400000 * 5),
        votingDeadline: new Date(Date.now() - 86400000), // Expired
        organizerId: organizer.id,
      },
    });

    // 5. Create Submissions in Open Event:
    const teamA = await prisma.team.create({
      data: {
        name: 'Team Alpha Voting',
        eventId: eventOpen.id,
        inviteCode: 'P14-TA',
        creatorId: teamMember.id,
        members: { create: [{ userId: teamMember.id, role: 'LEADER' }] },
      },
    });
    projectAlpha = await prisma.submission.create({
      data: {
        eventId: eventOpen.id,
        teamId: teamA.id,
        title: 'Project Alpha Rocket',
        tagline: 'High power rocketry simulation',
        description: 'Physics based simulation system',
        techStack: JSON.stringify(['C++', 'Rust']),
        isDraft: false,
        submittedAt: new Date(),
      },
    });
    await prisma.projectScoreSummary.create({
      data: {
        submissionId: projectAlpha.id,
        communityVotesCount: 0,
      },
    });

    const teamB = await prisma.team.create({
      data: {
        name: 'Team Beta Voting',
        eventId: eventOpen.id,
        inviteCode: 'P14-TB',
        creatorId: organizer.id,
        members: { create: [{ userId: organizer.id, role: 'LEADER' }] },
      },
    });
    projectBeta = await prisma.submission.create({
      data: {
        eventId: eventOpen.id,
        teamId: teamB.id,
        title: 'Project Beta Rover',
        tagline: 'Autonomous planetary rover',
        description: 'Terrain mapping and path planning',
        techStack: JSON.stringify(['Python', 'ROS']),
        isDraft: false,
        submittedAt: new Date(),
      },
    });
    await prisma.projectScoreSummary.create({
      data: {
        submissionId: projectBeta.id,
        communityVotesCount: 0,
      },
    });

    // 6. Create Submission in Closed Event:
    const teamClosed = await prisma.team.create({
      data: {
        name: 'Team Closed Voting',
        eventId: eventClosed.id,
        inviteCode: 'P14-TC',
        creatorId: organizer.id,
        members: { create: [{ userId: organizer.id, role: 'LEADER' }] },
      },
    });
    projectClosed = await prisma.submission.create({
      data: {
        eventId: eventClosed.id,
        teamId: teamClosed.id,
        title: 'Project Closed Satellite',
        tagline: 'Historical orbital tracker',
        description: 'Telemetry archive',
        techStack: JSON.stringify(['Go']),
        isDraft: false,
        submittedAt: new Date(),
      },
    });
    await prisma.projectScoreSummary.create({
      data: {
        submissionId: projectClosed.id,
        communityVotesCount: 0,
      },
    });
  });

  afterAll(async () => {
    if (eventOpen || eventClosed) {
      const eventIds = [eventOpen?.id, eventClosed?.id].filter(Boolean);
      await prisma.communityVote.deleteMany({ where: { eventId: { in: eventIds } } });
      await prisma.projectScoreSummary.deleteMany({ where: { submission: { eventId: { in: eventIds } } } });
      await prisma.submission.deleteMany({ where: { eventId: { in: eventIds } } });
      await prisma.teamMember.deleteMany({ where: { team: { eventId: { in: eventIds } } } });
      await prisma.team.deleteMany({ where: { eventId: { in: eventIds } } });
      await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
    }
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['p14_org@example.com', 'p14_voter1@example.com', 'p14_voter2@example.com', 'p14_member@example.com'],
        },
      },
    });
  });

  describe('POST /api/voting/vote (Vote Casting & Anti-Fraud)', () => {
    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/voting/vote')
        .send({ eventId: eventOpen.id, submissionId: projectAlpha.id });
      expect(res.status).toBe(401);
    });

    it('should prevent team members from voting for their own submission (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/voting/vote')
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .send({ eventId: eventOpen.id, submissionId: projectAlpha.id });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('SELF_VOTE_PROHIBITED');
    });

    it('should reject voting when event voting deadline has expired (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/voting/vote')
        .set('Authorization', `Bearer ${voter1Token}`)
        .send({ eventId: eventClosed.id, submissionId: projectClosed.id });

      expect(res.status).toBe(403);
    });

    it('should allow valid user to cast community vote and increment score summary count', async () => {
      const res = await request(app)
        .post('/api/voting/vote')
        .set('Authorization', `Bearer ${voter1Token}`)
        .send({ eventId: eventOpen.id, submissionId: projectAlpha.id });

      expect(res.status).toBe(200);
      expect(res.body.vote.submissionId).toBe(projectAlpha.id);

      // Verify ProjectScoreSummary was updated in DB
      const summary = await prisma.projectScoreSummary.findUnique({
        where: { submissionId: projectAlpha.id },
      });
      expect(summary.communityVotesCount).toBe(1);
    });

    it('should allow second voter to vote for same project (tally increments to 2)', async () => {
      const res = await request(app)
        .post('/api/voting/vote')
        .set('Authorization', `Bearer ${voter2Token}`)
        .send({ eventId: eventOpen.id, submissionId: projectAlpha.id });

      expect(res.status).toBe(200);

      const summary = await prisma.projectScoreSummary.findUnique({
        where: { submissionId: projectAlpha.id },
      });
      expect(summary.communityVotesCount).toBe(2);
    });

    it('should enforce single-vote constraint: changing vote transfers tally between projects', async () => {
      // Voter 1 switches vote from Project Alpha to Project Beta
      const res = await request(app)
        .post('/api/voting/vote')
        .set('Authorization', `Bearer ${voter1Token}`)
        .send({ eventId: eventOpen.id, submissionId: projectBeta.id });

      expect(res.status).toBe(200);

      // Project Alpha should have 1 vote (from Voter 2)
      const summaryA = await prisma.projectScoreSummary.findUnique({
        where: { submissionId: projectAlpha.id },
      });
      expect(summaryA.communityVotesCount).toBe(1);

      // Project Beta should have 1 vote (from Voter 1)
      const summaryB = await prisma.projectScoreSummary.findUnique({
        where: { submissionId: projectBeta.id },
      });
      expect(summaryB.communityVotesCount).toBe(1);
    });
  });

  describe('GET /api/voting/my-vote (Vote Inspection)', () => {
    it('should return active vote for authenticated user', async () => {
      const res = await request(app)
        .get(`/api/voting/my-vote?eventId=${eventOpen.id}`)
        .set('Authorization', `Bearer ${voter1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.vote).toBeDefined();
      expect(res.body.vote.submissionId).toBe(projectBeta.id);
      expect(res.body.vote.submission.title).toBe('Project Beta Rover');
    });
  });

  describe('DELETE /api/voting/vote/:eventId (Vote Retraction)', () => {
    it('should allow user to retract vote and decrement summary count', async () => {
      const res = await request(app)
        .delete(`/api/voting/vote/${eventOpen.id}`)
        .set('Authorization', `Bearer ${voter1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/retracted successfully/i);

      // Project Beta should now have 0 votes
      const summaryB = await prisma.projectScoreSummary.findUnique({
        where: { submissionId: projectBeta.id },
      });
      expect(summaryB.communityVotesCount).toBe(0);

      // User's vote query now returns null
      const checkVote = await request(app)
        .get(`/api/voting/my-vote?eventId=${eventOpen.id}`)
        .set('Authorization', `Bearer ${voter1Token}`);
      expect(checkVote.body.vote).toBeNull();
    });
  });

  describe('GET /api/voting/stats/:eventId (Voting Analytics)', () => {
    it('should return aggregate voting rankings for event organizer', async () => {
      const res = await request(app)
        .get(`/api/voting/stats/${eventOpen.id}`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.totalVotes).toBe(1); // 1 remaining vote (Voter 2 on Alpha)
      expect(res.body.submissionRankings).toHaveLength(1);
      expect(res.body.submissionRankings[0].submissionId).toBe(projectAlpha.id);
    });
  });
});
