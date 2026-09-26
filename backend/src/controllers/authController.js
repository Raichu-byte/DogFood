const prisma = require('../db');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');

/**
 * Register a new user
 * POST /api/auth/register
 */
async function register(req, res) {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Validation error: email, password, and name are required.',
        code: 'VALIDATION_FAILED',
      });
    }

    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Validation error: invalid email format.',
        code: 'INVALID_EMAIL',
      });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        error: 'Validation error: password must be at least 6 characters.',
        code: 'WEAK_PASSWORD',
      });
    }

    // Check if email already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'An account with this email address already exists.',
        code: 'EMAIL_ALREADY_EXISTS',
      });
    }

    // Determine role (default to PARTICIPANT)
    // Prevent unprivileged users from self-assigning ORGANIZER or ADMIN
    let assignedRole = 'PARTICIPANT';
    if (role) {
      const upperRole = role.toUpperCase();
      if (['PARTICIPANT', 'JUDGE', 'VISITOR'].includes(upperRole)) {
        assignedRole = upperRole;
      } else if (['ORGANIZER', 'ADMIN'].includes(upperRole)) {
        return res.status(403).json({
          error: 'Forbidden: Cannot self-register as ORGANIZER or ADMIN.',
          code: 'ROLE_ELEVATION_DENIED',
        });
      }
    }

    const passwordHash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name.trim(),
        passwordHash,
        role: assignedRole,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    const token = generateToken(newUser);

    return res.status(201).json({
      message: 'User registered successfully.',
      token,
      user: newUser,
    });
  } catch (err) {
    console.error('[AUTH REGISTER ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error during registration.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * User login
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation error: email and password are required.',
        code: 'VALIDATION_FAILED',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    const sanitizedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };

    const token = generateToken(sanitizedUser);

    return res.status(200).json({
      message: 'Authentication successful.',
      token,
      user: sanitizedUser,
    });
  } catch (err) {
    console.error('[AUTH LOGIN ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error during login.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
async function getMe(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User profile not found.',
        code: 'USER_NOT_FOUND',
      });
    }

    return res.status(200).json({
      user,
    });
  } catch (err) {
    console.error('[AUTH GET_ME ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error fetching user profile.',
      code: 'SERVER_ERROR',
    });
  }
}

module.exports = {
  register,
  login,
  getMe,
};
