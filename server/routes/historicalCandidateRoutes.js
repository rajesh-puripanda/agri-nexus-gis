"use strict";

// ============================================================
// server/routes/historicalCandidateRoutes.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10.4.5.2 — Historical Candidate REST API
//
// Endpoint:
//   GET /api/soil-analysis/historical/candidates
//
// ============================================================

const express = require("express");

const router = express.Router();

const historicalCandidateController = require(
  "../controllers/historicalCandidateController",
);

router.get(
  "/",
  historicalCandidateController.getHistoricalCandidates,
);

module.exports = router;