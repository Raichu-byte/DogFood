const prisma = require('../db');

/**
 * List all users with optional role filtering
 * GET /api/admin/users
 */
async function listUsers(req, res) {
  try {
    const { role, search, page = 1, limit = 50 } = req.query;

    const where = {};
    if (role) {
      where.role = role.toUpperCase();
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.user.count({ where }),
    ]);

    return res.status(200).json({
      users,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: take,
        pages: Math.ceil(total / take),
      },
    });
  } catch (err) {
    console.error('[ADMIN LIST_USERS ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error fetching users.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Update a user's role
 * PUT /api/admin/users/:id/role
 */
async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['VISITOR', 'PARTICIPANT', 'JUDGE', 'ORGANIZER', 'ADMIN'];
    if (!role || !validRoles.includes(role.toUpperCase())) {
      return res.status(400).json({
        error: `Validation error: role must be one of [${validRoles.join(', ')}].`,
        code: 'INVALID_ROLE',
      });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({
        error: 'Target user not found.',
        code: 'USER_NOT_FOUND',
      });
    }

    // Only ADMIN can promote to ORGANIZER or ADMIN
    if (['ORGANIZER', 'ADMIN'].includes(role.toUpperCase()) && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Forbidden: Only ADMIN users can assign ORGANIZER or ADMIN roles.',
        code: 'INSUFFICIENT_ADMIN_PRIVILEGE',
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role: role.toUpperCase() },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      message: `User role updated successfully to ${updatedUser.role}.`,
      user: updatedUser,
    });
  } catch (err) {
    console.error('[ADMIN UPDATE_ROLE ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error updating user role.',
      code: 'SERVER_ERROR',
    });
  }
}

module.exports = {
  listUsers,
  updateUserRole,
};
