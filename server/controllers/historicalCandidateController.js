"use strict";

// ============================================================
// server/controllers/historicalCandidateController.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10.4.5.2 — Historical Candidate REST API
//
// Responsibilities:
//   1. Read candidate-discovery request parameters
//   2. Delegate validation and processing to the service
//   3. Return the structured candidate-discovery result
//   4. Handle unexpected server errors
//
// Scientific/spatial calculations remain in:
//   server/services/historicalCandidateService.js
//
// ============================================================

const historicalCandidateService = require(
  "../services/historicalCandidateService",
);

async function getHistoricalCandidates(req, res) {
  try {
    const result =
      await historicalCandidateService.getHistoricalCandidates({
        sampleId: req.query.sampleId,
        maxCandidates: req.query.maxCandidates,
      });

    return res.status(200).json(result);
  } catch (error) {
    console.error(
      "Historical candidate discovery error:",
      error,
    );

    return res.status(500).json({
      success: false,
      phase: "10.4",
      code: "INTERNAL_ERROR",
      message:
        error.message ||
        "Failed to prepare historical candidate result.",
    });
  }
}

module.exports = {
  getHistoricalCandidates,
};