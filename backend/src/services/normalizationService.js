const prisma = require('../db');

/**
 * Computes the weighted score for an assignment's scores
 * @param {Array} scores - Array of Score objects with criteria
 * @returns {number}
 */
function computeWeightedScore(scores) {
  if (!scores || scores.length === 0) return 0;
  let total = 0;
  for (const s of scores) {
    const weight = s.criteria && typeof s.criteria.weight === 'number' ? s.criteria.weight : 1.0;
    total += s.scoreValue * weight;
  }
  return total;
}

/**
 * Calculates Z-Score Normalization across all completed judge evaluations for an event.
 * Mitigates judge bias by standardizing each judge's scoring distribution.
 * 
 * @param {string} eventId
 * @returns {Promise<{ projectSummaries: Array, judgeStats: Array, totalEvaluations: number }>}
 */
async function calculateEventZScores(eventId) {
  // 1. Fetch event and completed judge assignments with scores and criteria
  const assignments = await prisma.judgeAssignment.findMany({
    where: {
      eventId,
      status: 'COMPLETED',
    },
    include: {
      judge: {
        select: { id: true, name: true, email: true },
      },
      submission: {
        select: { id: true, title: true },
      },
      scores: {
        include: {
          criteria: true,
        },
      },
    },
  });

  if (assignments.length === 0) {
    return {
      projectSummaries: [],
      judgeStats: [],
      totalEvaluations: 0,
      message: 'No completed evaluations found for this event.',
    };
  }

  // 2. Group weighted scores by Judge
  // judgeId -> [ { submissionId, weightedScore, assignmentId } ]
  const judgeScoresMap = new Map();
  for (const a of assignments) {
    const weightedScore = computeWeightedScore(a.scores);
    if (!judgeScoresMap.has(a.judgeId)) {
      judgeScoresMap.set(a.judgeId, {
        judge: a.judge,
        evaluations: [],
      });
    }
    judgeScoresMap.get(a.judgeId).evaluations.push({
      submissionId: a.submissionId,
      assignmentId: a.id,
      weightedScore,
    });
  }

  // 3. Calculate Judge Statistics (Mean, Variance, StdDev) and compute Z-Scores
  const judgeStats = [];
  // assignmentId -> zScore
  const assignmentZScores = new Map();

  for (const [judgeId, data] of judgeScoresMap.entries()) {
    const scoresList = data.evaluations.map(e => e.weightedScore);
    const n = scoresList.length;
    const mean = scoresList.reduce((sum, val) => sum + val, 0) / n;

    // Population Variance & Standard Deviation
    const variance = n > 0
      ? scoresList.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n
      : 0;
    const stdDev = Math.sqrt(variance);

    judgeStats.push({
      judgeId,
      judgeName: data.judge.name,
      evaluationsCount: n,
      mean: parseFloat(mean.toFixed(4)),
      variance: parseFloat(variance.toFixed(4)),
      stdDev: parseFloat(stdDev.toFixed(4)),
      hasZeroVariance: stdDev === 0 || n < 2,
    });

    // Compute Z-score for each evaluation by this judge
    for (const evalItem of data.evaluations) {
      let z = 0.0;
      if (stdDev > 0.00001 && n >= 2) {
        z = (evalItem.weightedScore - mean) / stdDev;
      } else {
        // Fallback for single evaluation or uniform identical scores
        z = 0.0;
      }
      assignmentZScores.set(evalItem.assignmentId, {
        submissionId: evalItem.submissionId,
        weightedScore: evalItem.weightedScore,
        zScore: z,
      });
    }
  }

  // 4. Aggregate Z-Scores and Raw Means by Project
  // submissionId -> { rawScores: [], zScores: [] }
  const projectAggregates = new Map();

  for (const [assignmentId, evalData] of assignmentZScores.entries()) {
    if (!projectAggregates.has(evalData.submissionId)) {
      projectAggregates.set(evalData.submissionId, {
        rawScores: [],
        zScores: [],
      });
    }
    const agg = projectAggregates.get(evalData.submissionId);
    agg.rawScores.push(evalData.weightedScore);
    agg.zScores.push(evalData.zScore);
  }

  // 5. Update ProjectScoreSummary table in database
  const projectSummaries = [];

  for (const [submissionId, agg] of projectAggregates.entries()) {
    const rawMean = parseFloat((agg.rawScores.reduce((a, b) => a + b, 0) / agg.rawScores.length).toFixed(4));
    const zMean = parseFloat((agg.zScores.reduce((a, b) => a + b, 0) / agg.zScores.length).toFixed(4));

    const updatedSummary = await prisma.projectScoreSummary.upsert({
      where: { submissionId },
      update: {
        rawScoreMean: rawMean,
        normalizedZScore: zMean,
      },
      create: {
        submissionId,
        rawScoreMean: rawMean,
        normalizedZScore: zMean,
      },
      include: {
        submission: {
          select: {
            id: true,
            title: true,
            team: { select: { id: true, name: true } },
            track: { select: { id: true, name: true } },
          },
        },
      },
    });

    projectSummaries.push({
      ...updatedSummary,
      evaluationsCount: agg.rawScores.length,
    });
  }

  // Sort by normalizedZScore descending
  projectSummaries.sort((a, b) => b.normalizedZScore - a.normalizedZScore);

  return {
    totalEvaluations: assignments.length,
    totalProjects: projectSummaries.length,
    judgeStats,
    projectSummaries,
  };
}

module.exports = {
  computeWeightedScore,
  calculateEventZScores,
};
