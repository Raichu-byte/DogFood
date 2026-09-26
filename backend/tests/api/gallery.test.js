const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/db');
const { hashPassword } = require('../../src/utils/auth');

describe('Gallery API Tests (Phase 8)', () => {
  let organizer;
  let user1;
  let user2;
  let event;
  let trackAI;
  let trackWeb;
  let publishedTeam;
  let draftTeam;
  let publishedSubmission;
  let draftSubmission;

  beforeAll(async () => {
    // Pre-cleanup in case of previous interrupted run
    await prisma.submission.deleteMany({
      where: { event: { slug: 'gallery-showcase-2026' } }
    });
    await prisma.teamMember.deleteMany({
      where: { team: { event: { slug: 'gallery-showcase-2026' } } }
    });
    await prisma.team.deleteMany({
      where: { event: { slug: 'gallery-showcase-2026' } }
    });
    await prisma.track.deleteMany({
      where: { event: { slug: 'gallery-showcase-2026' } }
    });
    await prisma.event.deleteMany({
      where: { slug: 'gallery-showcase-2026' }
    });
    await prisma.user.deleteMany({
      where: { email: { in: ['gallery_org@example.com', 'gallery_u1@example.com', 'gallery_u2@example.com'] } }
    });

    const passwordHash = await hashPassword('Password123!');
    organizer = await prisma.user.create({
      data: { email: 'gallery_org@example.com', name: 'Org Admin', passwordHash, role: 'ORGANIZER' }
    });
    user1 = await prisma.user.create({
      data: { email: 'gallery_u1@example.com', name: 'Alice Author', passwordHash, role: 'PARTICIPANT' }
    });
    user2 = await prisma.user.create({
      data: { email: 'gallery_u2@example.com', name: 'Bob Builder', passwordHash, role: 'PARTICIPANT' }
    });

    event = await prisma.event.create({
      data: {
        name: 'Gallery Showcase Hackathon',
        slug: 'gallery-showcase-2026',
        description: 'Testing public gallery search and filters',
        status: 'PUBLISHED',
        submissionDeadline: new Date(Date.now() + 86400000 * 5),
        judgingDeadline: new Date(Date.now() + 86400000 * 10),
        votingDeadline: new Date(Date.now() + 86400000 * 15),
        organizerId: organizer.id
      }
    });

    trackAI = await prisma.track.create({
      data: { name: 'AI & Robotics Track', description: 'AI projects', eventId: event.id }
    });
    trackWeb = await prisma.track.create({
      data: { name: 'Web3 & Open Web Track', description: 'Decentralized projects', eventId: event.id }
    });

    // Team 1: Published submission with AI track
    publishedTeam = await prisma.team.create({
      data: {
        name: 'Neural Knights',
        eventId: event.id,
        inviteCode: 'NEURAL-123',
        creatorId: user1.id,
        members: {
          create: [{ userId: user1.id, role: 'LEADER' }]
        }
      }
    });

    publishedSubmission = await prisma.submission.create({
      data: {
        title: 'DeepVision Edge',
        tagline: 'Edge AI computer vision for embedded robotics',
        description: 'Full markdown description explaining DeepVision Edge system.',
        techStack: JSON.stringify(['PyTorch', 'Rust', 'WebAssembly']),
        repoUrl: 'https://github.com/example/deepvision',
        demoUrl: 'https://deepvision.example.com',
        videoUrl: 'https://youtube.com/watch?v=deepvision',
        isDraft: false,
        submittedAt: new Date(),
        eventId: event.id,
        teamId: publishedTeam.id,
        trackId: trackAI.id
      }
    });

    // Team 2: Draft submission (MUST NOT appear in public gallery)
    draftTeam = await prisma.team.create({
      data: {
        name: 'Secret Builders',
        eventId: event.id,
        inviteCode: 'SECRET-999',
        creatorId: user2.id,
        members: {
          create: [{ userId: user2.id, role: 'LEADER' }]
        }
      }
    });

    draftSubmission = await prisma.submission.create({
      data: {
        title: 'Unfinished Draft Project',
        tagline: 'Should not show up in gallery',
        description: 'Draft notes',
        techStack: JSON.stringify(['DraftTech']),
        isDraft: true,
        eventId: event.id,
        teamId: draftTeam.id,
        trackId: trackWeb.id
      }
    });
  });

  afterAll(async () => {
    if (event) {
      await prisma.submission.deleteMany({ where: { eventId: event.id } });
      await prisma.teamMember.deleteMany({ where: { team: { eventId: event.id } } });
      await prisma.team.deleteMany({ where: { eventId: event.id } });
      await prisma.track.deleteMany({ where: { eventId: event.id } });
      await prisma.event.delete({ where: { id: event.id } });
    }
    await prisma.user.deleteMany({
      where: { email: { in: ['gallery_org@example.com', 'gallery_u1@example.com', 'gallery_u2@example.com'] } }
    });
  });

  it('GET /api/gallery - should return only published (non-draft) submissions without auth', async () => {
    const res = await request(app)
      .get(`/api/gallery?eventId=${event.id}`);

    expect(res.status).toBe(200);
    expect(res.body.projects).toBeDefined();
    expect(res.body.projects).toHaveLength(1);
    expect(res.body.projects[0].id).toBe(publishedSubmission.id);
    expect(res.body.projects[0].title).toBe('DeepVision Edge');
    expect(res.body.pagination.total).toBe(1);
  });

  it('GET /api/gallery - should strip sensitive fields like user emails and password hashes', async () => {
    const res = await request(app)
      .get(`/api/gallery?eventId=${event.id}`);

    expect(res.status).toBe(200);
    const sub = res.body.projects[0];
    expect(sub.team).toBeDefined();
    expect(sub.team.name).toBe('Neural Knights');
    // Verify members are listed but email/passwordHash are stripped
    expect(sub.team.members[0].user.name).toBe('Alice Author');
    expect(sub.team.members[0].user.email).toBeUndefined();
    expect(sub.team.members[0].user.passwordHash).toBeUndefined();
  });

  it('GET /api/gallery - should filter by trackId', async () => {
    // Querying AI track
    const resAI = await request(app)
      .get(`/api/gallery?eventId=${event.id}&trackId=${trackAI.id}`);
    expect(resAI.status).toBe(200);
    expect(resAI.body.projects).toHaveLength(1);

    // Querying Web track (only draft project has Web track, so should return 0)
    const resWeb = await request(app)
      .get(`/api/gallery?eventId=${event.id}&trackId=${trackWeb.id}`);
    expect(resWeb.status).toBe(200);
    expect(resWeb.body.projects).toHaveLength(0);
  });

  it('GET /api/gallery - should filter by search keyword', async () => {
    const resMatch = await request(app)
      .get(`/api/gallery?eventId=${event.id}&search=DeepVision`);
    expect(resMatch.status).toBe(200);
    expect(resMatch.body.projects).toHaveLength(1);

    const resNoMatch = await request(app)
      .get(`/api/gallery?eventId=${event.id}&search=NonExistentKeyword`);
    expect(resNoMatch.status).toBe(200);
    expect(resNoMatch.body.projects).toHaveLength(0);
  });

  it('GET /api/gallery/:id - should return full public details for published submission', async () => {
    const res = await request(app)
      .get(`/api/gallery/${publishedSubmission.id}`);

    expect(res.status).toBe(200);
    expect(res.body.project).toBeDefined();
    expect(res.body.project.title).toBe('DeepVision Edge');
    expect(res.body.project.techStack).toContain('Rust');
    expect(res.body.project.team.members[0].user.name).toBe('Alice Author');
    expect(res.body.project.team.members[0].user.email).toBeUndefined();
  });

  it('GET /api/gallery/:id - should return 404 for draft submission to prevent leakage', async () => {
    const res = await request(app)
      .get(`/api/gallery/${draftSubmission.id}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});
