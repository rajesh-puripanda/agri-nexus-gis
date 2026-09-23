// ============================================================
// server/routes/interpolationRoutes.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 8.3 — Interpolation REST API
//
// Built on:
//
//   Phase 8.1 — Interpolation Architecture & Backend Foundation
//   Phase 8.2 — IDW Interpolation Engine
//
// ============================================================

const express = require("express");

const router = express.Router();

const interpolationController = require("../controllers/interpolationController");

// ============================================================
// INTERPOLATION CONFIGURATION
// ============================================================
//
// GET /api/soil-interpolation/config
//
// Returns the current interpolation REST API configuration,
// including:
//
//   - Supported interpolation methods
//   - Supported soil parameters
//   - Default settings
//   - Valid power limits
//   - Valid resolution limits
//
// ============================================================

router.get("/config", interpolationController.getInterpolationConfiguration);

// ============================================================
// INTERPOLATION SURFACE
// ============================================================
//
// POST /api/soil-interpolation
//
// Request:
//
// {
//   "parameter": "ph",
//   "method": "idw",
//   "power": 2,
//   "resolution": 50
// }
//
// The route delegates request processing to the controller.
//
// The controller delegates validation and scientific
// interpolation processing to interpolationService.
//
// ============================================================

router.post("/", interpolationController.prepareInterpolation);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
