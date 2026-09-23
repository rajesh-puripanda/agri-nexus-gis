"use strict";

// ============================================================
// server/controllers/historicalContextController.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10.6  Historical GIS Context REST API
//
// HTTP orchestration only.
//
// Authoritative historical logic remains in:
//   historicalContextService.js
//
// ============================================================

const historicalContextService = require(
  "../services/historicalContextService",
);

// ============================================================
// GET HISTORICAL CONTEXT
// ============================================================
//
// GET /api/soil-analysis/historical-context
//
// Query parameters:
//   sampleId
//   parameter
//
// ============================================================

async function getHistoricalContext(req, res) {
  try {
    const result =
      await historicalContextService.getHistoricalContext({
        sampleId: req.query.sampleId,
        parameter: req.query.parameter,
      });

    if (!result?.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error(
      "Historical context error:",
      error,
    );

    return res.status(500).json({
      success: false,
      phase: historicalContextService.API_PHASE,
      code: "HISTORICAL_CONTEXT_ERROR",
      message:
        error.message ||
        "Failed to prepare historical GIS context.",
    });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getHistoricalContext,
};
