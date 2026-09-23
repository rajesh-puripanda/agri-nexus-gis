"use strict";

// ============================================================
// server/controllers/historicalComparisonController.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10.4.3 — Historical Comparison REST API
//
// HTTP orchestration only.
//
// Scientific calculation and historical comparison logic remain
// entirely in:
//   historicalComparisonService.js
//
// ============================================================

const historicalComparisonService = require("../services/historicalComparisonService");

// ============================================================
// GET HISTORICAL COMPARISON
// ============================================================
//
// GET /api/soil-analysis/historical
//
// Query parameters:
//
//   datasetCode
//   mandal
//   siteNo
//   parameter
//   stages        optional, may be supplied multiple times
//
// Example:
//
//   /api/soil-analysis/historical
//     ?datasetCode=H2
//     &mandal=Paderu
//     &siteNo=1
//     &parameter=ph
//
// ============================================================

async function getHistoricalComparison(req, res) {
  try {
    const result = await historicalComparisonService.getHistoricalComparison({
      datasetCode: req.query.datasetCode,
      mandal: req.query.mandal,
      siteNo: req.query.siteNo,
      parameter: req.query.parameter,
      stages: req.query.stages,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Historical comparison error:", error);

    return res.status(500).json({
      success: false,
      phase: "10.4",
      code: "INTERNAL_ERROR",
      message:
        error.message || "Failed to prepare historical comparison result.",
    });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getHistoricalComparison,
};
