"use strict";

// ============================================================
// server/services/interpolation/interpolationParameterService.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.4.1 — Scientific Interpolation Parameter Integration
//
// Responsibilities:
//   1. Resolve configured interpolation parameters
//   2. Resolve scientifically estimated Kriging parameters
//   3. Reuse authoritative variogram validation
//   4. Preserve parameter-source provenance
//   5. Expose estimation diagnostics
//
// Does NOT:
//   - perform Kriging
//   - modify interpolationService.js
//   - silently fall back from failed estimation to defaults
//
// ============================================================

const {
  normalizeVariogramModel,
  validateVariogramParameters,
} = require("./variogram");

const {
  estimateExperimentalVariogramParameters,
} = require("./variogramParameterEstimationService");

// ============================================================
// DEFAULT KRIGING PARAMETERS
// ============================================================
//
// Configured defaults only.
// These are NOT scientifically estimated parameters.
//

const DEFAULT_KRIGING_PARAMETERS = {
  model: "spherical",
  nugget: 0.1,
  sill: 1.0,
  range: 2000,
};

// ============================================================
// SUPPORTED METHODS
// ============================================================

const SUPPORTED_PARAMETER_METHODS = {
  kriging: "kriging",
};

// ============================================================
// SAMPLE COUNT
// ============================================================

function validateSampleCount(sampleCount) {
  if (
    sampleCount === undefined ||
    sampleCount === null
  ) {
    return {
      valid: true,
      sampleCount: null,
    };
  }

  const numericSampleCount =
    Number(sampleCount);

  if (
    !Number.isInteger(numericSampleCount) ||
    numericSampleCount < 0
  ) {
    return {
      valid: false,
      sampleCount: null,
      error:
        "Sample count must be a non-negative integer.",
    };
  }

  return {
    valid: true,
    sampleCount: numericSampleCount,
  };
}

// ============================================================
// SOURCE HELPERS
// ============================================================

function configuredSource() {
  return {
    type: "configured",
    estimated: false,
  };
}

function estimatedSource() {
  return {
    type: "estimated",
    estimated: true,
  };
}

// ============================================================
// RESOLVE CONFIGURED KRIGING PARAMETERS
// ============================================================

function resolveKrigingParameters({
  parameter,
  sampleCount,
  parameters = {},
} = {}) {
  const sampleValidation =
    validateSampleCount(sampleCount);

  if (!sampleValidation.valid) {
    return {
      success: false,
      method: "kriging",
      parameter: parameter ?? null,
      parameters: null,
      source: configuredSource(),
      diagnostics: {
        sampleCount: null,
      },
      error: sampleValidation.error,
    };
  }

  const configuredParameters = {
    ...DEFAULT_KRIGING_PARAMETERS,
    ...parameters,
  };

  const normalizedModel =
    normalizeVariogramModel(
      configuredParameters.model,
    );

  if (!normalizedModel) {
    return {
      success: false,
      method: "kriging",
      parameter: parameter ?? null,
      parameters: null,
      source: configuredSource(),
      diagnostics: {
        sampleCount:
          sampleValidation.sampleCount,
      },
      error:
        "Unsupported Kriging variogram model.",
    };
  }

  const validation =
    validateVariogramParameters(
      configuredParameters,
    );

  if (!validation.valid) {
    return {
      success: false,
      method: "kriging",
      parameter: parameter ?? null,
      parameters: null,
      source: configuredSource(),
      diagnostics: {
        sampleCount:
          sampleValidation.sampleCount,
        validationErrors:
          validation.errors,
      },
      error:
        "Invalid Kriging variogram parameters.",
      errors: validation.errors,
    };
  }

  return {
    success: true,
    method: "kriging",
    parameter: parameter ?? null,

    parameters: {
      model: normalizedModel.key,
      nugget: validation.nugget,
      sill: validation.sill,
      range: validation.range,
    },

    source: configuredSource(),

    diagnostics: {
      sampleCount:
        sampleValidation.sampleCount,
    },
  };
}

// ============================================================
// RESOLVE ESTIMATED KRIGING PARAMETERS
// ============================================================

function resolveEstimatedKrigingParameters({
  parameter,
  sampleCount,
  experimental,
  model = "spherical",
  estimationOptions = {},
} = {}) {
  const sampleValidation =
    validateSampleCount(sampleCount);

  if (!sampleValidation.valid) {
    return {
      success: false,
      method: "kriging",
      parameter: parameter ?? null,
      parameters: null,
      source: estimatedSource(),
      diagnostics: {
        sampleCount: null,
      },
      error: sampleValidation.error,
    };
  }

  const normalizedModel =
    normalizeVariogramModel(model);

  if (!normalizedModel) {
    return {
      success: false,
      method: "kriging",
      parameter: parameter ?? null,
      parameters: null,
      source: estimatedSource(),
      diagnostics: {
        sampleCount:
          sampleValidation.sampleCount,
      },
      error:
        "Unsupported Kriging variogram model.",
    };
  }

  const estimation =
    estimateExperimentalVariogramParameters({
      experimental,
      model: normalizedModel.key,
      options: estimationOptions,
    });

  if (!estimation.success) {
    return {
      success: false,
      method: "kriging",
      parameter: parameter ?? null,
      parameters: null,
      source: estimatedSource(),

      diagnostics: {
        sampleCount:
          sampleValidation.sampleCount,

        estimation:
          estimation.estimation ?? null,

        ...(estimation.diagnostics ?? {}),
      },

      warnings:
        estimation.warnings ?? [],

      error:
        estimation.error ??
        "Unable to estimate Kriging variogram parameters.",

      errors:
        estimation.errors,
    };
  }

  return {
    success: true,
    method: "kriging",
    parameter: parameter ?? null,

    parameters: {
      model: estimation.model,
      nugget:
        estimation.parameters.nugget,
      sill:
        estimation.parameters.sill,
      range:
        estimation.parameters.range,
    },

    source: estimatedSource(),

    diagnostics: {
      sampleCount:
        sampleValidation.sampleCount,

      estimation:
        estimation.estimation ?? null,

      ...(estimation.diagnostics ?? {}),

      fit:
        estimation.fit ?? null,
    },

    warnings:
      estimation.warnings ?? [],
  };
}

// ============================================================
// GENERIC PARAMETER RESOLUTION
// ============================================================
//
// estimation === true selects the scientific estimation path.
// Otherwise the existing configured path is preserved.
//
// ============================================================

function resolveInterpolationParameters({
  method,
  parameter,
  sampleCount,
  parameters = {},
  estimation = false,
  experimental,
  model = "spherical",
  estimationOptions = {},
} = {}) {
  if (!method) {
    return {
      success: false,
      method: null,
      parameter: parameter ?? null,
      parameters: null,
      source: configuredSource(),
      diagnostics: {
        sampleCount: null,
      },
      error:
        "Interpolation method is required.",
    };
  }

  switch (
    String(method)
      .trim()
      .toLowerCase()
  ) {
    case "kriging":
      if (estimation === true) {
        return resolveEstimatedKrigingParameters({
          parameter,
          sampleCount,
          experimental,
          model,
          estimationOptions,
        });
      }

      return resolveKrigingParameters({
        parameter,
        sampleCount,
        parameters,
      });

    default:
      return {
        success: false,
        method,
        parameter: parameter ?? null,
        parameters: null,
        source: configuredSource(),
        diagnostics: {
          sampleCount:
            sampleCount ?? null,
        },
        error:
          `Unsupported interpolation parameter method: ${method}.`,
      };
  }
}

// ============================================================
// PUBLIC API
// ============================================================

module.exports = {
  DEFAULT_KRIGING_PARAMETERS,
  SUPPORTED_PARAMETER_METHODS,
  validateSampleCount,
  resolveKrigingParameters,
  resolveEstimatedKrigingParameters,
  resolveInterpolationParameters,
};