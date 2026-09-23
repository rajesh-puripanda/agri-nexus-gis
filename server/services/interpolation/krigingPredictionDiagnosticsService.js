"use strict";

// ============================================================
// server/services/interpolation/krigingPredictionDiagnosticsService.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.5.2  Kriging Prediction Diagnostics
//
// Purpose:
//   Calculate deterministic diagnostics for a Kriging prediction
//   against a known observed value.
//
// Scientific distinction:
//   predictionResidual = predictedValue - observedValue
//
//   This is different from the Kriging solver residual returned
//   by krigingInterpolation.js, which measures linear-system
//   solution accuracy.
//
// This service does NOT:
//   - calculate distances
//   - calculate covariance
//   - build Kriging matrices
//   - solve linear systems
//   - estimate variogram parameters
//   - perform cross-validation
//   - access the database
//   - modify Kriging predictions
//   - apply prediction acceptance/rejection criteria
//
// ============================================================


/* ============================================================
   NUMERIC VALIDATION
   ============================================================ */

/**
 * Determine whether a value is a finite number.
 *
 * @param {*} value
 * @returns {boolean}
 */
function isFiniteNumber(value) {
  return typeof value === "number" &&
    Number.isFinite(value);
}


/* ============================================================
   ERROR NORMALIZATION
   ============================================================ */

/**
 * Normalize an error into a stable diagnostic message.
 *
 * @param {*} error
 * @returns {string}
 */
function normalizeDiagnosticError(error) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error.message === "string") {
    return error.message;
  }

  return "Kriging prediction diagnostics failed.";
}


/* ============================================================
   INPUT VALIDATION
   ============================================================ */

/**
 * Validate observed and predicted values.
 *
 * @param {Object} input
 * @returns {{
 *   valid: boolean,
 *   errors: string[]
 * }}
 */
function validatePredictionDiagnosticInput({
  observedValue,
  predictedValue,
} = {}) {
  const errors = [];

  if (!isFiniteNumber(observedValue)) {
    errors.push(
      "Observed value must be a finite number.",
    );
  }

  if (!isFiniteNumber(predictedValue)) {
    errors.push(
      "Predicted value must be a finite number.",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}


/* ============================================================
   PREDICTION DIAGNOSTICS
   ============================================================ */

/**
 * Calculate deterministic prediction diagnostics.
 *
 * Definitions:
 *
 *   predictionResidual =
 *     predictedValue - observedValue
 *
 *   absoluteError =
 *     |predictionResidual|
 *
 *   squaredError =
 *     predictionResidual
 *
 *   relativeError =
 *     absoluteError / |observedValue|
 *
 * Relative error is undefined when observedValue === 0.
 * In that case relativeError and relativeErrorPercent are null.
 *
 * @param {Object} input
 * @returns {Object}
 */
function calculatePredictionDiagnostics({
  observedValue,
  predictedValue,
} = {}) {
  const validation =
    validatePredictionDiagnosticInput({
      observedValue,
      predictedValue,
    });

  if (!validation.valid) {
    return {
      success: false,

      observedValue:
        isFiniteNumber(observedValue)
          ? observedValue
          : null,

      predictedValue:
        isFiniteNumber(predictedValue)
          ? predictedValue
          : null,

      predictionResidual: null,
      absoluteError: null,
      squaredError: null,
      relativeError: null,
      relativeErrorPercent: null,

      warnings: [],

      error:
        validation.errors[0] ??
        "Invalid prediction diagnostic input.",

      errors: validation.errors,
    };
  }

  const predictionResidual =
    predictedValue - observedValue;

  const absoluteError =
    Math.abs(predictionResidual);

  const squaredError =
    predictionResidual * predictionResidual;

  if (observedValue === 0) {
    return {
      success: true,

      observedValue,
      predictedValue,

      predictionResidual,
      absoluteError,
      squaredError,

      relativeError: null,
      relativeErrorPercent: null,

      warnings: [
        "Relative error is undefined when observed value is zero.",
      ],
    };
  }

  const relativeError =
    absoluteError / Math.abs(observedValue);

  const relativeErrorPercent =
    relativeError * 100;

  return {
    success: true,

    observedValue,
    predictedValue,

    predictionResidual,
    absoluteError,
    squaredError,

    relativeError,
    relativeErrorPercent,

    warnings: [],
  };
}


/* ============================================================
   EXPORTS
   ============================================================ */

module.exports = {
  isFiniteNumber,
  normalizeDiagnosticError,
  validatePredictionDiagnosticInput,
  calculatePredictionDiagnostics,
};




