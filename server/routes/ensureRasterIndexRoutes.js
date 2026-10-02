"use strict";

// ============================================================
// AgriNexus GIS
//
// Ensure Raster Index REST API
//
// Endpoint:
//   POST /api/remote-sensing/raster/ensure-index
// ============================================================

const express = require("express");

const router = express.Router();

const {
    ensureRasterIndexRequest
} = require(
    "../controllers/ensureRasterIndexController"
);

router.post(
    "/ensure-index",
    ensureRasterIndexRequest
);

module.exports = router;
