// ============================================================
// server/routes/soilAnalysisRoutes.js
// ============================================================
//
// Soil Analysis GIS
//
// Responsibility:
//   - Define Soil Analysis API routes
//   - Delegate all business logic to the controller
//
// ============================================================

"use strict";

const express = require("express");

const soilAnalysisController = require("../controllers/soilAnalysisController");
const spatialQueryController = require("../controllers/spatialQueryController");

const router = express.Router();
// ============================================================
// SPATIAL QUERY
// ============================================================
//
// GET /api/soil-analysis/query
//
// ============================================================

router.get("/query", spatialQueryController.querySpatialAnalysis);
// ============================================================
// SOIL ANALYSIS
// ============================================================
//
// GET /api/soil-analysis/sample/:id
//
// Returns:
//   - soil sample information
//   - classified laboratory analysis
//
// ============================================================

router.get("/sample/:id", soilAnalysisController.getSoilAnalysisBySampleId);

// ============================================================
// SOIL ANALYSIS REPORT
// ============================================================
//
// GET /api/soil-analysis/sample/:id/report
//
// Returns the complete decision-support report:
//
//   1. Sample information
//   2. Laboratory analysis
//   3. Fertility interpretation
//   4. Crop suitability
//   5. Soil management plan
//
// ============================================================

router.get(
  "/sample/:id/report",
  soilAnalysisController.getSoilAnalysisReportBySampleId,
);

// ============================================================
// SOIL RECOMMENDATIONS
// ============================================================
//
// GET /api/soil-analysis/sample/:id/recommendations
//
// Returns:
//   - fertility interpretation
//   - crop suitability
//   - soil management recommendations
//
// ============================================================

router.get(
  "/sample/:id/recommendations",
  soilAnalysisController.getSoilRecommendationsBySampleId,
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
