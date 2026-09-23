"use strict";

// ============================================================
// server/controllers/interpolationController.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 8.4 — Interpolation REST API Method Selection
//              and Response Contract
//
// Built on:
//
//   Phase 8.1 — Interpolation Architecture & Backend Foundation
//   Phase 8.2 — IDW Interpolation Engine
//   Phase 8.3 — Multiple Interpolation Method Integration
//
// Responsibilities:
//
//   1. Receive interpolation requests
//   2. Validate request structure through the service layer
//   3. Delegate surface generation to interpolationService
//   4. Return standardized API responses
//   5. Handle interpolation errors
//   6. Expose the current interpolation API configuration
//
// Scientific calculations remain inside the service layer.
//
// ============================================================

const interpolationService =
  require("../services/interpolationService");

// ============================================================
// POST /api/soil-interpolation
// ============================================================
//
// Generates the interpolation surface.
//
// Request body:
//
// {
//   "parameter": "ph",
//   "method": "idw",
//   "power": 2,
//   "resolution": 50
// }
//
// The service performs validation, interpolation,
// grid generation, and surface statistics.
//
// ============================================================

async function prepareInterpolation(req, res) {
  try {
    const requestData =
      req.body && typeof req.body === "object"
        ? req.body
        : {};

    const result =
      await interpolationService.generateInterpolationSurface(
        requestData,
      );

    return res.status(200).json(result);
  } catch (error) {
    console.error(
      "Interpolation surface generation error:",
      error,
    );

    const statusCode =
      Number.isInteger(error.statusCode)
        ? error.statusCode
        : 500;

    return res.status(statusCode).json({
      success: false,

      message:
        error.message ||
        "Failed to generate interpolation surface.",

      ...(Array.isArray(error.validationErrors)
        ? {
            errors: error.validationErrors,
          }
        : {}),
    });
  }
}

// ============================================================
// GET /api/soil-interpolation/config
// ============================================================

function getInterpolationConfiguration(req, res) {
  const methods = Object.values(
    interpolationService.SUPPORTED_METHODS,
  );

  const parameters = Object.values(
    interpolationService.SUPPORTED_PARAMETERS,
  );

  const methodRequirements = {};

  for (const method of methods) {
    const minimumSamples =
      interpolationService.MIN_SAMPLE_COUNTS?.[method.key];

    methodRequirements[method.key] = {
      minimumSamples,
    };
  }

  return res.status(200).json({
    success: true,

    phase: interpolationService.API_PHASE,

    methods,

    parameters,

    defaults: {
      method: "idw",
      power: interpolationService.DEFAULT_POWER,
      resolution:
        interpolationService.DEFAULT_RESOLUTION,
    },

    limits: {
      power: {
        min: interpolationService.MIN_POWER,
        max: interpolationService.MAX_POWER,
      },

      resolution: {
        min: interpolationService.MIN_RESOLUTION,
        max: interpolationService.MAX_RESOLUTION,
      },
    },

    methodRequirements,

    methodSettings: {
      idw: {
        power: {
          default:
            interpolationService.DEFAULT_POWER,
          min:
            interpolationService.MIN_POWER,
          max:
            interpolationService.MAX_POWER,
        },
      },

      kriging: {},

      spline: {},

      nearest_neighbour: {},
    },
  });
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  prepareInterpolation,
  getInterpolationConfiguration,
};
