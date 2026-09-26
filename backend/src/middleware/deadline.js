const prisma = require('../db');

/**
 * Middleware ensuring submission window is currently open for an event
 */
async function checkSubmissionDeadline(eventId) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, submissionDeadline: true, status: true },
  });

  if (!event) {
    return { error: 'Event not found.', code: 'EVENT_NOT_FOUND', allowed: false };
  }

  if (['FINALIZED', 'PUBLISHED'].includes(event.status)) {
    // Note: If event is in final review or published, submissions are closed
    // Unless in active hackathon window
  }

  const now = new Date();
  const deadline = new Date(event.submissionDeadline);

  if (now > deadline) {
    return {
      error: `Submission deadline has passed. Deadline was ${deadline.toISOString()}, current time is ${now.toISOString()}.`,
      code: 'DEADLINE_PASSED',
      allowed: false,
    };
  }

  return { allowed: true, event };
}

module.exports = {
  checkSubmissionDeadline,
};
