const prisma = require('../db');

/**
 * Get public gallery submissions with search, track filtering, and sanitization
 * GET /api/gallery
 * Public endpoint
 */
async function getGalleryProjects(req, res) {
  try {
    const {
      eventId,
      trackId,
      search,
      sort = 'newest',
      page = 1,
      limit = 50,
    } = req.query;

    // 1. Build query filters (Strictly isDraft: false and non-draft events)
    const where = {
      isDraft: false,
      event: {
        status: { in: ['ACTIVE', 'JUDGING', 'VOTING', 'FINALIZED', 'PUBLISHED'] },
      },
    };

    if (eventId) {
      where.eventId = eventId;
    }

    if (trackId) {
      where.trackId = trackId;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { tagline: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { techStack: { contains: term, mode: 'insensitive' } },
        { team: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    // 2. Sorting options
    let orderBy = { submittedAt: 'desc' };
    if (sort === 'title') {
      orderBy = { title: 'asc' };
    } else if (sort === 'team') {
      orderBy = { team: { name: 'asc' } };
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    // 3. Query projects with explicit projection
    const [projects, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        select: {
          id: true,
          eventId: true,
          title: true,
          tagline: true,
          description: true,
          techStack: true,
          repoUrl: true,
          demoUrl: true,
          videoUrl: true,
          thumbnailUrl: true,
          submittedAt: true,
          createdAt: true,
          track: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
              members: {
                select: {
                  role: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                      // NO email or passwordHash!
                    },
                  },
                },
              },
            },
          },
          event: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
            },
          },
        },
        orderBy,
        skip,
        take,
      }),
      prisma.submission.count({ where }),
    ]);

    // Parse techStack JSON safely
    const formattedProjects = projects.map((p) => {
      let tech = [];
      try {
        tech = JSON.parse(p.techStack);
      } catch (e) {
        tech = typeof p.techStack === 'string' ? p.techStack.split(',').map(s => s.trim()) : [];
      }
      return {
        ...p,
        techStack: Array.isArray(tech) ? tech : [],
      };
    });

    return res.status(200).json({
      projects: formattedProjects,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: take,
        pages: Math.ceil(total / take),
      },
    });
  } catch (err) {
    console.error('[GALLERY LIST ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error fetching gallery projects.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Get public details for a single project
 * GET /api/gallery/:id
 * Public endpoint
 */
async function getGalleryProjectById(req, res) {
  try {
    const { id } = req.params;

    const project = await prisma.submission.findFirst({
      where: {
        id,
        isDraft: false,
        event: {
          status: { in: ['ACTIVE', 'JUDGING', 'VOTING', 'FINALIZED', 'PUBLISHED'] },
        },
      },
      select: {
        id: true,
        eventId: true,
        title: true,
        tagline: true,
        description: true,
        techStack: true,
        repoUrl: true,
        demoUrl: true,
        videoUrl: true,
        thumbnailUrl: true,
        submittedAt: true,
        createdAt: true,
        track: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            members: {
              select: {
                role: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found in public gallery.',
        code: 'PROJECT_NOT_FOUND',
      });
    }

    let tech = [];
    try {
      tech = JSON.parse(project.techStack);
    } catch (e) {
      tech = [];
    }

    return res.status(200).json({
      project: {
        ...project,
        techStack: Array.isArray(tech) ? tech : [],
      },
    });
  } catch (err) {
    console.error('[GALLERY GET_BY_ID ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error fetching project details.',
      code: 'SERVER_ERROR',
    });
  }
}

module.exports = {
  getGalleryProjects,
  getGalleryProjectById,
};
