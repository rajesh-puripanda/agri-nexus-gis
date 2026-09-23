/* ============================================================
   server/routes/analyticalReportRoutes.js
   ============================================================

   Soil Analysis GIS
   Phase 10.6.5 - Integrated Analytical GIS Reporting API

   ============================================================ */

"use strict";

const express = require("express");

const analyticalReportController =
  require("../controllers/analyticalReportController");

const router = express.Router();

router.post(
  "/integrated-analytical-gis",
  analyticalReportController.generateIntegratedAnalyticalGISReport,
);

module.exports = router;
