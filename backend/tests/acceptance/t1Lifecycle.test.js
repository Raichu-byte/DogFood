const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/db');

describe('Tier 1 Acceptance Test: Complete Hackathon Lifecycle', () => {
  let organizerToken;
  let aliceToken;
  let bobToken;
  let charlieToken;
  let outsiderToken;

  let eventId;
  let eventSlug;
  let trackId;
  let teamId;
  let inviteCode;
  let submissionId;

  beforeAll(async () => {
    // Cleanup prior lifecycle run records
    await prisma.submission.deleteMany({ where: { event: { slug: 't1-acceptance-hackathon-2026' } } });
    await prisma.teamMember.deleteMany({ where: { team: { event: { slug: 't1-acceptance-hackathon-2026' } } } });
    await prisma.team.deleteMany({ where: { event: { slug: 't1-acceptance-hackathon-2026' } } });
    await prisma.rubricCriteria.deleteMany({ where: { event: { slug: 't1-acceptance-hackathon-2026' } } });
    await prisma.prize.deleteMany({ where: { event: { slug: 't1-acceptance-hackathon-2026' } } });
    await prisma.track.deleteMany({ where: { event: { slug: 't1-acceptance-hackathon-2026' } } });
    await prisma.event.deleteMany({ where: { slug: 't1-acceptance-hackathon-2026' } });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            't1_org@example.com',
            't1_alice@example.com',
            't1_bob@example.com',
            't1_charlie@example.com',
            't1_outsider@example.com',
          ],
        },
      },
    });
  });

  afterAll(async () => {
    if (eventId) {
      await prisma.submission.deleteMany({ where: { eventId } });
      await prisma.teamMember.deleteMany({ where: { team: { eventId } } });
      await prisma.team.deleteMany({ where: { eventId } });
      await prisma.rubricCriteria.deleteMany({ where: { eventId } });
      await prisma.prize.deleteMany({ where: { eventId } });
      await prisma.track.deleteMany({ where: { eventId } });
      await prisma.event.deleteMany({ where: { id: eventId } });
    }
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            't1_org@example.com',
            't1_alice@example.com',
            't1_bob@example.com',
            't1_charlie@example.com',
            't1_outsider@example.com',
          ],
        },
      },
    });
  });

  // Step 1: User Registration
  it('Step 1: Register organizer, participants (Alice, Bob, Charlie), and outsider', async () => {
    // 1.1 Organizer
    const orgReg = await request(app)
      .post('/api/auth/register')
      .send({
        email: 't1_org@example.com',
        name: 'T1 Lead Organizer',
        password: 'Password123!',
      });
    expect(orgReg.status).toBe(201);
    
    // Promote organizer via DB
    await prisma.user.update({
      where: { email: 't1_org@example.com' },
      data: { role: 'ORGANIZER' },
    });

    const orgLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 't1_org@example.com', password: 'Password123!' });
    organizerToken = orgLogin.body.token;

    // 1.2 Alice (Team Leader)
    const aliceRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 't1_alice@example.com', name: 'Alice Algorithm', password: 'Password123!' });
    expect(aliceRes.status).toBe(201);
    aliceToken = aliceRes.body.token;

    // 1.3 Bob (Team Member)
    const bobRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 't1_bob@example.com', name: 'Bob Bytecode', password: 'Password123!' });
    expect(bobRes.status).toBe(201);
    bobToken = bobRes.body.token;

    // 1.4 Charlie (Team Member)
    const charlieRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 't1_charlie@example.com', name: 'Charlie Compiler', password: 'Password123!' });
    expect(charlieRes.status).toBe(201);
    charlieToken = charlieRes.body.token;

    // 1.5 Outsider
    const outsiderRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 't1_outsider@example.com', name: 'Oscar Outsider', password: 'Password123!' });
    expect(outsiderRes.status).toBe(201);
    outsiderToken = outsiderRes.body.token;
  });

  // Step 2: Organizer Creates Hackathon Event
  it('Step 2: Organizer creates hackathon event with tracks, prizes, and criteria', async () => {
    const now = Date.now();
    const eventPayload = {
      name: 'Tier 1 Global Hackathon 2026',
      slug: 't1-acceptance-hackathon-2026',
      description: 'End-to-End Tier 1 Lifecycle Acceptance Event',
      submissionDeadline: new Date(now + 86400000 * 3).toISOString(),
      judgingDeadline: new Date(now + 86400000 * 6).toISOString(),
      votingDeadline: new Date(now + 86400000 * 9).toISOString(),
      tracks: [
        { name: 'Decentralized Systems', description: 'Web3 and Distributed Compute' },
        { name: 'AI & Data Science', description: 'Autonomous agents and intelligence' },
      ],
      prizes: [
        { title: 'Grand Prize', amount: '$10,000', description: 'Overall best hackathon project' },
      ],
      rubricCriteria: [
        { name: 'Technical Execution', weight: 0.40, maxScore: 10 },
        { name: 'Innovation', weight: 0.30, maxScore: 10 },
        { name: 'Design & UX', weight: 0.30, maxScore: 10 },
      ],
    };

    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send(eventPayload);

    expect(res.status).toBe(201);
    expect(res.body.event.id).toBeDefined();
    expect(res.body.event.slug).toBe('t1-acceptance-hackathon-2026');
    expect(res.body.event.tracks).toHaveLength(2);
    expect(res.body.event.rubricCriteria).toHaveLength(3);

    eventId = res.body.event.id;
    eventSlug = res.body.event.slug;
    trackId = res.body.event.tracks[0].id;
  });

  // Step 3: Alice Forms a Team
  it('Step 3: Alice creates team "Quantum Leap" and receives cryptographic invite code', async () => {
    const res = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        eventId,
        name: 'Quantum Leap',
      });

    expect(res.status).toBe(201);
    expect(res.body.team.name).toBe('Quantum Leap');
    expect(res.body.team.inviteCode).toBeDefined();
    expect(res.body.team.members).toHaveLength(1);
    expect(res.body.team.members[0].role).toBe('LEADER');

    teamId = res.body.team.id;
    inviteCode = res.body.team.inviteCode;
  });

  // Step 4: Bob and Charlie Join Alice's Team
  it('Step 4: Bob and Charlie join team using invite code, verifying single-team constraint', async () => {
    // 4.1 Bob joins
    const bobJoinRes = await request(app)
      .post('/api/teams/join')
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ inviteCode });

    expect(bobJoinRes.status).toBe(200);
    expect(bobJoinRes.body.team.members).toHaveLength(2);

    // 4.2 Charlie joins
    const charlieJoinRes = await request(app)
      .post('/api/teams/join')
      .set('Authorization', `Bearer ${charlieToken}`)
      .send({ inviteCode });

    expect(charlieJoinRes.status).toBe(200);
    expect(charlieJoinRes.body.team.members).toHaveLength(3);

    // 4.3 Bob tries joining again (should be rejected)
    const duplicateJoin = await request(app)
      .post('/api/teams/join')
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ inviteCode });

    expect(duplicateJoin.status).toBe(400);
  });

  // Step 5: Draft Submission Creation & Collaborative Editing
  it('Step 5: Alice drafts submission and Bob updates it collaboratively', async () => {
    // 5.1 Alice initializes draft
    const draftRes = await request(app)
      .post('/api/submissions/draft')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        eventId,
        teamId,
        title: 'Quantum Simulator Cloud',
        tagline: 'High performance browser-based quantum computing simulator',
        description: 'Initial draft overview of our quantum circuit simulator.',
        techStack: ['Rust', 'WebAssembly', 'WebGL'],
        trackId,
      });

    expect(draftRes.status).toBe(200);
    expect(draftRes.body.submission.title).toBe('Quantum Simulator Cloud');
    expect(draftRes.body.submission.isDraft).toBe(true);
    submissionId = draftRes.body.submission.id;

    // 5.2 Bob adds demoUrl, repoUrl, and expanded description
    const bobUpdateRes = await request(app)
      .post('/api/submissions/draft')
      .set('Authorization', `Bearer ${bobToken}`)
      .send({
        eventId,
        teamId,
        title: 'Quantum Simulator Cloud',
        tagline: 'High performance browser-based quantum computing simulator',
        description: 'Comprehensive quantum circuit simulator supporting up to 32 entangled qubits in real-time.',
        techStack: ['Rust', 'WebAssembly', 'WebGL', 'React', 'TailwindCSS'],
        repoUrl: 'https://github.com/quantum-leap/sim-cloud',
        demoUrl: 'https://quantum-sim.example.com',
        videoUrl: 'https://youtube.com/watch?v=quantum-demo',
        trackId,
      });

    expect(bobUpdateRes.status).toBe(200);
    expect(bobUpdateRes.body.submission.repoUrl).toBe('https://github.com/quantum-leap/sim-cloud');

    // 5.3 Outsider cannot read private draft
    const outsiderView = await request(app)
      .get(`/api/submissions/${submissionId}`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(outsiderView.status).toBe(403);
  });

  // Step 6: Atomic "Ship It" Final Lock
  it('Step 6: Alice executes "Ship It" finalizing submission; subsequent edits strictly blocked', async () => {
    // 6.1 Finalize and Ship
    const shipRes = await request(app)
      .post(`/api/submissions/${submissionId}/ship`)
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(shipRes.status).toBe(200);
    expect(shipRes.body.submission.isDraft).toBe(false);
    expect(shipRes.body.submission.submittedAt).toBeDefined();

    // 6.2 Attempt to edit after ship (strictly 403 Forbidden)
    const editAfterShip = await request(app)
      .post('/api/submissions/draft')
      .set('Authorization', `Bearer ${bobToken}`)
      .send({
        eventId,
        teamId,
        title: 'Tampered Quantum Simulator',
        tagline: 'Should be rejected',
        description: 'Attempting edit on locked project',
        techStack: ['Hacked'],
        trackId,
      });

    expect(editAfterShip.status).toBe(403);
  });

  // Step 7: Public Gallery Showcase & Zero Leakage Verification
  it('Step 7: Unauthenticated public queries gallery; verifies project visibility and privacy guarantees', async () => {
    // 7.1 Public Gallery query by eventId
    const galleryRes = await request(app)
      .get(`/api/gallery?eventId=${eventId}&search=Quantum`);

    expect(galleryRes.status).toBe(200);
    expect(galleryRes.body.projects).toHaveLength(1);

    const project = galleryRes.body.projects[0];
    expect(project.id).toBe(submissionId);
    expect(project.title).toBe('Quantum Simulator Cloud');
    expect(project.techStack).toContain('Rust');
    expect(project.techStack).toContain('WebAssembly');
    expect(project.team.name).toBe('Quantum Leap');
    expect(project.team.members).toHaveLength(3);

    // 7.2 Zero Leakage verification: no password hashes or emails exposed
    project.team.members.forEach((m) => {
      expect(m.user.name).toBeDefined();
      expect(m.user.email).toBeUndefined();
      expect(m.user.passwordHash).toBeUndefined();
    });

    // 7.3 Public Project Detail View
    const detailRes = await request(app)
      .get(`/api/gallery/${submissionId}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.project.title).toBe('Quantum Simulator Cloud');
    expect(detailRes.body.project.demoUrl).toBe('https://quantum-sim.example.com');
    expect(detailRes.body.project.repoUrl).toBe('https://github.com/quantum-leap/sim-cloud');
  });
});
