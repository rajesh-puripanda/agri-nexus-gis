"use strict";

// ============================================================
// server/routes/rasterIndexBatchWorkflowRoutes.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.4.2.4
// Batch Raster Index Workflow REST API
//
// Endpoint:
//   POST /api/remote-sensing/raster/index-batch-workflow
//
// ============================================================

const express = require("express");

const router = express.Router();

const rasterIndexBatchWorkflowController =
    require(
        "../controllers/rasterIndexBatchWorkflowController"
    );

// ============================================================
// BATCH RASTER INDEX WORKFLOW
// ============================================================

router.post(
    "/index-batch-workflow",
    rasterIndexBatchWorkflowController
        .processRasterIndexBatchWorkflowRequest
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
