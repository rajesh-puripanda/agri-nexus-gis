// ============================================================
// server/routes/soilRoutes.js
// ============================================================
//
// Soil Analysis GIS
//
// REST API routes for soil samples.
//
// ============================================================

const express = require("express");

const router = express.Router();

const soilController = require("../controllers/soilController");

// ============================================================
// SOIL SAMPLE ROUTES
// ============================================================

router.post("/", soilController.createSoilSample);

router.get("/", soilController.getAllSoilSamples);

router.get("/:id", soilController.getSoilSampleById);

router.put("/:id", soilController.updateSoilSample);

router.delete("/:id", soilController.deleteSoilSample);

module.exports = router;
