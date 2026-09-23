"use strict";

// ============================================================
// server/services/interpolation/variogramValidationService.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.5.3 — Variogram / Model Validation Criteria
//
// Responsibilities:
//   1. Validate experimental variogram support
//   2. Validate data-quality diagnostics
//   3. Validate structured variance
//   4. Validate practical range
//   5. Validate theoretical-model fit diagnostics
//   6. Validate estimated/configured variogram parameters
//   7. Aggregate nine independent validation criteria
//
// IMPORTANT:
//   This service validates structural/model information only.
//
//   It does NOT:
//     - select a variogram model
//     - optimize parameters
//     - re-estimate parameters
//     - accept/reject production Kriging
//     - modify Kriging interpolation
//     - access the database
//     - generate interpolation surfaces
//
// Phase 12.5.4 will define production acceptance/rejection rules.
// ============================================================

const {
  validateVariogramParameters,
} = require("./variogram");

const {
  DEFAULT_MIN_USABLE_LAGS,
  DEFAULT_MIN_TOTAL_PAIRS,
} = require("./variogramParameterEstimationService");

// ============================================================
// VALIDATION STATUS
// ============================================================

const VALIDATION_STATUS = Object.freeze({
  PASSED: "passed",
  WARNING: "warning",
  FAILED: "failed",
});

// ============================================================
// DEFAULT VALIDATION OPTIONS
// ============================================================

const DEFAULT_VALIDATION_OPTIONS = Object.freeze({
  minUsableLags: DEFAULT_MIN_USABLE_LAGS,
  minTotalPairs: DEFAULT_MIN_TOTAL_PAIRS,
});

// ============================================================
// BASIC HELPERS
// ============================================================

function isFiniteNumber(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function createPassedCriterion(
  actual,
  additional = {},
) {
  return {
    status: VALIDATION_STATUS.PASSED,
    actual,
    ...additional,
  };
}

function createWarningCriterion(
  actual,
  additional = {},
) {
  return {
    status: VALIDATION_STATUS.WARNING,
    actual,
    ...additional,
  };
}

function createFailedCriterion(
  actual,
  additional = {},
) {
  return {
    status: VALIDATION_STATUS.FAILED,
    actual,
    ...additional,
  };
}

// ============================================================
// INPUT NORMALIZATION
// ============================================================

function normalizeValidationOptions(
  options = {},
) {
  const minUsableLags =
    Number.isInteger(
      options?.minUsableLags,
    )
      ? options.minUsableLags
      : DEFAULT_VALIDATION_OPTIONS.minUsableLags;

  const minTotalPairs =
    Number.isInteger(
      options?.minTotalPairs,
    )
      ? options.minTotalPairs
      : DEFAULT_VALIDATION_OPTIONS.minTotalPairs;

  return {
    minUsableLags,
    minTotalPairs,
  };
}

function normalizeEstimationResult(
  estimationResult,
) {
  if (
    !estimationResult ||
    typeof estimationResult !== "object" ||
    Array.isArray(estimationResult)
  ) {
    return null;
  }

  return estimationResult;
}

// ============================================================
// CRITERION VALIDATORS
// ============================================================

function validateMinimumUsableLags(
  result,
  options = DEFAULT_VALIDATION_OPTIONS,
) {
  const normalizedOptions =
    normalizeValidationOptions(options);

  const usableLagCount =
    result?.usableLagCount;

  if (
    !Number.isInteger(
      usableLagCount,
    ) ||
    usableLagCount < 0
  ) {
    return createFailedCriterion(
      null,
      {
        required:
          normalizedOptions.minUsableLags,
        error:
          "Usable lag count is unavailable or invalid.",
      },
    );
  }

  if (
    usableLagCount <
    normalizedOptions.minUsableLags
  ) {
    return createFailedCriterion(
      usableLagCount,
      {
        required:
          normalizedOptions.minUsableLags,
        error:
          "Insufficient usable experimental variogram lags.",
      },
    );
  }

  return createPassedCriterion(
    usableLagCount,
    {
      required:
        normalizedOptions.minUsableLags,
    },
  );
}

function validatePairSupport(
  result,
  options = DEFAULT_VALIDATION_OPTIONS,
) {
  const normalizedOptions =
    normalizeValidationOptions(options);

  const totalPairCount =
    result?.totalPairCount;

  if (
    !Number.isInteger(
      totalPairCount,
    ) ||
    totalPairCount < 0
  ) {
    return createFailedCriterion(
      null,
      {
        required:
          normalizedOptions.minTotalPairs,
        error:
          "Total pair support is unavailable or invalid.",
      },
    );
  }

  if (
    totalPairCount <
    normalizedOptions.minTotalPairs
  ) {
    return createFailedCriterion(
      totalPairCount,
      {
        required:
          normalizedOptions.minTotalPairs,
        error:
          "Insufficient experimental variogram pair support.",
      },
    );
  }

  return createPassedCriterion(
    totalPairCount,
    {
      required:
        normalizedOptions.minTotalPairs,
    },
  );
}

function validateNonFlatVariogram(
  result,
) {
  const flatVariogram =
    result?.flatVariogram;

  if (
    typeof flatVariogram !==
    "boolean"
  ) {
    return createFailedCriterion(
      null,
      {
        error:
          "Flat-variogram diagnostic is unavailable or invalid.",
      },
    );
  }

  if (flatVariogram) {
    return createWarningCriterion(
      true,
      {
        warning:
          "Experimental variogram is flat.",
      },
    );
  }

  return createPassedCriterion(
    false,
  );
}

function validateMonotonicVariogram(
  result,
) {
  const nonMonotonicVariogram =
    result?.nonMonotonicVariogram;

  if (
    typeof nonMonotonicVariogram !==
    "boolean"
  ) {
    return createFailedCriterion(
      null,
      {
        error:
          "Monotonicity diagnostic is unavailable or invalid.",
      },
    );
  }

  if (nonMonotonicVariogram) {
    return createWarningCriterion(
      true,
      {
        warning:
          "Experimental variogram is non-monotonic.",
      },
    );
  }

  return createPassedCriterion(
    false,
  );
}

function validateDuplicateDistances(
  result,
) {
  const duplicateDistanceCount =
    result?.duplicateDistanceCount;

  if (
    !Number.isInteger(
      duplicateDistanceCount,
    ) ||
    duplicateDistanceCount < 0
  ) {
    return createFailedCriterion(
      null,
      {
        error:
          "Duplicate-distance diagnostic is unavailable or invalid.",
      },
    );
  }

  if (
    duplicateDistanceCount > 0
  ) {
    return createWarningCriterion(
      duplicateDistanceCount,
      {
        warning:
          "Experimental variogram contains duplicate positive-distance lags.",
      },
    );
  }

  return createPassedCriterion(
    0,
  );
}

function validateStructuredVariance(
  result,
) {
  const structuredVariance =
    result?.structuredVariance;

  if (
    !isFiniteNumber(
      structuredVariance,
    )
  ) {
    return createFailedCriterion(
      null,
      {
        error:
          "Structured variance is unavailable or invalid.",
      },
    );
  }

  if (
    structuredVariance <= 0
  ) {
    return createFailedCriterion(
      structuredVariance,
      {
        error:
          "Structured variance must be greater than zero.",
      },
    );
  }

  return createPassedCriterion(
    structuredVariance,
  );
}

function validatePracticalRange(
  result,
  estimationQuality = {},
) {
  const range =
    result?.range;

  const rangeFallbackUsed =
    Boolean(
      estimationQuality?.rangeFallbackUsed,
    );

  const earlyRangeDetection =
    Boolean(
      estimationQuality?.earlyRangeDetection,
    );

  if (
    !isFiniteNumber(range) ||
    range <= 0
  ) {
    return createFailedCriterion(
      range ?? null,
      {
        fallbackUsed:
          rangeFallbackUsed,
        earlyDetection:
          earlyRangeDetection,
        error:
          "Practical range must be finite and greater than zero.",
      },
    );
  }

  if (
    rangeFallbackUsed ||
    earlyRangeDetection
  ) {
    const warningParts = [];

    if (rangeFallbackUsed) {
      warningParts.push(
        "Practical range used maximum observed distance fallback.",
      );
    }

    if (earlyRangeDetection) {
      warningParts.push(
        "Practical range was reached at the first usable lag.",
      );
    }

    return createWarningCriterion(
      range,
      {
        fallbackUsed:
          rangeFallbackUsed,
        earlyDetection:
          earlyRangeDetection,
        warning:
          warningParts.join(" "),
      },
    );
  }

  return createPassedCriterion(
    range,
    {
      fallbackUsed:
        false,
      earlyDetection:
        false,
    },
  );
}

function validateModelFit(
  fit,
) {
  if (
    !fit ||
    typeof fit !== "object" ||
    Array.isArray(fit)
  ) {
    return createFailedCriterion(
      null,
      {
        weightedSSE: null,
        weightedRMSE: null,
        totalPairs: 0,
        error:
          "Model-fit diagnostics are unavailable.",
      },
    );
  }

  const weightedSSE =
    fit.weightedSSE;

  const weightedRMSE =
    fit.weightedRMSE;

  const totalPairs =
    fit.totalPairs;

  if (
    fit.success !== true
  ) {
    return createFailedCriterion(
      null,
      {
        weightedSSE:
          isFiniteNumber(
            weightedSSE,
          )
            ? weightedSSE
            : null,

        weightedRMSE:
          isFiniteNumber(
            weightedRMSE,
          )
            ? weightedRMSE
            : null,

        totalPairs:
          Number.isInteger(
            totalPairs,
          )
            ? totalPairs
            : 0,

        error:
          "Variogram model-fit diagnostics are not successful.",
      },
    );
  }

  if (
    !isFiniteNumber(
      weightedSSE,
    ) ||
    weightedSSE < 0 ||
    !isFiniteNumber(
      weightedRMSE,
    ) ||
    weightedRMSE < 0 ||
    !Number.isInteger(
      totalPairs,
    ) ||
    totalPairs <= 0
  ) {
    return createFailedCriterion(
      null,
      {
        weightedSSE:
          isFiniteNumber(
            weightedSSE,
          )
            ? weightedSSE
            : null,

        weightedRMSE:
          isFiniteNumber(
            weightedRMSE,
          )
            ? weightedRMSE
            : null,

        totalPairs:
          Number.isInteger(
            totalPairs,
          )
            ? totalPairs
            : 0,

        error:
          "Variogram model-fit diagnostics contain invalid values.",
      },
    );
  }

  return createPassedCriterion(
    true,
    {
      weightedSSE,
      weightedRMSE,
      totalPairs,
    },
  );
}

function validateParameters(
  parameters,
) {
  if (
    !parameters ||
    typeof parameters !== "object" ||
    Array.isArray(parameters)
  ) {
    return createFailedCriterion(
      null,
      {
        nugget: null,
        sill: null,
        range: null,
        errors: [
          "Variogram parameters are unavailable.",
        ],
      },
    );
  }

  const validation =
    validateVariogramParameters(
      parameters,
    );

  if (
    !validation ||
    validation.valid !== true
  ) {
    return createFailedCriterion(
      null,
      {
        nugget:
          parameters.nugget ??
          null,

        sill:
          parameters.sill ??
          null,

        range:
          parameters.range ??
          null,

        errors:
          Array.isArray(
            validation?.errors,
          )
            ? validation.errors
            : [
                "Variogram parameters are invalid.",
              ],
      },
    );
  }

  return createPassedCriterion(
    true,
    {
      nugget:
        parameters.nugget,

      sill:
        parameters.sill,

      range:
        parameters.range,
    },
  );
}

// ============================================================
// CRITERIA AGGREGATION
// ============================================================

function buildValidationCriteria(
  estimationResult,
  options = DEFAULT_VALIDATION_OPTIONS,
) {
  const normalizedOptions =
    normalizeValidationOptions(
      options,
    );

  const diagnostics =
    estimationResult?.diagnostics ?? {};

  const dataQuality =
    diagnostics?.dataQuality ?? {};

  const estimationQuality =
    diagnostics?.estimationQuality ?? {};

  const parameters =
    estimationResult?.parameters ?? {};

  return {
    minimumUsableLags:
      validateMinimumUsableLags(
        {
          usableLagCount:
            dataQuality?.usableLagCount ??
            diagnostics?.usableLagCount,
        },
        normalizedOptions,
      ),

    pairSupport:
      validatePairSupport(
        {
          totalPairCount:
            dataQuality?.totalPairCount ??
            diagnostics?.totalPairCount,
        },
        normalizedOptions,
      ),

    nonFlatVariogram:
      validateNonFlatVariogram(
        {
          flatVariogram:
            dataQuality?.flatVariogram ??
            diagnostics?.flatVariogram,
        },
      ),

    monotonicVariogram:
      validateMonotonicVariogram(
        {
          nonMonotonicVariogram:
            dataQuality?.nonMonotonicVariogram ??
            diagnostics?.nonMonotonicVariogram,
        },
      ),

    duplicateDistances:
      validateDuplicateDistances(
        {
          duplicateDistanceCount:
            dataQuality?.duplicateDistanceCount ??
            diagnostics?.duplicateDistanceCount,
        },
      ),

    structuredVariance:
      validateStructuredVariance(
        {
          structuredVariance:
            parameters?.structuredVariance,
        },
      ),

    practicalRange:
      validatePracticalRange(
        {
          range:
            parameters?.range,
        },
        estimationQuality,
      ),

    modelFit:
      validateModelFit(
        estimationResult?.fit,
      ),

    parameters:
      validateParameters(
        parameters,
      ),
  };
}

function summarizeCriteria(
  criteria,
) {
  const values =
    Object.values(
      criteria,
    );

  let passedCount = 0;
  let warningCount = 0;
  let failedCount = 0;

  for (const criterion of values) {
    if (
      criterion.status ===
      VALIDATION_STATUS.PASSED
    ) {
      passedCount += 1;
    } else if (
      criterion.status ===
      VALIDATION_STATUS.WARNING
    ) {
      warningCount += 1;
    } else if (
      criterion.status ===
      VALIDATION_STATUS.FAILED
    ) {
      failedCount += 1;
    }
  }

  return {
    passedCount,
    warningCount,
    failedCount,
  };
}

function collectWarnings(
  criteria,
) {
  const warnings = [];

  for (const criterion of Object.values(
    criteria,
  )) {
    if (
      criterion.status !==
      VALIDATION_STATUS.WARNING
    ) {
      continue;
    }

    if (
      Array.isArray(
        criterion.warning,
      )
    ) {
      warnings.push(
        ...criterion.warning,
      );
    } else if (
      typeof criterion.warning ===
      "string"
    ) {
      warnings.push(
        criterion.warning,
      );
    } else if (
      Array.isArray(
        criterion.warnings,
      )
    ) {
      warnings.push(
        ...criterion.warnings,
      );
    } else if (
      typeof criterion.warnings ===
      "string"
    ) {
      warnings.push(
        criterion.warnings,
      );
    } else if (
      typeof criterion.error ===
      "string"
    ) {
      warnings.push(
        criterion.error,
      );
    }
  }

  return warnings;
}

function collectErrors(
  criteria,
) {
  const errors = [];

  for (const criterion of Object.values(
    criteria,
  )) {
    if (
      criterion.status !==
      VALIDATION_STATUS.FAILED
    ) {
      continue;
    }

    if (
      Array.isArray(
        criterion.errors,
      )
    ) {
      errors.push(
        ...criterion.errors,
      );
    } else if (
      typeof criterion.errors ===
      "string"
    ) {
      errors.push(
        criterion.errors,
      );
    } else if (
      Array.isArray(
        criterion.error,
      )
    ) {
      errors.push(
        ...criterion.error,
      );
    } else if (
      typeof criterion.error ===
      "string"
    ) {
      errors.push(
        criterion.error,
      );
    }
  }

  return errors;
}

// ============================================================
// PUBLIC VALIDATION
// ============================================================

function validateVariogramEstimation(
  estimationResult,
  options = {},
) {
  const normalizedResult =
    normalizeEstimationResult(
      estimationResult,
    );

  if (!normalizedResult) {
    return {
      success: false,

      model: null,

      criteria: {},

      summary: {
        passedCount: 0,
        warningCount: 0,
        failedCount: 1,
      },

      warnings: [],

      errors: [
        "A valid variogram estimation result is required.",
      ],
    };
  }

  const normalizedOptions =
    normalizeValidationOptions(
      options,
    );

  const criteria =
    buildValidationCriteria(
      normalizedResult,
      normalizedOptions,
    );

  const summary =
    summarizeCriteria(
      criteria,
    );

  const warnings =
    collectWarnings(
      criteria,
    );

  const errors =
    collectErrors(
      criteria,
    );

  return {
    success: true,

    model:
      normalizedResult.model ??
      null,

    criteria,

    summary,

    warnings,

    errors,
  };
}

// ============================================================
// ALIAS
// ============================================================

function validateVariogramModel(
  estimationResult,
  options = {},
) {
  return validateVariogramEstimation(
    estimationResult,
    options,
  );
}

// ============================================================
// PUBLIC API
// ============================================================

module.exports = {
  VALIDATION_STATUS,

  DEFAULT_VALIDATION_OPTIONS,

  isFiniteNumber,

  normalizeValidationOptions,
  normalizeEstimationResult,

  validateMinimumUsableLags,
  validatePairSupport,
  validateNonFlatVariogram,
  validateMonotonicVariogram,
  validateDuplicateDistances,
  validateStructuredVariance,
  validatePracticalRange,
  validateModelFit,
  validateParameters,

  buildValidationCriteria,
  summarizeCriteria,
  collectWarnings,
  collectErrors,

  validateVariogramEstimation,
  validateVariogramModel,
};
