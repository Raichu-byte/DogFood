const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/db');
const { hashPassword } = require('../../src/utils/auth');

describe('Tier 2 Acceptance Test: Complete Judging & Evaluation Lifecycle', () => {
  let organizerToken;
  let adminToken;
  let judge1Token;
  let judge2Token;
  let participant1Token;
  let participant2Token;
  let voterToken;

  let organizer;
  let judge1;
  let judge2;
  let participant1;
  let participant2;
  let voter;

  let event;
  let trackAI;
  let trackWeb;
  let criterionTech;
  let criterionUX;
  let prizeGrand;
  let prizeAI;

  let team1;
  let team2;
  let sub1;
  let sub2;

  beforeAll(async () => {
    // 1. Cleanup previous run records
    await prisma.communityVote.deleteMany({ where: { event: { slug: 't2-acceptance-hackathon-2026' } } });
    await prisma.score.deleteMany({ where: { assignment: { event: { slug: 't2-acceptance-hackathon-2026' } } } });
    await prisma.projectScoreSummary.deleteMany({ where: { submission: { event: { slug: 't2-acceptance-hackathon-2026' } } } });
    await prisma.judgeAssignment.deleteMany({ where: { event: { slug: 't2-acceptance-hackathon-2026' } } });
    await prisma.prize.deleteMany({ where: { event: { slug: 't2-acceptance-hackathon-2026' } } });
    await prisma.submission.deleteMany({ where: { event: { slug: 't2-acceptance-hackathon-2026' } } });
    await prisma.teamMember.deleteMany({ where: { team: { event: { slug: 't2-acceptance-hackathon-2026' } } } });
    await prisma.team.deleteMany({ where: { event: { slug: 't2-acceptance-hackathon-2026' } } });
    await prisma.rubricCriteria.deleteMany({ where: { event: { slug: 't2-acceptance-hackathon-2026' } } });
    await prisma.track.deleteMany({ where: { event: { slug: 't2-acceptance-hackathon-2026' } } });
    await prisma.event.deleteMany({ where: { slug: 't2-acceptance-hackathon-2026' } });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            't2_org@example.com',
            't2_admin@example.com',
            't2_judge1@example.com',
            't2_judge2@example.com',
            't2_part1@example.com',
            't2_part2@example.com',
            't2_voter@example.com',
          ],
        },
      },
    });

    const passwordHash = await hashPassword('Password123!');

    // 2. Create Tier 2 Personas
    organizer = await prisma.user.create({
      data: { email: 't2_org@example.com', name: 'T2 Lead Organizer', passwordHash, role: 'ORGANIZER' },
    });
    const admin = await prisma.user.create({
      data: { email: 't2_admin@example.com', name: 'T2 System Admin', passwordHash, role: 'ADMIN' },
    });
    judge1 = await prisma.user.create({
      data: { email: 't2_judge1@example.com', name: 'Judge Harsh', passwordHash, role: 'JUDGE' },
    });
    judge2 = await prisma.user.create({
      data: { email: 't2_judge2@example.com', name: 'Judge Lenient', passwordHash, role: 'JUDGE' },
    });
    participant1 = await prisma.user.create({
      data: { email: 't2_part1@example.com', name: 'Alice Architect', passwordHash, role: 'PARTICIPANT' },
    });
    participant2 = await prisma.user.create({
      data: { email: 't2_part2@example.com', name: 'Bob Builder', passwordHash, role: 'PARTICIPANT' },
    });
    voter = await prisma.user.create({
      data: { email: 't2_voter@example.com', name: 'Victor Voter', passwordHash, role: 'PARTICIPANT' },
    });

    // 3. Authenticate and obtain JWT tokens
    const [resOrg, resAdmin, resJ1, resJ2, resP1, resP2, resV] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 't2_org@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 't2_admin@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 't2_judge1@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 't2_judge2@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 't2_part1@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 't2_part2@example.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 't2_voter@example.com', password: 'Password123!' }),
    ]);

    organizerToken = resOrg.body.token;
    adminToken = resAdmin.body.token;
    judge1Token = resJ1.body.token;
    judge2Token = resJ2.body.token;
    participant1Token = resP1.body.token;
    participant2Token = resP2.body.token;
    voterToken = resV.body.token;
  });

  afterAll(async () => {
    if (event) {
      await prisma.communityVote.deleteMany({ where: { eventId: event.id } });
      await prisma.score.deleteMany({ where: { assignment: { eventId: event.id } } });
      await prisma.projectScoreSummary.deleteMany({ where: { submission: { eventId: event.id } } });
      await prisma.judgeAssignment.deleteMany({ where: { eventId: event.id } });
      await prisma.prize.deleteMany({ where: { eventId: event.id } });
      await prisma.submission.deleteMany({ where: { eventId: event.id } });
      await prisma.teamMember.deleteMany({ where: { team: { eventId: event.id } } });
      await prisma.team.deleteMany({ where: { eventId: event.id } });
      await prisma.rubricCriteria.deleteMany({ where: { eventId: event.id } });
      await prisma.track.deleteMany({ where: { eventId: event.id } });
      await prisma.event.deleteMany({ where: { id: event.id } });
    }
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            't2_org@example.com',
            't2_admin@example.com',
            't2_judge1@example.com',
            't2_judge2@example.com',
            't2_part1@example.com',
            't2_part2@example.com',
            't2_voter@example.com',
          ],
        },
      },
    });
  });

  // Step 1: Event & Rubric Setup
  it('Step 1: Organizer creates hackathon event with tracks, prizes, and weighted rubric criteria', async () => {
    const now = Date.now();
    const eventPayload = {
      name: 'Tier 2 Championship Hackathon',
      slug: 't2-acceptance-hackathon-2026',
      description: 'End-to-End Tier 2 Judging Engine Acceptance Testing',
      submissionDeadline: new Date(now - 86400000 * 5).toISOString(),
      judgingDeadline: new Date(now + 86400000 * 2).toISOString(),
      votingDeadline: new Date(now + 86400000 * 5).toISOString(),
      tracks: [
        { name: 'AI Systems', description: 'Autonomous intelligence' },
        { name: 'Decentralized Infra', description: 'Peer-to-peer protocols' },
      ],
      prizes: [
        { title: 'Grand Championship', amount: '$15,000', description: 'Highest overall calibrated score' },
        { title: 'Best AI Architecture', amount: '$5,000', description: 'Top submission in AI track' },
      ],
      rubricCriteria: [
        { name: 'Technical Depth', weight: 0.60, minScore: 1.0, maxScore: 10.0 },
        { name: 'UI & User Experience', weight: 0.40, minScore: 1.0, maxScore: 10.0 },
      ],
    };

    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send(eventPayload);

    expect(res.status).toBe(201);
    expect(res.body.event.id).toBeDefined();
    expect(res.body.event.tracks).toHaveLength(2);
    expect(res.body.event.prizes).toHaveLength(2);
    expect(res.body.event.rubricCriteria).toHaveLength(2);

    event = res.body.event;
    trackAI = event.tracks.find(t => t.name === 'AI Systems');
    trackWeb = event.tracks.find(t => t.name === 'Decentralized Infra');
    criterionTech = event.rubricCriteria.find(c => c.name === 'Technical Depth');
    criterionUX = event.rubricCriteria.find(c => c.name === 'UI & User Experience');
    prizeGrand = event.prizes.find(p => p.title === 'Grand Championship');
    prizeAI = event.prizes.find(p => p.title === 'Best AI Architecture');
  });

  // Step 2: Team Formation & Finalized Submissions
  it('Step 2: Teams form and ship final submissions', async () => {
    // 2.1 Team Alpha ships AI project
    team1 = await prisma.team.create({
      data: {
        name: 'Neural Labs',
        eventId: event.id,
        inviteCode: 'T2-NL',
        creatorId: participant1.id,
        members: { create: [{ userId: participant1.id, role: 'LEADER' }] },
      },
    });

    sub1 = await prisma.submission.create({
      data: {
        eventId: event.id,
        teamId: team1.id,
        trackId: trackAI.id,
        title: 'Cognitive Mesh',
        tagline: 'Decentralized neural compute network',
        description: 'High performance edge intelligence mesh',
        techStack: JSON.stringify(['Rust', 'WebGPU', 'ONNX']),
        isDraft: false,
        submittedAt: new Date(),
      },
    });

    // 2.2 Team Beta ships Web3 project
    team2 = await prisma.team.create({
      data: {
        name: 'P2P Dynamics',
        eventId: event.id,
        inviteCode: 'T2-P2P',
        creatorId: participant2.id,
        members: {
          create: [
            { userId: participant2.id, role: 'LEADER' },
            { userId: judge1.id, role: 'MEMBER' }, // Note: Judge 1 is in Team 2 (COI test!)
          ],
        },
      },
    });

    sub2 = await prisma.submission.create({
      data: {
        eventId: event.id,
        teamId: team2.id,
        trackId: trackWeb.id,
        title: 'Aether Sync',
        tagline: 'Zero latency peer-to-peer state replication',
        description: 'CRDT based offline synchronization',
        techStack: JSON.stringify(['TypeScript', 'WebRTC']),
        isDraft: false,
        submittedAt: new Date(),
      },
    });
  });

  // Step 3: Round-Robin Judge Assignment with Conflict of Interest Prevention
  it('Step 3: Automated round-robin assignment distributes evaluations and prevents COI', async () => {
    const res = await request(app)
      .post('/api/judging/assign/round-robin')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        eventId: event.id,
        judgesPerProject: 2,
        clearExisting: true,
        judgeIds: [judge1.id, judge2.id],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.totalProjects).toBe(2);

    // Verify Judge 1 is NEVER assigned to evaluate sub2 (Team 2) due to COI
    const coiCheck = await prisma.judgeAssignment.findUnique({
      where: {
        judgeId_submissionId: {
          judgeId: judge1.id,
          submissionId: sub2.id,
        },
      },
    });
    expect(coiCheck).toBeNull();
  });

  // Step 4: Multi-Dimensional Rubric Grading
  it('Step 4: Judges evaluate assigned submissions and submit criterion scores', async () => {
    // 4.1 Judge 1 evaluates Cognitive Mesh (sub1): Tech = 9.0, UX = 8.0
    // Weighted score = (9.0 * 0.60) + (8.0 * 0.40) = 5.4 + 3.2 = 8.6
    const assign1 = await prisma.judgeAssignment.findFirst({
      where: { judgeId: judge1.id, submissionId: sub1.id },
    });
    expect(assign1).toBeDefined();

    const scoreRes1 = await request(app)
      .post('/api/judging/scores')
      .set('Authorization', `Bearer ${judge1Token}`)
      .send({
        assignmentId: assign1.id,
        scores: [
          { criteriaId: criterionTech.id, scoreValue: 9.0, feedback: 'Superb architecture.' },
          { criteriaId: criterionUX.id, scoreValue: 8.0, feedback: 'Clean design.' },
        ],
      });

    expect(scoreRes1.status).toBe(200);
    expect(scoreRes1.body.assignment.status).toBe('COMPLETED');

    // 4.2 Judge 2 evaluates Cognitive Mesh (sub1): Tech = 10.0, UX = 9.0
    // Weighted score = (10.0 * 0.60) + (9.0 * 0.40) = 6.0 + 3.6 = 9.6
    const assign2 = await prisma.judgeAssignment.findFirst({
      where: { judgeId: judge2.id, submissionId: sub1.id },
    });
    expect(assign2).toBeDefined();

    const scoreRes2 = await request(app)
      .post('/api/judging/scores')
      .set('Authorization', `Bearer ${judge2Token}`)
      .send({
        assignmentId: assign2.id,
        scores: [
          { criteriaId: criterionTech.id, scoreValue: 10.0, feedback: 'Outstanding execution.' },
          { criteriaId: criterionUX.id, scoreValue: 9.0, feedback: 'Polished experience.' },
        ],
      });

    expect(scoreRes2.status).toBe(200);

    // 4.3 Judge 2 evaluates Aether Sync (sub2): Tech = 7.0, UX = 7.0
    // Weighted score = (7.0 * 0.60) + (7.0 * 0.40) = 4.2 + 2.8 = 7.0
    const assign3 = await prisma.judgeAssignment.findFirst({
      where: { judgeId: judge2.id, submissionId: sub2.id },
    });
    expect(assign3).toBeDefined();

    const scoreRes3 = await request(app)
      .post('/api/judging/scores')
      .set('Authorization', `Bearer ${judge2Token}`)
      .send({
        assignmentId: assign3.id,
        scores: [
          { criteriaId: criterionTech.id, scoreValue: 7.0, feedback: 'Decent networking logic.' },
          { criteriaId: criterionUX.id, scoreValue: 7.0, feedback: 'Functional interface.' },
        ],
      });

    expect(scoreRes3.status).toBe(200);
  });

  // Step 5: Statistical Z-Score Normalization
  it('Step 5: Organizer triggers Z-Score normalization mitigating judge scoring variance', async () => {
    const res = await request(app)
      .post('/api/judging/normalize')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ eventId: event.id });

    expect(res.status).toBe(200);
    expect(res.body.data.projectSummaries).toHaveLength(2);

    // Verify Project 1 has higher normalized Z-score than Project 2
    const summary1 = await prisma.projectScoreSummary.findUnique({
      where: { submissionId: sub1.id },
    });
    const summary2 = await prisma.projectScoreSummary.findUnique({
      where: { submissionId: sub2.id },
    });

    expect(summary1.normalizedZScore).toBeGreaterThan(summary2.normalizedZScore);
  });

  // Step 6: Community Voting
  it('Step 6: Community members cast votes with single-vote constraint enforcement', async () => {
    // 6.1 Victor votes for Cognitive Mesh
    const voteRes = await request(app)
      .post('/api/voting/vote')
      .set('Authorization', `Bearer ${voterToken}`)
      .send({ eventId: event.id, submissionId: sub1.id });

    expect(voteRes.status).toBe(200);
    expect(voteRes.body.vote.submissionId).toBe(sub1.id);

    // Verify tally
    const summary1 = await prisma.projectScoreSummary.findUnique({
      where: { submissionId: sub1.id },
    });
    expect(summary1.communityVotesCount).toBe(1);
  });

  // Step 7: Live Leaderboard Verification
  it('Step 7: Leaderboard dynamically ranks projects across Normalized, Raw, and Community modes', async () => {
    // 7.1 Organizer queries live standings in normalized mode
    const normRes = await request(app)
      .get(`/api/leaderboard/${event.slug}?mode=normalized`)
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(normRes.status).toBe(200);
    expect(normRes.body.leaderboard[0].title).toBe('Cognitive Mesh');
    expect(normRes.body.leaderboard[0].rank).toBe(1);

    // 7.2 Track-filtered leaderboard
    const trackRes = await request(app)
      .get(`/api/leaderboard/${event.slug}?trackId=${trackAI.id}`)
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(trackRes.status).toBe(200);
    expect(trackRes.body.leaderboard).toHaveLength(1);
    expect(trackRes.body.leaderboard[0].title).toBe('Cognitive Mesh');
  });

  // Step 8: Winner Declaration & Publication Ceremony
  it('Step 8: Organizer assigns prizes to winners and publishes public showcase', async () => {
    // 8.1 Assign Grand Prize and AI Prize to Cognitive Mesh
    const assignPrizesRes = await request(app)
      .post(`/api/events/${event.slug}/winners/assign`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        prizeAssignments: [
          { prizeId: prizeGrand.id, submissionId: sub1.id },
          { prizeId: prizeAI.id, submissionId: sub1.id },
        ],
      });

    expect(assignPrizesRes.status).toBe(200);
    expect(assignPrizesRes.body.prizes[0].winningSubmissionId).toBe(sub1.id);

    // 8.2 Publish results
    const publishRes = await request(app)
      .post(`/api/events/${event.slug}/publish`)
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(publishRes.status).toBe(200);
    expect(publishRes.body.event.status).toBe('PUBLISHED');

    // 8.3 Unauthenticated public now accesses final winners showcase
    const winnersRes = await request(app)
      .get(`/api/events/${event.slug}/winners`);

    expect(winnersRes.status).toBe(200);
    expect(winnersRes.body.prizes[0].winningSubmission.title).toBe('Cognitive Mesh');
    expect(winnersRes.body.prizes[0].winningSubmission.team.name).toBe('Neural Labs');
    expect(winnersRes.body.prizes[0].winningSubmission.team.members[0].user.name).toBe('Alice Architect');
    expect(winnersRes.body.prizes[0].winningSubmission.team.members[0].user.email).toBeUndefined();
  });
});
