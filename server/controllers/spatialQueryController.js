// ============================================================
// server/controllers/spatialQueryController.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10.3.3 — Spatial Query REST API
//
// HTTP orchestration only.
//
// Query validation, classification, filtering, and spatial
// calculations remain in:
//   spatialQueryService.js
//
// ============================================================

"use strict";

const spatialQueryService = require("../services/spatialQueryService");

// ============================================================
// GET SPATIAL QUERY
// ============================================================
//
// GET /api/soil-analysis/query
//
// Analytical parameters:
//
//   parameter
//   classification
//
// Spatial parameters:
//
//   latitude
//   longitude
//   radius
//
// OR:
//
//   minLatitude
//   maxLatitude
//   minLongitude
//   maxLongitude
//
// Examples:
//
//   /api/soil-analysis/query?parameter=nitrogen&classification=low
//
//   /api/soil-analysis/query?latitude=17.71234&longitude=83.30125&radius=2000
//
//   /api/soil-analysis/query?parameter=nitrogen&classification=low&latitude=17.71234&longitude=83.30125&radius=2000
//
// ============================================================

async function querySpatialAnalysis(req, res) {
  try {
    const result = await spatialQueryService.querySamples({
      parameter: req.query.parameter,
      classification: req.query.classification,

      latitude: req.query.latitude,
      longitude: req.query.longitude,
      radius: req.query.radius,

      minLatitude: req.query.minLatitude,
      maxLatitude: req.query.maxLatitude,
      minLongitude: req.query.minLongitude,
      maxLongitude: req.query.maxLongitude,
    });

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error("Spatial query error:", error);

    return res.status(500).json({
      success: false,
      phase: "10.3",
      message: "Failed to execute spatial query.",
    });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  querySpatialAnalysis,
};
