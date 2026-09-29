const prisma = require('../db');
const realtimeService = require('../services/realtimeService');
const notificationService = require('../services/notificationService');
const activityService = require('../services/activityService');

/**
 * Helper to sanitize mentor profile output
 */
function sanitizeMentor(profile) {
  if (!profile) return null;
  let expertise = [];
  try {
    expertise = profile.expertise ? JSON.parse(profile.expertise) : [];
  } catch (e) {
    expertise = typeof profile.expertise === 'string' ? profile.expertise.split(',').map(s => s.trim()) : [];
  }

  return {
    id: profile.id,
    userId: profile.userId,
    name: profile.user?.name || '',
    role: profile.user?.role || '',
    githubUsername: profile.user?.githubUsername || '',
    reputationScore: profile.user?.reputationScore || 0,
    company: profile.company || '',
    bio: profile.bio || '',
    expertise: Array.isArray(expertise) ? expertise : [],
    status: profile.status,
    location: profile.location || '',
    maxConcurrentTickets: profile.maxConcurrentTickets,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

/**
 * 1. GET /api/mentors - List Mentors
 */
async function getMentors(req, res) {
  try {
    const { skill, status, search } = req.query;

    const where = {};
    if (status) {
      where.status = status;
    }

    const profiles = await prisma.mentorProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            githubUsername: true,
            reputationScore: true,
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    let sanitized = profiles.map(sanitizeMentor);

    if (skill) {
      const lower = skill.toLowerCase();
      sanitized = sanitized.filter(m => m.expertise.some(e => e.toLowerCase().includes(lower)));
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      sanitized = sanitized.filter(m => 
        m.name.toLowerCase().includes(lowerSearch) ||
        m.company.toLowerCase().includes(lowerSearch) ||
        m.bio.toLowerCase().includes(lowerSearch)
      );
    }

    res.json({
      mentors: sanitized,
      totalCount: sanitized.length
    });
  } catch (error) {
    console.error('Error fetching mentors:', error);
    res.status(500).json({ error: 'Failed to fetch mentors.' });
  }
}

/**
 * 2. PUT /api/mentors/profile - Register or Update Mentor Profile
 */
async function updateMentorProfile(req, res) {
  try {
    const userId = req.user.id;
    const { expertise, bio, company, status, location, maxConcurrentTickets } = req.body;

    const expertiseStr = Array.isArray(expertise)
      ? JSON.stringify(expertise)
      : typeof expertise === 'string'
      ? JSON.stringify(expertise.split(',').map(s => s.trim()))
      : '[]';

    const profile = await prisma.mentorProfile.upsert({
      where: { userId },
      update: {
        expertise: expertiseStr,
        bio: bio !== undefined ? bio : undefined,
        company: company !== undefined ? company : undefined,
        status: status || 'AVAILABLE',
        location: location !== undefined ? location : undefined,
        maxConcurrentTickets: maxConcurrentTickets ? parseInt(maxConcurrentTickets, 10) : 3,
      },
      create: {
        userId,
        expertise: expertiseStr,
        bio: bio || null,
        company: company || null,
        status: status || 'AVAILABLE',
        location: location || null,
        maxConcurrentTickets: maxConcurrentTickets ? parseInt(maxConcurrentTickets, 10) : 3,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            githubUsername: true,
            reputationScore: true,
          }
        }
      }
    });

    res.json({
      mentor: sanitizeMentor(profile),
      message: 'Mentor profile updated successfully.'
    });
  } catch (error) {
    console.error('Error updating mentor profile:', error);
    res.status(500).json({ error: 'Failed to update mentor profile.' });
  }
}

/**
 * 3. POST /api/support/tickets - Submit Support Ticket
 */
async function createSupportTicket(req, res) {
  try {
    const creatorId = req.user.id;
    const { eventId, teamId, title, description, category, priority, location } = req.body;

    if (!eventId || !title || !description) {
      return res.status(400).json({ error: 'eventId, title, and description are required.' });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        eventId,
        teamId: teamId || null,
        creatorId,
        title: title.trim(),
        description: description.trim(),
        category: category || 'DEBUGGING',
        priority: priority || 'NORMAL',
        location: location || null,
        status: 'OPEN',
      },
      include: {
        creator: {
          select: { id: true, name: true, role: true, githubUsername: true }
        },
        team: {
          select: { id: true, name: true }
        }
      }
    });

    // Real-time broadcast to event channel
    realtimeService.publish(`event:${eventId}`, 'SUPPORT_TICKET_CREATED', ticket);

    // Audit log
    activityService.logActivity({
      eventId,
      actorId: creatorId,
      action: 'SUPPORT_TICKET_CREATED',
      targetResource: 'SupportTicket',
      targetId: ticket.id,
      metadata: { title: ticket.title, category: ticket.category, priority: ticket.priority }
    }).catch(console.error);

    res.status(201).json({
      ticket,
      message: 'Support ticket submitted successfully. A mentor will claim it shortly.'
    });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({ error: 'Failed to create support ticket.' });
  }
}

/**
 * 4. GET /api/support/tickets - List Support Tickets
 */
async function getSupportTickets(req, res) {
  try {
    const { eventId, status, category, myTicketsOnly } = req.query;

    const where = {};
    if (eventId) where.eventId = eventId;
    if (status) where.status = status;
    if (category) where.category = category;

    // If regular participant and wants own tickets or default filtering
    if (myTicketsOnly === 'true' && req.user) {
      where.creatorId = req.user.id;
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        creator: {
          select: { id: true, name: true, role: true, githubUsername: true }
        },
        mentor: {
          select: { id: true, name: true, role: true }
        },
        team: {
          select: { id: true, name: true }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({
      tickets,
      totalCount: tickets.length
    });
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({ error: 'Failed to retrieve support tickets.' });
  }
}

/**
 * 5. GET /api/support/tickets/:id - Get Single Ticket
 */
async function getTicketById(req, res) {
  try {
    const { id } = req.params;
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, role: true, githubUsername: true }
        },
        mentor: {
          select: { id: true, name: true, role: true }
        },
        team: {
          select: { id: true, name: true }
        },
        event: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found.' });
    }

    res.json({ ticket });
  } catch (error) {
    console.error('Error fetching ticket by ID:', error);
    res.status(500).json({ error: 'Failed to retrieve ticket.' });
  }
}

/**
 * 6. PATCH /api/support/tickets/:id/claim - Claim Ticket (Mentor)
 */
async function claimSupportTicket(req, res) {
  try {
    const { id } = req.params;
    const mentorId = req.user.id;

    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    if (ticket.status !== 'OPEN') {
      return res.status(400).json({ error: `Cannot claim ticket with status ${ticket.status}.` });
    }

    const updated = await prisma.supportTicket.update({
      where: { id },
      data: {
        mentorId,
        status: 'CLAIMED',
        claimedAt: new Date(),
      },
      include: {
        creator: { select: { id: true, name: true, role: true } },
        mentor: { select: { id: true, name: true, role: true } },
        team: { select: { id: true, name: true } }
      }
    });

    // Notify ticket creator
    notificationService.createNotification({
      userId: ticket.creatorId,
      type: 'TICKET_CLAIMED',
      title: 'Mentor Assigned to Your Ticket',
      message: `${req.user.name} claimed your support ticket "${ticket.title}".`,
      metadata: { ticketId: ticket.id, mentorId }
    }).catch(console.error);

    // Realtime broadcast
    realtimeService.publish(`event:${ticket.eventId}`, 'SUPPORT_TICKET_CLAIMED', updated);

    res.json({
      ticket: updated,
      message: 'Support ticket claimed successfully.'
    });
  } catch (error) {
    console.error('Error claiming support ticket:', error);
    res.status(500).json({ error: 'Failed to claim support ticket.' });
  }
}

/**
 * 7. PATCH /api/support/tickets/:id/status - Update Ticket Status
 */
async function updateTicketStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, resolutionNotes } = req.body;
    const userId = req.user.id;

    const validStatuses = ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    // Only creator, assigned mentor, organizer or admin can update status
    const isAuthorized = 
      ticket.creatorId === userId ||
      ticket.mentorId === userId ||
      ['ORGANIZER', 'ADMIN'].includes(req.user.role);

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden. You are not authorized to update this ticket.' });
    }

    const dataToUpdate = {
      status,
      resolutionNotes: resolutionNotes || undefined,
    };

    if (status === 'RESOLVED') {
      dataToUpdate.resolvedAt = new Date();
    }

    const updated = await prisma.supportTicket.update({
      where: { id },
      data: dataToUpdate,
      include: {
        creator: { select: { id: true, name: true, role: true } },
        mentor: { select: { id: true, name: true, role: true } },
      }
    });

    // Award reputation points to mentor upon resolution
    if (status === 'RESOLVED' && updated.mentorId) {
      const points = 25;
      await prisma.user.update({
        where: { id: updated.mentorId },
        data: { reputationScore: { increment: points } }
      });

      await prisma.reputationLog.create({
        data: {
          userId: updated.mentorId,
          points,
          action: 'MENTOR_SUPPORT_RESOLVED',
          sourceId: updated.id,
          description: `Resolved support ticket: "${updated.title}" (+${points} pts)`
        }
      });
    }

    // Realtime broadcast
    realtimeService.publish(`event:${ticket.eventId}`, 'SUPPORT_TICKET_UPDATED', updated);

    res.json({
      ticket: updated,
      message: `Ticket marked as ${status}.`
    });
  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({ error: 'Failed to update ticket status.' });
  }
}

/**
 * 8. GET /api/mentors/office-hours - List Office Hour Slots
 */
async function getOfficeHours(req, res) {
  try {
    const { eventId, mentorId, status } = req.query;

    const where = {};
    if (eventId) where.eventId = eventId;
    if (mentorId) where.mentorId = mentorId;
    if (status) where.status = status;

    const slots = await prisma.officeHourSlot.findMany({
      where,
      include: {
        mentor: { select: { id: true, name: true, role: true } },
        bookedBy: { select: { id: true, name: true, role: true } },
        event: { select: { id: true, name: true, slug: true } }
      },
      orderBy: { startTime: 'asc' }
    });

    res.json({
      slots,
      totalCount: slots.length
    });
  } catch (error) {
    console.error('Error fetching office hours:', error);
    res.status(500).json({ error: 'Failed to retrieve office hours.' });
  }
}

/**
 * 9. POST /api/mentors/office-hours - Create Office Hour Slot
 */
async function createOfficeHourSlot(req, res) {
  try {
    const mentorId = req.user.id;
    const { eventId, topic, startTime, endTime, location } = req.body;

    if (!eventId || !topic || !startTime || !endTime) {
      return res.status(400).json({ error: 'eventId, topic, startTime, and endTime are required.' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return res.status(400).json({ error: 'Invalid start or end time. End time must be after start time.' });
    }

    const slot = await prisma.officeHourSlot.create({
      data: {
        eventId,
        mentorId,
        topic: topic.trim(),
        startTime: start,
        endTime: end,
        location: location || null,
        status: 'OPEN',
      },
      include: {
        mentor: { select: { id: true, name: true, role: true } }
      }
    });

    realtimeService.publish(`event:${eventId}`, 'OFFICE_HOURS_SLOT_CREATED', slot);

    res.status(201).json({
      slot,
      message: 'Office hour slot created successfully.'
    });
  } catch (error) {
    console.error('Error creating office hour slot:', error);
    res.status(500).json({ error: 'Failed to create office hour slot.' });
  }
}

/**
 * 10. POST /api/mentors/office-hours/:id/book - Book Office Hour Slot
 */
async function bookOfficeHourSlot(req, res) {
  try {
    const { id } = req.params;
    const bookedById = req.user.id;

    const slot = await prisma.officeHourSlot.findUnique({ where: { id } });
    if (!slot) {
      return res.status(404).json({ error: 'Office hour slot not found.' });
    }

    if (slot.status !== 'OPEN') {
      return res.status(400).json({ error: `Slot is already ${slot.status.toLowerCase()}.` });
    }

    if (slot.mentorId === bookedById) {
      return res.status(400).json({ error: 'You cannot book your own office hour slot.' });
    }

    const updated = await prisma.officeHourSlot.update({
      where: { id },
      data: {
        bookedById,
        status: 'BOOKED',
      },
      include: {
        mentor: { select: { id: true, name: true, role: true } },
        bookedBy: { select: { id: true, name: true, role: true } }
      }
    });

    // Notify mentor
    notificationService.createNotification({
      userId: slot.mentorId,
      type: 'OFFICE_HOURS_BOOKED',
      title: 'Office Hour Slot Booked',
      message: `${req.user.name} booked your office hour slot for "${slot.topic}".`,
      metadata: { slotId: slot.id, bookedById }
    }).catch(console.error);

    realtimeService.publish(`event:${slot.eventId}`, 'OFFICE_HOURS_SLOT_BOOKED', updated);

    res.json({
      slot: updated,
      message: 'Office hour slot booked successfully.'
    });
  } catch (error) {
    console.error('Error booking office hour slot:', error);
    res.status(500).json({ error: 'Failed to book office hour slot.' });
  }
}

/**
 * 11. DELETE /api/mentors/office-hours/:id/cancel - Cancel Slot
 */
async function cancelOfficeHourSlot(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const slot = await prisma.officeHourSlot.findUnique({ where: { id } });
    if (!slot) {
      return res.status(404).json({ error: 'Slot not found.' });
    }

    const isAuthorized = 
      slot.mentorId === userId ||
      slot.bookedById === userId ||
      ['ORGANIZER', 'ADMIN'].includes(req.user.role);

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden. You cannot cancel this slot.' });
    }

    const updated = await prisma.officeHourSlot.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    res.json({
      slot: updated,
      message: 'Office hour slot cancelled.'
    });
  } catch (error) {
    console.error('Error cancelling slot:', error);
    res.status(500).json({ error: 'Failed to cancel slot.' });
  }
}

module.exports = {
  getMentors,
  updateMentorProfile,
  createSupportTicket,
  getSupportTickets,
  getTicketById,
  claimSupportTicket,
  updateTicketStatus,
  getOfficeHours,
  createOfficeHourSlot,
  bookOfficeHourSlot,
  cancelOfficeHourSlot,
};
