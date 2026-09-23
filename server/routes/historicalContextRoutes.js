"use strict";

// ============================================================
// server/routes/historicalContextRoutes.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10.6  Historical GIS Context REST API
//
// Endpoint:
//   GET /api/soil-analysis/historical-context
//
// ============================================================

const express = require("express");

const router = express.Router();

const historicalContextController =
  require(
    "../controllers/historicalContextController",
  );

// ============================================================
// HISTORICAL GIS CONTEXT QUERY
// ============================================================

router.get(
  "/",
  historicalContextController.getHistoricalContext,
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
