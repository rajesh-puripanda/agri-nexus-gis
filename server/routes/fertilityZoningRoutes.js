// ============================================================
// server/routes/fertilityZoningRoutes.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 9.3
// Fertility Zoning REST API
//
// Responsibilities:
//
//   - Define fertility zoning API endpoints
//   - Delegate requests to fertility zoning controller
//
// Scientific calculations and classification remain in:
//   server/services/fertilityZoningService.js
//
// ============================================================

"use strict";

const express = require("express");

const {
  getFertilityZoningConfiguration,
  generateFertilityZoning,
} = require("../controllers/fertilityZoningController");

const router = express.Router();

// ============================================================
// GET FERTILITY ZONING CONFIGURATION
// ============================================================
//
// GET /api/soil-fertility-zoning/config
//
// ============================================================

router.get("/config", getFertilityZoningConfiguration);

// ============================================================
// GENERATE FERTILITY ZONING
// ============================================================
//
// POST /api/soil-fertility-zoning
//
// ============================================================

router.post("/", generateFertilityZoning);

// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;
