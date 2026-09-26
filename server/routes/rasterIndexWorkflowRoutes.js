"use strict";

// ============================================================
// server/routes/rasterIndexWorkflowRoutes.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.3.6.3
// Raster Index Workflow REST API
//
// Endpoint:
//   POST /api/remote-sensing/raster/index-workflow
//
// ============================================================

const express = require("express");

const router = express.Router();

const rasterIndexWorkflowController =
    require(
        "../controllers/rasterIndexWorkflowController"
    );

// ============================================================
// RASTER INDEX WORKFLOW
// ============================================================

router.post(
    "/index-workflow",
    rasterIndexWorkflowController
        .processRasterIndexWorkflowRequest
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
