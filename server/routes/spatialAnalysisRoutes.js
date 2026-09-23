// ============================================================
// server/routes/spatialAnalysisRoutes.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10.2.3 — Spatial Analytical REST API
//
// ============================================================

const express = require("express");

const router = express.Router();

const spatialAnalysisController = require("../controllers/spatialAnalysisController");

// ============================================================
// SPATIAL ANALYTICAL QUERY
// ============================================================
//
// GET /api/soil-analysis/spatial
//
// ============================================================

router.get("/", spatialAnalysisController.getSpatialAnalysis);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
