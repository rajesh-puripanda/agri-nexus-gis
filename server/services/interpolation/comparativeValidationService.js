"use strict";

// ============================================================
// server/services/interpolation/comparativeValidationService.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.8.3 — Common Comparative Validation Service
//
// Responsibilities:
//   1. Normalize method-specific interpolation LOOCV results
//   2. Preserve method-specific scientific diagnostics
//   3. Provide a common comparative validation contract
//   4. Report applicability and technical failures explicitly
//
// Scientific rules:
//   - Does NOT modify interpolation mathematics
//   - Does NOT calculate new interpolation predictions
//   - Does NOT introduce weighting or scoring
//   - Does NOT rank interpolation methods
//   - Does NOT select a preferred method
//   - Does NOT introduce acceptance thresholds
//   - Does NOT modify method-specific LOOCV services
//
// Supported methods:
//   - idw
//   - kriging
//   - spline
//   - nearest_neighbour
//
// Validation type:
//   - leave-one-out cross-validation
//
// ============================================================

const idwCrossValidationService = require(
  "./idwCrossValidationService",
);

const krigingCrossValidationService = require(
  "./krigingCrossValidationService",
);

const splineCrossValidationService = require(
  "./splineCrossValidationService",
);

const nearestNeighbourCrossValidationService = require(
  "./nearestNeighbourCrossValidationService",
);

const SUPPORTED_METHODS = Object.freeze([
  "idw",
  "kriging",
  "spline",
  "nearest_neighbour",
]);

const VALIDATION_TYPE =
  "comparative_interpolation_validation";

const DIAGNOSTIC_TYPE = "loocv";

/* ============================================================
   BASIC VALIDATION
   ============================================================ */

function isFiniteNumericValue(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function isSupportedMethod(method) {
  return SUPPORTED_METHODS.includes(method);
}

function normalizeMethod(method) {
  if (
    typeof method !== "string" ||
    method.trim().length === 0
  ) {
    return null;
  }

  const normalized = method.trim().toLowerCase();

  return isSupportedMethod(normalized)
    ? normalized
    : null;
}

/* ============================================================
   RESULT STATUS
   ============================================================ */

function normalizeStatus(result) {
  if (!result || typeof result !== "object") {
    return "failed";
  }

  if (
    typeof result.status === "string" &&
    result.status.trim().length > 0
  ) {
    return result.status.trim().toLowerCase();
  }

  if (result.success === true) {
    return "complete";
  }

  return "failed";
}

function determineApplicability(result) {
  const status = normalizeStatus(result);

  if (status === "not_applicable") {
    return false;
  }

  return true;
}

/* ============================================================
   ERROR NORMALIZATION
   ============================================================ */

function normalizeErrors(result) {
  if (!result || typeof result !== "object") {
    return [
      "Validation result is unavailable or invalid.",
    ];
  }

  if (Array.isArray(result.errors)) {
    return result.errors.slice();
  }

  if (
    typeof result.error === "string" &&
    result.error.trim().length > 0
  ) {
    return [result.error];
  }

  return [];
}

/* ============================================================
   METRIC NORMALIZATION
   ============================================================ */

/**
 * Normalize method-specific metric names into the common
 * comparative contract.
 *
 * Common contract:
 *   meanError
 *   meanAbsoluteError
 *   rmse
 *   maxAbsoluteError
 *
 * Kriging uses:
 *   rootMeanSquareError
 *
 * IDW / Spline / NN use:
 *   rmse
 *
 * No metric is recalculated here.
 */
function normalizeMetrics(result) {
  if (!result || typeof result !== "object") {
    return null;
  }

  if (
    !result.metrics ||
    typeof result.metrics !== "object"
  ) {
    return null;
  }

  const metrics = result.metrics;

  const meanError =
    isFiniteNumericValue(metrics.meanError)
      ? metrics.meanError
      : null;

  const meanAbsoluteError =
    isFiniteNumericValue(
      metrics.meanAbsoluteError,
    )
      ? metrics.meanAbsoluteError
      : null;

  let rmse = null;

  if (isFiniteNumericValue(metrics.rmse)) {
    rmse = metrics.rmse;
  } else if (
    isFiniteNumericValue(
      metrics.rootMeanSquareError,
    )
  ) {
    rmse = metrics.rootMeanSquareError;
  }

  const maxAbsoluteError =
    isFiniteNumericValue(
      metrics.maxAbsoluteError,
    )
      ? metrics.maxAbsoluteError
      : null;

  return {
    meanError,
    meanAbsoluteError,
    rmse,
    maxAbsoluteError,
  };
}

/* ============================================================
   FOLD NORMALIZATION
   ============================================================ */

/**
 * Normalize method-specific fold containers.
 *
 * IDW / Spline / NN:
 *   result.folds
 *
 * Kriging:
 *   result.predictions
 *
 * The original fold objects are preserved. This layer only
 * changes the container name and does not alter scientific
 * diagnostics inside each fold.
 */
function normalizeFolds(result) {
  if (!result || typeof result !== "object") {
    return [];
  }

  let sourceFolds = null;

  if (Array.isArray(result.folds)) {
    sourceFolds = result.folds;
  } else if (
    Array.isArray(result.predictions)
  ) {
    sourceFolds = result.predictions;
  }

  if (!sourceFolds) {
    return [];
  }

  return sourceFolds.map((fold) => {
    if (!fold || typeof fold !== "object") {
      return {
        success: false,
        error: "Validation fold is invalid.",
      };
    }

    return {
      ...fold,
    };
  });
}

/* ============================================================
   FOLD COUNTS
   ============================================================ */

/**
 * Normalize successful/failed fold counts.
 *
 * IDW / Spline / NN:
 *   successfulFolds
 *   failedFolds
 *
 * Kriging:
 *   successfulValidationCount
 *   failedValidationCount
 *
 * Existing method-specific counts are preserved by the
 * original result and only normalized here.
 */
function normalizeSuccessfulFolds(result) {
  if (!result || typeof result !== "object") {
    return 0;
  }

  if (Number.isInteger(result.successfulFolds)) {
    return result.successfulFolds;
  }

  if (
    Number.isInteger(
      result.successfulValidationCount,
    )
  ) {
    return result.successfulValidationCount;
  }

  return 0;
}

function normalizeFailedFolds(result) {
  if (!result || typeof result !== "object") {
    return 0;
  }

  if (Number.isInteger(result.failedFolds)) {
    return result.failedFolds;
  }

  if (
    Number.isInteger(
      result.failedValidationCount,
    )
  ) {
    return result.failedValidationCount;
  }

  return 0;
}

/* ============================================================
   SAMPLE COUNT
   ============================================================ */

function normalizeSampleCount(result) {
  if (!result || typeof result !== "object") {
    return null;
  }

  return Number.isInteger(result.sampleCount)
    ? result.sampleCount
    : null;
}

/* ============================================================
   METHOD RESULT NORMALIZATION
   ============================================================ */

/**
 * Normalize one method-specific LOOCV result.
 *
 * This function does not execute interpolation.
 *
 * It only translates method-specific result contracts into
 * the common comparative contract.
 */
function normalizeMethodResult(
  method,
  result,
  options = {},
) {
  const normalizedMethod =
    normalizeMethod(method);

  if (!normalizedMethod) {
    return {
      success: false,
      method: null,
      diagnosticType: DIAGNOSTIC_TYPE,
      status: "failed",
      applicable: false,
      sampleCount: null,
      successfulFolds: 0,
      failedFolds: 0,
      metrics: null,
      folds: [],
      errors: [
        "Unsupported interpolation method.",
      ],
    };
  }

  if (!result || typeof result !== "object") {
    return {
      success: false,
      method: normalizedMethod,
      diagnosticType: DIAGNOSTIC_TYPE,
      status: "failed",
      applicable: false,
      sampleCount: null,
      successfulFolds: 0,
      failedFolds: 0,
      metrics: null,
      folds: [],
      errors: [
        "Method-specific validation result is unavailable.",
      ],
    };
  }

  const status =
    normalizeStatus(result);

  const applicable =
    determineApplicability(result);

  const normalized = {
    success:
      result.success === true,

    method:
      normalizedMethod,

    diagnosticType:
      DIAGNOSTIC_TYPE,

    status,

    applicable,

    sampleCount:
      normalizeSampleCount(result),

    successfulFolds:
      normalizeSuccessfulFolds(result),

    failedFolds:
      normalizeFailedFolds(result),

    metrics:
      normalizeMetrics(result),

    folds:
      normalizeFolds(result),

    errors:
      normalizeErrors(result),
  };

  /*
   * Preserve the complete method-specific result only when
   * explicitly requested.
   *
   * This allows callers to retain Kriging-specific fields such
   * as:
   *   parameters
   *   validationMethod
   *   predictions
   *
   * without contaminating the common contract.
   */
  if (options.includeRawResult === true) {
    normalized.rawResult = result;
  }

  return normalized;
}

/* ============================================================
   METHOD RESULT COLLECTION VALIDATION
   ============================================================ */

function validateMethodResults(methodResults) {
  if (
    !methodResults ||
    typeof methodResults !== "object" ||
    Array.isArray(methodResults)
  ) {
    return {
      valid: false,
      errors: [
        "Method validation results must be an object.",
      ],
    };
  }

  return {
    valid: true,
    errors: [],
  };
}

/* ============================================================
   METHOD RESULT COLLECTION NORMALIZATION
   ============================================================ */

function normalizeMethodResults(
  methodResults,
  options = {},
) {
  const validation =
    validateMethodResults(methodResults);

  if (!validation.valid) {
    return {
      idw: normalizeMethodResult(
        "idw",
        null,
        options,
      ),

      kriging: normalizeMethodResult(
        "kriging",
        null,
        options,
      ),

      spline: normalizeMethodResult(
        "spline",
        null,
        options,
      ),

      nearest_neighbour:
        normalizeMethodResult(
          "nearest_neighbour",
          null,
          options,
        ),
    };
  }

  return {
    idw: normalizeMethodResult(
      "idw",
      methodResults.idw,
      options,
    ),

    kriging: normalizeMethodResult(
      "kriging",
      methodResults.kriging,
      options,
    ),

    spline: normalizeMethodResult(
      "spline",
      methodResults.spline,
      options,
    ),

    nearest_neighbour:
      normalizeMethodResult(
        "nearest_neighbour",
        methodResults.nearest_neighbour,
        options,
      ),
  };
}

/* ============================================================
   COMPARATIVE SUMMARY
   ============================================================ */

/**
 * Produce factual availability/status counts only.
 *
 * This function intentionally does not:
 *   - compare metric magnitudes
 *   - score methods
 *   - rank methods
 *   - select a preferred method
 */
function calculateComparativeSummary(methods) {
  const methodValues =
    Object.values(methods);

  const applicableMethods =
    methodValues.filter(
      (method) =>
        method &&
        method.applicable === true,
    );

  const completeMethods =
    applicableMethods.filter(
      (method) =>
        method.status === "complete",
    );

  const failedMethods =
    applicableMethods.filter(
      (method) =>
        method.status === "failed",
    );

  const notApplicableMethods =
    methodValues.filter(
      (method) =>
        method &&
        method.status === "not_applicable",
    );

  return {
    methodCount:
      methodValues.length,

    applicableMethodCount:
      applicableMethods.length,

    completeMethodCount:
      completeMethods.length,

    failedMethodCount:
      failedMethods.length,

    notApplicableMethodCount:
      notApplicableMethods.length,
  };
}

/* ============================================================
   MAIN COMPARATIVE VALIDATION
   ============================================================ */

/**
 * Normalize the four method-specific LOOCV results.
 *
 * This function is diagnostic-only.
 *
 * It does not:
 *   - execute interpolation
 *   - calculate predictions
 *   - recalculate errors
 *   - rank methods
 *   - score methods
 *   - choose a method
 *   - enforce scientific acceptance thresholds
 */
function performComparativeValidation(
  methodResults,
  options = {},
) {
  const validation =
    validateMethodResults(
      methodResults,
    );

  if (!validation.valid) {
    const methods =
      normalizeMethodResults(
        methodResults,
        options,
      );

    return {
      success: false,
      status: "failed",
      validationType:
        VALIDATION_TYPE,
      diagnosticType:
        DIAGNOSTIC_TYPE,
      sampleCount: null,
      methods,
      summary:
        calculateComparativeSummary(
          methods,
        ),
      errors:
        validation.errors.slice(),
    };
  }

  const methods =
    normalizeMethodResults(
      methodResults,
      options,
    );

  const sampleCounts =
    Object.values(methods)
      .map(
        (method) =>
          method.sampleCount,
      )
      .filter(
        (count) =>
          Number.isInteger(count),
      );

  const sampleCount =
    sampleCounts.length > 0
      ? sampleCounts[0]
      : null;

  const summary =
    calculateComparativeSummary(
      methods,
    );

  const hasTechnicalFailure =
    Object.values(methods).some(
      (method) =>
        method.status === "failed",
    );

  const errors =
    hasTechnicalFailure
      ? Object.values(methods)
          .flatMap(
            (method) =>
              method.errors,
          )
      : [];

  return {
    success:
      !hasTechnicalFailure,

    status:
      hasTechnicalFailure
        ? "completed_with_failures"
        : "complete",

    validationType:
      VALIDATION_TYPE,

    diagnosticType:
      DIAGNOSTIC_TYPE,

    sampleCount,

    methods,

    summary,

    errors,
  };
}

function normalizeExecutionError(error) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Comparative validation method execution failed.";
}

function runComparativeValidation({
  samples,
  kriging = {},
  idwOptions = {},
  splineOptions = {},
  nearestNeighbourOptions = {},
  validationServices = {},
} = {}) {
  const services = {
    idw:
      validationServices.idw ??
      idwCrossValidationService,

    kriging:
      validationServices.kriging ??
      krigingCrossValidationService,

    spline:
      validationServices.spline ??
      splineCrossValidationService,

    nearest_neighbour:
      validationServices.nearest_neighbour ??
      nearestNeighbourCrossValidationService,
  };

  const methodResults = {
    idw: null,
    kriging: null,
    spline: null,
    nearest_neighbour: null,
  };

  const executionErrors = [];

  /*
   * ----------------------------------------------------------
   * IDW
   * ----------------------------------------------------------
   */

  try {
    methodResults.idw =
      services.idw.performLeaveOneOutCrossValidation(
        samples,
        idwOptions,
      );
  } catch (error) {
    methodResults.idw = {
      success: false,
      method: "idw",
      validationMethod: "leave_one_out",
      sampleCount: Array.isArray(samples)
        ? samples.length
        : null,
      folds: [],
      successfulFolds: 0,
      failedFolds: 0,
      metrics: null,
      errors: [
        normalizeExecutionError(error),
      ],
    };

    executionErrors.push({
      method: "idw",
      error: normalizeExecutionError(error),
    });
  }

  /*
   * ----------------------------------------------------------
   * KRIGING
   * ----------------------------------------------------------
   *
   * Kriging parameters are supplied by the caller.
   *
   * This service does NOT estimate or modify them.
   */

  try {
    methodResults.kriging =
      services.kriging.crossValidateKriging({
        points: samples,
        parameters: kriging.parameters,
        options: kriging.options ?? {},
      });
  } catch (error) {
    methodResults.kriging = {
      success: false,
      method: "ordinary_kriging",
      validationMethod: "leave_one_out",
      sampleCount: Array.isArray(samples)
        ? samples.length
        : null,
      successfulValidationCount: 0,
      failedValidationCount: 0,
      predictions: [],
      metrics: null,
      parameters:
        kriging.parameters ?? null,
      errors: [
        normalizeExecutionError(error),
      ],
    };

    executionErrors.push({
      method: "kriging",
      error: normalizeExecutionError(error),
    });
  }

  /*
   * ----------------------------------------------------------
   * THIN-PLATE SPLINE
   * ----------------------------------------------------------
   */

  try {
    methodResults.spline =
      services.spline.performLeaveOneOutCrossValidation(
        samples,
        splineOptions,
      );
  } catch (error) {
    methodResults.spline = {
      success: false,
      method: "thin_plate_spline_loocv",
      validationMethod: "leave_one_out",
      sampleCount: Array.isArray(samples)
        ? samples.length
        : null,
      folds: [],
      successfulFolds: 0,
      failedFolds: 0,
      metrics: null,
      errors: [
        normalizeExecutionError(error),
      ],
    };

    executionErrors.push({
      method: "spline",
      error: normalizeExecutionError(error),
    });
  }

  /*
   * ----------------------------------------------------------
   * NEAREST-NEIGHBOUR
   * ----------------------------------------------------------
   */

  try {
    methodResults.nearest_neighbour =
      services.nearest_neighbour
        .performLeaveOneOutCrossValidation(
          samples,
          nearestNeighbourOptions,
        );
  } catch (error) {
    methodResults.nearest_neighbour = {
      success: false,
      method: "nearest_neighbour_loocv",
      validationMethod: "leave_one_out",
      sampleCount: Array.isArray(samples)
        ? samples.length
        : null,
      folds: [],
      successfulFolds: 0,
      failedFolds: 0,
      metrics: null,
      errors: [
        normalizeExecutionError(error),
      ],
    };

    executionErrors.push({
      method: "nearest_neighbour",
      error: normalizeExecutionError(error),
    });
  }

  /*
   * ----------------------------------------------------------
   * COMMON NORMALIZATION
   * ----------------------------------------------------------
   */

  const comparativeResult =
    performComparativeValidation(
      methodResults,
    );

  if (executionErrors.length > 0) {
    return {
      ...comparativeResult,
      status: "completed_with_failures",
      executionErrors,
      errors: [
        ...(Array.isArray(
          comparativeResult.errors,
        )
          ? comparativeResult.errors
          : []),
        ...executionErrors.map(
          (entry) =>
            `${entry.method}: ${entry.error}`,
        ),
      ],
    };
  }

  return {
    ...comparativeResult,
    executionErrors: [],
  };
}

/* ============================================================
   ALIAS
   ============================================================ */

const comparativeInterpolationValidation =
  performComparativeValidation;

/* ============================================================
   EXPORTS
   ============================================================ */

module.exports = {
  SUPPORTED_METHODS,
  VALIDATION_TYPE,
  DIAGNOSTIC_TYPE,

  isFiniteNumericValue,
  isSupportedMethod,
  normalizeMethod,

  normalizeStatus,
  determineApplicability,

  normalizeErrors,
  normalizeMetrics,
  normalizeFolds,

  normalizeSuccessfulFolds,
  normalizeFailedFolds,
  normalizeSampleCount,

  normalizeMethodResult,
  validateMethodResults,
  normalizeMethodResults,

  calculateComparativeSummary,

  performComparativeValidation,
  comparativeInterpolationValidation,

  runComparativeValidation,
};