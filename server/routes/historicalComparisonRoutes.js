"use strict";

// ============================================================
// server/routes/historicalComparisonRoutes.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10.4.3 — Historical Comparison REST API
//
// ============================================================

const express = require("express");

const router = express.Router();

const historicalComparisonController = require("../controllers/historicalComparisonController");

// ============================================================
// HISTORICAL COMPARISON QUERY
// ============================================================
//
// GET /api/soil-analysis/historical
//
// ============================================================

router.get(
  "/",
  historicalComparisonController.getHistoricalComparison,
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
