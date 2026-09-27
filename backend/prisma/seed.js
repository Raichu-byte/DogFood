const { PrismaClient, Role, EventStatus, TeamRole, AssignmentStatus } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('[SEED] Starting database seed for Dogfood 2026...');

  // Clean existing records in reverse dependency order
  await prisma.abuseFlag.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.communityVote.deleteMany();
  await prisma.projectScoreSummary.deleteMany();
  await prisma.score.deleteMany();
  await prisma.judgeAssignment.deleteMany();
  await prisma.rubricCriteria.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.prize.deleteMany();
  await prisma.track.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = bcrypt.hashSync('Password123!', 10);

  // 1. Create Users
  const organizer = await prisma.user.create({
    data: {
      email: 'organizer@dogfood.test',
      name: 'Sam Organizer',
      passwordHash,
      role: Role.ORGANIZER,
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@dogfood.test',
      name: 'Alex Admin',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const judges = await Promise.all([
    prisma.user.create({
      data: { email: 'judge1@dogfood.test', name: 'Dr. Elena Rostova', passwordHash, role: Role.JUDGE },
    }),
    prisma.user.create({
      data: { email: 'judge2@dogfood.test', name: 'Marcus Vance', passwordHash, role: Role.JUDGE },
    }),
    prisma.user.create({
      data: { email: 'judge3@dogfood.test', name: 'Sarah Chen', passwordHash, role: Role.JUDGE },
    }),
    prisma.user.create({
      data: { email: 'judge4@dogfood.test', name: 'David Kim (Consistent)', passwordHash, role: Role.JUDGE },
    }),
  ]);

  const participants = await Promise.all([
    prisma.user.create({ data: { email: 'alice@dogfood.test', name: 'Alice Walker', passwordHash, role: Role.PARTICIPANT } }),
    prisma.user.create({ data: { email: 'bob@dogfood.test', name: 'Bob Stone', passwordHash, role: Role.PARTICIPANT } }),
    prisma.user.create({ data: { email: 'charlie@dogfood.test', name: 'Charlie Day', passwordHash, role: Role.PARTICIPANT } }),
    prisma.user.create({ data: { email: 'dana@dogfood.test', name: 'Dana Scully', passwordHash, role: Role.PARTICIPANT } }),
    prisma.user.create({ data: { email: 'evan@dogfood.test', name: 'Evan Wright', passwordHash, role: Role.PARTICIPANT } }),
    prisma.user.create({ data: { email: 'fiona@dogfood.test', name: 'Fiona Gallagher', passwordHash, role: Role.PARTICIPANT } }),
    prisma.user.create({ data: { email: 'george@dogfood.test', name: 'George Clark', passwordHash, role: Role.PARTICIPANT } }),
    prisma.user.create({ data: { email: 'helen@dogfood.test', name: 'Helen Troy', passwordHash, role: Role.PARTICIPANT } }),
  ]);

  console.log(`[SEED] Created ${judges.length} judges, 1 organizer, 1 admin, ${participants.length} participants.`);

  // 2. Create Event
  const now = new Date();
  const submissionDeadline = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // +2 days
  const judgingDeadline = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);    // +4 days
  const votingDeadline = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);     // +6 days

  const event = await prisma.event.create({
    data: {
      name: 'Dogfood 2026: The Builder’s Playground',
      slug: 'dogfood-2026',
      description: 'The premier open-source hacker tournament. Build, break, ship, and bite.',
      status: EventStatus.PUBLISHED,
      submissionDeadline,
      judgingDeadline,
      votingDeadline,
      organizerId: organizer.id,
    },
  });

  // 3. Create Tracks
  const track1 = await prisma.track.create({
    data: { eventId: event.id, name: 'Core Protocols & Infra', description: 'Distributed databases, network routing, and offline storage systems.' },
  });
  const track2 = await prisma.track.create({
    data: { eventId: event.id, name: 'AI & Autonomous Systems', description: 'Edge intelligence, local inference models, and automated agents.' },
  });
  const track3 = await prisma.track.create({
    data: { eventId: event.id, name: 'Decentralized & Peer-to-Peer', description: 'Zero-knowledge proofs, mesh protocols, and resilient p2p architectures.' },
  });

  // 4. Create Prizes
  await prisma.prize.createMany({
    data: [
      { eventId: event.id, title: 'Grand Championship', amount: '$10,000', description: 'Highest overall normalized score across all categories' },
      { eventId: event.id, trackId: track1.id, title: 'Infrastructure Excellence', amount: '$5,000', description: 'Best low-level system design and performance' },
      { eventId: event.id, trackId: track2.id, title: 'Edge AI Pioneer', amount: '$5,000', description: 'Most innovative offline-first intelligent application' },
    ],
  });

  // 5. Create Rubric Criteria (Weights sum to 1.0)
  const c1 = await prisma.rubricCriteria.create({
    data: { eventId: event.id, name: 'Technical Complexity', description: 'Architectural rigor, engineering depth, and technical difficulty', weight: 0.35, minScore: 1.0, maxScore: 10.0 },
  });
  const c2 = await prisma.rubricCriteria.create({
    data: { eventId: event.id, name: 'Design & Tactile UX', description: 'Interactivity, motion aesthetics, spatial feel, and keyboard navigation', weight: 0.25, minScore: 1.0, maxScore: 10.0 },
  });
  const c3 = await prisma.rubricCriteria.create({
    data: { eventId: event.id, name: 'Practical Utility & Viability', description: 'Real-world problem solving, feasibility, and self-hostability', weight: 0.25, minScore: 1.0, maxScore: 10.0 },
  });
  const c4 = await prisma.rubricCriteria.create({
    data: { eventId: event.id, name: 'Completeness & Polish', description: 'Working demo, documentation, and zero crashes', weight: 0.15, minScore: 1.0, maxScore: 10.0 },
  });

  // 6. Create Teams & Memberships
  const team1 = await prisma.team.create({
    data: {
      eventId: event.id,
      name: 'HyperScale',
      inviteCode: 'HYPE-01',
      creatorId: participants[0].id,
      members: {
        create: [
          { userId: participants[0].id, role: TeamRole.LEADER },
          { userId: participants[1].id, role: TeamRole.MEMBER },
        ],
      },
    },
  });

  const team2 = await prisma.team.create({
    data: {
      eventId: event.id,
      name: 'NeuralMesh',
      inviteCode: 'MESH-02',
      creatorId: participants[2].id,
      members: {
        create: [
          { userId: participants[2].id, role: TeamRole.LEADER },
          { userId: participants[3].id, role: TeamRole.MEMBER },
        ],
      },
    },
  });

  const team3 = await prisma.team.create({
    data: {
      eventId: event.id,
      name: 'ZeroLag',
      inviteCode: 'ZERO-03',
      creatorId: participants[4].id,
      members: {
        create: [
          { userId: participants[4].id, role: TeamRole.LEADER },
          { userId: participants[5].id, role: TeamRole.MEMBER },
        ],
      },
    },
  });

  const team4 = await prisma.team.create({
    data: {
      eventId: event.id,
      name: 'CipherFlow',
      inviteCode: 'FLOW-04',
      creatorId: participants[6].id,
      members: {
        create: [
          { userId: participants[6].id, role: TeamRole.LEADER },
          { userId: participants[7].id, role: TeamRole.MEMBER },
        ],
      },
    },
  });

  // 7. Create Submissions
  const sub1 = await prisma.submission.create({
    data: {
      eventId: event.id,
      teamId: team1.id,
      trackId: track1.id,
      title: 'AetherFS — High-Throughput Edge Object Storage',
      tagline: 'Self-hosted, distributed S3-compatible storage with peer-to-peer chunk replication.',
      description: 'AetherFS solves the offline media synchronization challenge by utilizing local peer networks and content-addressable storage blocks.',
      techStack: JSON.stringify(['Rust', 'TypeScript', 'WebRTC', 'RocksDB']),
      repoUrl: 'https://github.com/dogfood-test/aether-fs',
      demoUrl: 'http://localhost:4000/demo/aether',
      isDraft: false,
      submittedAt: new Date(now.getTime() - 3 * 3600 * 1000),
    },
  });

  const sub2 = await prisma.submission.create({
    data: {
      eventId: event.id,
      teamId: team2.id,
      trackId: track2.id,
      title: 'SynapseCore — Local Edge Intelligence Engine',
      tagline: 'Quantized neural execution runtime optimized for offline hardware.',
      description: 'SynapseCore provides an embedded neural runtime requiring zero external API keys or cloud telemetry.',
      techStack: JSON.stringify(['C++', 'Python', 'ONNX', 'WebAssembly']),
      repoUrl: 'https://github.com/dogfood-test/synapse-core',
      demoUrl: 'http://localhost:4000/demo/synapse',
      isDraft: false,
      submittedAt: new Date(now.getTime() - 2 * 3600 * 1000),
    },
  });

  const sub3 = await prisma.submission.create({
    data: {
      eventId: event.id,
      teamId: team3.id,
      trackId: track1.id,
      title: 'PulseWire — Ultra-Low Latency State Synchronization',
      tagline: 'CRDT-based state engine delivering sub-5ms collaborative updates.',
      description: 'PulseWire establishes peer-to-peer WebSocket mesh networks to ensure seamless collaboration during intermittent network drops.',
      techStack: JSON.stringify(['Node.js', 'WebSockets', 'Yjs', 'TailwindCSS']),
      repoUrl: 'https://github.com/dogfood-test/pulse-wire',
      demoUrl: 'http://localhost:4000/demo/pulse',
      isDraft: false,
      submittedAt: new Date(now.getTime() - 1 * 3600 * 1000),
    },
  });

  const sub4 = await prisma.submission.create({
    data: {
      eventId: event.id,
      teamId: team4.id,
      trackId: track3.id,
      title: 'GhostKey — Post-Quantum Identity Envelope',
      tagline: 'Lattice-based identity credentials stored locally without central authorities.',
      description: 'GhostKey provides offline identity authentication using Kyber-768 lattice cryptographic primitives.',
      techStack: JSON.stringify(['TypeScript', 'PostgreSQL', 'Prisma', 'Kyber']),
      repoUrl: 'https://github.com/dogfood-test/ghost-key',
      demoUrl: 'http://localhost:4000/demo/ghost',
      isDraft: false,
      submittedAt: new Date(now.getTime() - 30 * 60 * 1000),
    },
  });

  // 8. Round-Robin Judge Assignments
  // Judge 1 (Elena) -> Subs 1, 2, 3
  // Judge 2 (Marcus) -> Subs 2, 3, 4
  // Judge 3 (Sarah) -> Subs 3, 4, 1
  // Judge 4 (David - consistent zero-variance) -> Subs 4, 1, 2
  const assignments = await Promise.all([
    prisma.judgeAssignment.create({ data: { eventId: event.id, judgeId: judges[0].id, submissionId: sub1.id, status: AssignmentStatus.COMPLETED } }),
    prisma.judgeAssignment.create({ data: { eventId: event.id, judgeId: judges[0].id, submissionId: sub2.id, status: AssignmentStatus.COMPLETED } }),
    prisma.judgeAssignment.create({ data: { eventId: event.id, judgeId: judges[0].id, submissionId: sub3.id, status: AssignmentStatus.COMPLETED } }),

    prisma.judgeAssignment.create({ data: { eventId: event.id, judgeId: judges[1].id, submissionId: sub2.id, status: AssignmentStatus.COMPLETED } }),
    prisma.judgeAssignment.create({ data: { eventId: event.id, judgeId: judges[1].id, submissionId: sub3.id, status: AssignmentStatus.COMPLETED } }),
    prisma.judgeAssignment.create({ data: { eventId: event.id, judgeId: judges[1].id, submissionId: sub4.id, status: AssignmentStatus.COMPLETED } }),

    prisma.judgeAssignment.create({ data: { eventId: event.id, judgeId: judges[2].id, submissionId: sub3.id, status: AssignmentStatus.COMPLETED } }),
    prisma.judgeAssignment.create({ data: { eventId: event.id, judgeId: judges[2].id, submissionId: sub4.id, status: AssignmentStatus.COMPLETED } }),
    prisma.judgeAssignment.create({ data: { eventId: event.id, judgeId: judges[2].id, submissionId: sub1.id, status: AssignmentStatus.COMPLETED } }),

    prisma.judgeAssignment.create({ data: { eventId: event.id, judgeId: judges[3].id, submissionId: sub4.id, status: AssignmentStatus.COMPLETED } }),
    prisma.judgeAssignment.create({ data: { eventId: event.id, judgeId: judges[3].id, submissionId: sub1.id, status: AssignmentStatus.COMPLETED } }),
    prisma.judgeAssignment.create({ data: { eventId: event.id, judgeId: judges[3].id, submissionId: sub2.id, status: AssignmentStatus.COMPLETED } }),
  ]);

  // Helper to submit 4 criteria scores
  async function addScore(assignment, s1, s2, s3, s4) {
    await prisma.score.createMany({
      data: [
        { assignmentId: assignment.id, criteriaId: c1.id, scoreValue: s1 },
        { assignmentId: assignment.id, criteriaId: c2.id, scoreValue: s2 },
        { assignmentId: assignment.id, criteriaId: c3.id, scoreValue: s3 },
        { assignmentId: assignment.id, criteriaId: c4.id, scoreValue: s4 },
      ],
    });
  }

  // Judge 1 (Elena) Scores
  await addScore(assignments[0], 9.0, 8.5, 9.0, 8.0); // Sub 1
  await addScore(assignments[1], 8.0, 7.5, 8.0, 7.0); // Sub 2
  await addScore(assignments[2], 9.5, 9.0, 8.5, 8.5); // Sub 3

  // Judge 2 (Marcus) Scores
  await addScore(assignments[3], 7.0, 8.0, 7.5, 7.0); // Sub 2
  await addScore(assignments[4], 8.5, 8.5, 9.0, 9.0); // Sub 3
  await addScore(assignments[5], 8.0, 9.0, 8.0, 8.5); // Sub 4

  // Judge 3 (Sarah) Scores
  await addScore(assignments[6], 9.0, 9.0, 9.5, 9.0); // Sub 3
  await addScore(assignments[7], 7.5, 8.0, 8.5, 8.0); // Sub 4
  await addScore(assignments[8], 8.5, 8.0, 8.0, 8.0); // Sub 1

  // Judge 4 (David Kim - constant scores for zero variance testing!)
  await addScore(assignments[9], 8.0, 8.0, 8.0, 8.0);  // Sub 4
  await addScore(assignments[10], 8.0, 8.0, 8.0, 8.0); // Sub 1
  await addScore(assignments[11], 8.0, 8.0, 8.0, 8.0); // Sub 2

  // 9. Initial Project Summaries
  await prisma.projectScoreSummary.createMany({
    data: [
      { submissionId: sub1.id, rawScoreMean: 8.35, normalizedZScore: 0.12, rank: 3 },
      { submissionId: sub2.id, rawScoreMean: 7.70, normalizedZScore: -0.45, rank: 4 },
      { submissionId: sub3.id, rawScoreMean: 8.90, normalizedZScore: 0.88, rank: 1 },
      { submissionId: sub4.id, rawScoreMean: 8.15, normalizedZScore: 0.05, rank: 2 },
    ],
  });

  // 10. Audit Logs
  await prisma.auditLog.createMany({
    data: [
      { eventId: event.id, actorId: organizer.id, action: 'EVENT_PUBLISHED', targetResource: 'Event', targetId: event.id, metadata: JSON.stringify({ name: event.name }) },
      { eventId: event.id, actorId: organizer.id, action: 'ROUND_ROBIN_ASSIGNMENT', targetResource: 'JudgeAssignment', metadata: JSON.stringify({ count: 12 }) },
    ],
  });

  // 11. Abuse Flag (Test case)
  await prisma.abuseFlag.create({
    data: {
      submissionId: sub2.id,
      flagType: 'SIMILAR_DESCRIPTION_NOTICE',
      severity: 'LOW',
      reason: 'Automated linguistic similarity flag for organizer review; verified benign.',
      resolved: false,
    },
  });

  // 12. Event Announcements (Phase 17)
  await prisma.announcement.createMany({
    data: [
      {
        eventId: event.id,
        authorId: organizer.id,
        title: '🚀 Dogfood 2026 Officially Underway!',
        content: 'Welcome builders to Dogfood 2026. Submissions must run with 100% offline-first local dependencies. Zero cloud runtime dependencies allowed.',
        isPinned: true,
      },
      {
        eventId: event.id,
        authorId: organizer.id,
        title: '⚖️ Judging Rubric & Z-Score Normalization Engine Active',
        content: 'Judges will evaluate submissions on Technical Depth (35%), Novelty (25%), Offline Resilience (20%), and UI Polish (20%). Scores are calibrated with statistical Z-Score normalization.',
        isPinned: false,
      },
    ],
  });

  // 13. Project Threaded Comments (Phase 17)
  const comment1 = await prisma.comment.create({
    data: {
      submissionId: sub1.id,
      authorId: participants[1].id, // Bob
      content: 'Incredible throughput benchmarks! How does HyperScale DB handle network split partitions?',
      isPinned: true,
    },
  });

  await prisma.comment.create({
    data: {
      submissionId: sub1.id,
      authorId: participants[0].id, // Alice
      parentId: comment1.id,
      content: 'We use hybrid vector clocks with CRDTs and RAFT consensus with local WAL disk fallback.',
    },
  });

  const comment2 = await prisma.comment.create({
    data: {
      submissionId: sub3.id,
      authorId: organizer.id,
      content: 'Outstanding visual polish on the hardware telemetry dashboard! Clean local SVG charts.',
      isPinned: true,
    },
  });

  console.log('[SEED] Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('[SEED ERROR]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
