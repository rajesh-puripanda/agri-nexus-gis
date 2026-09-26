"use strict";

// ============================================================
// server/routes/temporalAnalysisRoutes.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 5.1.7.19
// Temporal Analysis Workflow REST API
//
// Endpoint:
//   POST /api/soil-analysis/temporal-analysis
//
// ============================================================

const express = require("express");

const router = express.Router();

const temporalAnalysisController =
    require(
        "../controllers/temporalAnalysisController"
    );

// ============================================================
// TEMPORAL ANALYSIS WORKFLOW
// ============================================================

router.post(
    "/temporal-analysis",
    temporalAnalysisController
        .processTemporalAnalysisWorkflowRequest
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
