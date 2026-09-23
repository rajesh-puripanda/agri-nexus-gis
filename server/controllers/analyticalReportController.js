/* ============================================================
   server/controllers/analyticalReportController.js
   ============================================================

   Soil Analysis GIS
   Phase 10.6.5 - Integrated Analytical GIS Reporting API

   HTTP orchestration only.
   Scientific calculations and report orchestration remain in:
   analyticalReportAggregationService.js

   ============================================================ */

"use strict";

const analyticalReportAggregationService =
  require("../services/reports/analyticalReportAggregationService");

async function generateIntegratedAnalyticalGISReport(req, res) {
  try {
    const request = req.body ?? {};

    const report =
      await analyticalReportAggregationService
        .buildIntegratedAnalyticalGISReport(request);

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error(
      "Integrated analytical GIS report error:",
      error,
    );

    const statusCode =
      Number.isInteger(error.statusCode) &&
      error.statusCode >= 400 &&
      error.statusCode < 600
        ? error.statusCode
        : 500;

    return res.status(statusCode).json({
      success: false,
      message:
        error.message ||
        "Failed to generate integrated analytical GIS report.",
      ...(Array.isArray(error.validationErrors)
        ? {
            errors: error.validationErrors,
          }
        : {}),
    });
  }
}

module.exports = {
  generateIntegratedAnalyticalGISReport,
};
