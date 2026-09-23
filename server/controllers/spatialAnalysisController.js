// ============================================================
// server/controllers/spatialAnalysisController.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10.2.3 / Phase 10.6
// Spatial Analytical REST API + Historical GIS Context
//
// HTTP orchestration only.
//
// Scientific calculation remains in:
//   spatialAnalysisService.js
//
// Historical orchestration remains in:
//   historicalContextService.js
//
// ============================================================

const spatialAnalysisService = require("../services/spatialAnalysisService");
const historicalContextService = require("../services/historicalContextService");

// ============================================================
// GET SPATIAL ANALYSIS
// ============================================================
//
// GET /api/soil-analysis/spatial
//
// Query parameters:
//
//   latitude
//   longitude
//   parameter   optional analytical parameter
//
// Supported analytical parameters:
//
//   ph
//   nitrogen
//   phosphorus
//   potassium
//   organic_carbon
//   electrical_conductivity
//
// "standard" is a presentation-only map mode and therefore does
// not request historical analytical context.
//
// Example:
//
//   /api/soil-analysis/spatial
//     ?latitude=17.73
//     &longitude=83.32
//     &parameter=phosphorus
//
// ============================================================

async function getSpatialAnalysis(req, res) {
  try {
    const result = await spatialAnalysisService.prepareSpatialAnalysis({
      latitude: req.query.latitude,
      longitude: req.query.longitude,
    });

    // ----------------------------------------------------------
    // HISTORICAL GIS CONTEXT
    // ----------------------------------------------------------
    //
    // The spatial analysis service remains responsible only for
    // coordinate-based analytical interpretation.
    //
    // The nearest current sample returned by that service becomes
    // the bridge to the historical context service.
    //
    // ----------------------------------------------------------

    const requestedParameter = req.query.parameter;

    let historicalContext = {
      status: "not_requested",
      reason:
        requestedParameter === "standard"
          ? "Historical analytical context is not requested for standard map view."
          : "No analytical parameter was supplied.",
    };

    if (
      requestedParameter &&
      requestedParameter !== "standard" &&
      result?.spatialContext?.nearestSample?.id
    ) {
      try {
        historicalContext =
          await historicalContextService.getHistoricalContext({
            sampleId: result.spatialContext.nearestSample.id,
            parameter: requestedParameter,
          });
      } catch (historicalError) {
        console.error(
          "Historical GIS context error:",
          historicalError,
        );

        historicalContext = {
          status: "error",
          parameter: requestedParameter,
          message:
            historicalError.message ||
            "Failed to prepare historical GIS context.",
        };
      }
    }

    return res.status(200).json({
      ...result,

      historicalContext,
    });
  } catch (error) {
    console.error("Spatial analysis error:", error);

    const statusCode = Number.isInteger(error.statusCode)
      ? error.statusCode
      : 500;

    return res.status(statusCode).json({
      success: false,

      message:
        error.message ||
        "Failed to prepare spatial analytical result.",

      ...(Array.isArray(error.validationErrors)
        ? {
            errors: error.validationErrors,
          }
        : {}),
    });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getSpatialAnalysis,
};