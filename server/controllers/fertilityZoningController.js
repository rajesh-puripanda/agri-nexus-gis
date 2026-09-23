// ============================================================
// server/controllers/fertilityZoningController.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 9.3 — Fertility Zoning REST API
//
// Built on:
//
//   Phase 9.1 — Zoning Design & Data Model
//   Phase 9.2 — Backend Fertility Zoning Engine
//
// Responsibilities:
//
//   1. Receive fertility zoning requests
//   2. Delegate validation to fertilityZoningService
//   3. Delegate zoning generation to fertilityZoningService
//   4. Return standardized API responses
//   5. Expose the current fertility zoning configuration
//   6. Handle fertility zoning errors
//
// Scientific calculations remain entirely inside the service
// layer.
//
// The controller contains no scientific classification,
// interpolation mathematics, fertility rules, or GIS
// presentation logic.
//
// ============================================================

const fertilityZoningService = require("../services/fertilityZoningService");

// ============================================================
// PARSE OPTIONAL NUMBER
// ============================================================
//
// Request values may arrive as JSON numbers or strings.
//
// Undefined, null, and empty strings are treated as omitted.
// Other values are converted to numbers.
//
// ============================================================

function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : null;
}

// ============================================================
// GET /api/soil-fertility-zoning/config
// ============================================================
//
// Returns the supported fertility zoning REST API
// configuration.
//
// Defaults and limits are obtained directly from the
// fertilityZoningService so the API remains synchronized with
// the active backend zoning engine.
//
// ============================================================

function getFertilityZoningConfiguration(req, res) {
  return res.status(200).json({
    success: true,

    phase: fertilityZoningService.API_PHASE,

    configuration: {
      zoningType: fertilityZoningService.ZONING_TYPE,

      interpolationMethod: fertilityZoningService.INTERPOLATION_METHOD,

      defaults: {
        method: fertilityZoningService.INTERPOLATION_METHOD.key,

        power: fertilityZoningService.DEFAULT_POWER,

        resolution: fertilityZoningService.DEFAULT_RESOLUTION,
      },

      limits: {
        power: {
          min: fertilityZoningService.MIN_POWER,

          max: fertilityZoningService.MAX_POWER,
        },

        resolution: {
          min: fertilityZoningService.MIN_RESOLUTION,

          max: fertilityZoningService.MAX_RESOLUTION,
        },
      },

      fertilityParameters: fertilityZoningService.FERTILITY_PARAMETERS,

      zoneDefinitions: fertilityZoningService.FERTILITY_ZONE_DEFINITIONS,
    },
  });
}

// ============================================================
// POST /api/soil-fertility-zoning
// ============================================================
//
// Request body:
//
// {
//   "power": 2,
//   "resolution": 50
// }
//
// All validation and fertility zoning calculations are
// delegated to fertilityZoningService.
//
// ============================================================

async function generateFertilityZoning(req, res) {
  try {
    const requestData =
      req.body && typeof req.body === "object" ? req.body : {};

    const power = parseOptionalNumber(requestData.power);

    const resolution = parseOptionalNumber(requestData.resolution);

    // --------------------------------------------------------
    // Reject explicitly invalid numeric request values.
    // --------------------------------------------------------

    if (power === null) {
      return res.status(400).json({
        success: false,

        message: "power must be a valid number.",
      });
    }

    if (resolution === null) {
      return res.status(400).json({
        success: false,

        message: "resolution must be a whole number.",
      });
    }

    // --------------------------------------------------------
    // Delegate all scientific processing to the service.
    // --------------------------------------------------------

    const result = await fertilityZoningService.prepareFertilityZoning({
      power,
      resolution,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Fertility zoning generation error:", error);

    const statusCode = Number.isInteger(error.statusCode)
      ? error.statusCode
      : 500;

    return res.status(statusCode).json({
      success: false,

      message: error.message || "Failed to generate fertility zoning surface.",

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
  getFertilityZoningConfiguration,

  generateFertilityZoning,
};
