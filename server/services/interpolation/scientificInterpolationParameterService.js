"use strict";

// ============================================================
// server/services/interpolation/scientificInterpolationParameterService.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.4.3  Scientific Estimation Parameter Pipeline
//
// Responsibilities:
//   1. Construct an experimental variogram from soil observations
//   2. Resolve scientifically estimated interpolation parameters
//   3. Preserve scientific provenance and diagnostics
//
// Does NOT:
//   - calculate spatial distances directly
//   - calculate semivariance directly
//   - estimate variogram parameters directly
//   - perform Kriging
//   - fall back to configured parameters
//   - modify interpolationService.js
//
// Scientific chain:
//
//   Soil observations
//          
//   experimentalVariogramService
//          
//   experimental semivariogram
//          
//   interpolationParameterService
//          
//   estimated interpolation parameters
//
// ============================================================

const {
  buildExperimentalVariogram,
} = require("./experimentalVariogramService");

const {
  resolveEstimatedKrigingParameters,
} = require("./interpolationParameterService");

// ============================================================
// SOURCE
// ============================================================

function estimatedSource() {
  return {
    type: "estimated",
    estimated: true,
  };
}

// ============================================================
// BUILD FAILURE
// ============================================================

function buildFailure({
  method,
  parameter,
  diagnostics = {},
  warnings = [],
  error,
  errors,
} = {}) {
  return {
    success: false,
    method: method ?? null,
    parameter: parameter ?? null,
    parameters: null,
    source: estimatedSource(),
    diagnostics,
    warnings: Array.isArray(warnings)
      ? warnings
      : [],
    error:
      error ??
      "Unable to resolve scientifically estimated interpolation parameters.",
    errors,
  };
}

// ============================================================
// SCIENTIFIC KRIGING PARAMETER PIPELINE
// ============================================================

function resolveScientificKrigingParameters({
  parameter,
  points,
  sampleCount,
  model = "spherical",
  variogramOptions = {},
  estimationOptions = {},
} = {}) {
  const effectiveSampleCount =
    sampleCount === undefined
      ? Array.isArray(points)
        ? points.length
        : null
      : sampleCount;

  const experimentalResult =
    buildExperimentalVariogram({
      points,
      options: variogramOptions,
    });

  if (!experimentalResult.success) {
    return buildFailure({
      method: "kriging",
      parameter,
      diagnostics: {
        input:
          experimentalResult.diagnostics ?? null,
      },
      error:
        experimentalResult.error ??
        "Unable to construct experimental semivariogram.",
    });
  }

  const parameterResult =
    resolveEstimatedKrigingParameters({
      parameter,
      sampleCount: effectiveSampleCount,
      experimental:
        experimentalResult.experimental,
      model,
      estimationOptions,
    });

  const diagnostics = {
    input:
      experimentalResult.diagnostics ?? null,

    estimation:
      parameterResult.diagnostics?.estimation ??
      null,

    dataQuality:
      parameterResult.diagnostics?.dataQuality ??
      null,

    estimationQuality:
      parameterResult.diagnostics?.estimationQuality ??
      null,

    fit:
      parameterResult.diagnostics?.fit ??
      null,
  };

  if (!parameterResult.success) {
    return buildFailure({
      method: "kriging",
      parameter,
      diagnostics,
      warnings:
        parameterResult.warnings ?? [],
      error:
        parameterResult.error ??
        "Unable to estimate Kriging variogram parameters.",
      errors:
        parameterResult.errors,
    });
  }

  return {
    success: true,
    method: "kriging",
    parameter: parameterResult.parameter,

    parameters: {
      ...parameterResult.parameters,
    },

    source: estimatedSource(),

    diagnostics,

    warnings:
      parameterResult.warnings ?? [],
  };
}

// ============================================================
// GENERIC SCIENTIFIC PARAMETER PIPELINE
// ============================================================

function resolveScientificInterpolationParameters({
  method,
  parameter,
  points,
  sampleCount,
  model = "spherical",
  variogramOptions = {},
  estimationOptions = {},
} = {}) {
  if (!method) {
    return buildFailure({
      method: null,
      parameter,
      error:
        "Interpolation method is required.",
    });
  }

  switch (
    String(method)
      .trim()
      .toLowerCase()
  ) {
    case "kriging":
      return resolveScientificKrigingParameters({
        parameter,
        points,
        sampleCount,
        model,
        variogramOptions,
        estimationOptions,
      });

    default:
      return buildFailure({
        method,
        parameter,
        error:
          `Unsupported scientific interpolation parameter method: ${method}.`,
      });
  }
}

// ============================================================
// PUBLIC API
// ============================================================

module.exports = {
  estimatedSource,
  buildFailure,
  resolveScientificKrigingParameters,
  resolveScientificInterpolationParameters,
};
