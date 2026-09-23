"use strict";

// ============================================================
// server/services/interpolation/krigingCrossValidationService.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.5.1  Kriging Cross-Validation Foundation
//
// Purpose:
//   Leave-One-Out Cross-Validation (LOOCV) orchestration around
//   the existing Ordinary Kriging interpolation engine.
//
// Scientific rule:
//   Supplied Kriging variogram parameters remain FIXED across
//   every validation fold.
//
// This service does NOT:
//   - calculate distances
//   - calculate covariance
//   - build Kriging matrices
//   - solve linear systems
//   - estimate variogram parameters
//   - access the database
//   - modify the Kriging interpolation engine
//
// Residual convention:
//   residual = predictedValue - observedValue
//
// ============================================================

const krigingInterpolation = require("./krigingInterpolation");

const VALIDATION_METHOD = "leave_one_out";
const METHOD = "ordinary_kriging";
const MIN_SAMPLE_COUNT = 3;

/* ============================================================
   ERROR NORMALIZATION
   ============================================================ */

function normalizeError(error) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error.message === "string") {
    return error.message;
  }

  return "Kriging validation fold failed.";
}

/* ============================================================
   INPUT VALIDATION
   ============================================================ */

function validateCrossValidationInput({
  points,
  parameters,
} = {}) {
  const errors = [];

  if (!Array.isArray(points)) {
    errors.push("Sample points must be an array.");
  } else if (points.length < MIN_SAMPLE_COUNT) {
    errors.push(
      `At least ${MIN_SAMPLE_COUNT} sample points are required for Leave-One-Out Cross-Validation.`,
    );
  }

  if (!parameters || typeof parameters !== "object") {
    errors.push("Kriging parameters must be an object.");
  }

  return {
    valid: errors.length === 0,
    errors,
    count: Array.isArray(points) ? points.length : 0,
  };
}

/* ============================================================
   LEAVE-ONE-OUT FOLD GENERATION
   ============================================================ */

/**
 * Generate deterministic Leave-One-Out Cross-Validation folds.
 *
 * Each fold:
 *   - holds out exactly one observation
 *   - uses every other observation for training
 *
 * The original point objects are not modified.
 */
function generateLeaveOneOutFolds(points) {
  if (!Array.isArray(points)) {
    throw new TypeError("Sample points must be an array.");
  }

  return points.map((sample, index) => ({
    index,
    sample,
    trainingPoints: points.filter(
      (_, candidateIndex) => candidateIndex !== index,
    ),
  }));
}

/* ============================================================
   VALIDATION METRICS
   ============================================================ */

/**
 * Calculate LOOCV prediction metrics using successful folds only.
 *
 * Mean Error (ME):
 *   sum(residual) / n
 *
 * Mean Absolute Error (MAE):
 *   sum(abs(residual)) / n
 *
 * Root Mean Square Error (RMSE):
 *   sqrt(sum(residual^2) / n)
 */
function calculateValidationMetrics(predictions) {
  if (!Array.isArray(predictions)) {
    throw new TypeError("Predictions must be an array.");
  }

  const successfulPredictions = predictions.filter(
    (prediction) =>
      prediction &&
      prediction.success === true &&
      Number.isFinite(prediction.residual) &&
      Number.isFinite(prediction.absoluteError) &&
      Number.isFinite(prediction.squaredError),
  );

  if (successfulPredictions.length === 0) {
    return {
      meanError: null,
      meanAbsoluteError: null,
      rootMeanSquareError: null,
    };
  }

  const count = successfulPredictions.length;

  const residualSum = successfulPredictions.reduce(
    (sum, prediction) => sum + prediction.residual,
    0,
  );

  const absoluteErrorSum = successfulPredictions.reduce(
    (sum, prediction) => sum + prediction.absoluteError,
    0,
  );

  const squaredErrorSum = successfulPredictions.reduce(
    (sum, prediction) => sum + prediction.squaredError,
    0,
  );

  return {
    meanError: residualSum / count,
    meanAbsoluteError: absoluteErrorSum / count,
    rootMeanSquareError: Math.sqrt(
      squaredErrorSum / count,
    ),
  };
}

/* ============================================================
   SINGLE VALIDATION FOLD
   ============================================================ */

/**
 * Execute one LOOCV prediction.
 *
 * The same supplied parameter object is passed to every fold.
 * No variogram re-estimation occurs here.
 */
function validateSingleFold(
  fold,
  parameters,
  options = {},
) {
  const sample = fold.sample;

  const observedValue = Number(sample.value);

  const baseResult = {
    index: fold.index,
    sample,
    trainingSampleCount: fold.trainingPoints.length,
    observedValue,
    predictedValue: null,
    residual: null,
    absoluteError: null,
    squaredError: null,
    success: false,
  };

  if (!Number.isFinite(observedValue)) {
    return {
      ...baseResult,
      error: "Held-out sample value must be a finite number.",
      errors: [
        "Held-out sample value must be a finite number.",
      ],
    };
  }

  try {
    const result =
      krigingInterpolation.interpolateKriging(
        fold.trainingPoints,
        {
          latitude: sample.latitude,
          longitude: sample.longitude,
        },
        parameters,
        options,
      );

    if (!result || result.success !== true) {
      const error =
        result?.error ??
        "Kriging prediction failed.";

      const errors =
        Array.isArray(result?.errors) &&
        result.errors.length > 0
          ? result.errors
          : [error];

      return {
        ...baseResult,
        error,
        errors,
      };
    }

    const predictedValue = Number(
      result.predictedValue,
    );

    if (!Number.isFinite(predictedValue)) {
      const error =
        "Kriging prediction was not a finite number.";

      return {
        ...baseResult,
        error,
        errors: [error],
      };
    }

    const residual =
      predictedValue - observedValue;

    const absoluteError = Math.abs(residual);
    const squaredError = residual * residual;

    return {
      ...baseResult,
      predictedValue,
      residual,
      absoluteError,
      squaredError,
      success: true,
    };
  } catch (error) {
    const normalizedError =
      normalizeError(error);

    return {
      ...baseResult,
      error: normalizedError,
      errors: [normalizedError],
    };
  }
}

/* ============================================================
   FULL KRIGING CROSS-VALIDATION
   ============================================================ */

/**
 * Execute Leave-One-Out Cross-Validation.
 *
 * Supplied variogram parameters are fixed across all folds.
 *
 * If some folds fail:
 *   - failed folds remain in predictions
 *   - successful folds contribute to metrics
 *   - successfulValidationCount / failedValidationCount
 *     explicitly report the outcome
 *
 * If every fold fails:
 *   success === false
 */
function crossValidateKriging({
  points,
  parameters,
  options = {},
} = {}) {
  const validation =
    validateCrossValidationInput({
      points,
      parameters,
    });

  if (!validation.valid) {
    return {
      success: false,
      method: METHOD,
      validationMethod: VALIDATION_METHOD,
      sampleCount: validation.count,
      successfulValidationCount: 0,
      failedValidationCount: 0,
      predictions: [],
      metrics: calculateValidationMetrics([]),
      parameters: parameters ?? null,
      errors: validation.errors,
    };
  }

  const folds =
    generateLeaveOneOutFolds(points);

  const predictions = folds.map((fold) =>
    validateSingleFold(
      fold,
      parameters,
      options,
    ),
  );

  const successfulValidationCount =
    predictions.filter(
      (prediction) => prediction.success === true,
    ).length;

  const failedValidationCount =
    predictions.length -
    successfulValidationCount;

  const metrics =
    calculateValidationMetrics(predictions);

  if (successfulValidationCount === 0) {
    const errors = predictions.flatMap(
      (prediction) =>
        Array.isArray(prediction.errors)
          ? prediction.errors
          : prediction.error
            ? [prediction.error]
            : [],
    );

    return {
      success: false,
      method: METHOD,
      validationMethod: VALIDATION_METHOD,
      sampleCount: points.length,
      successfulValidationCount,
      failedValidationCount,
      predictions,
      metrics,
      parameters,
      errors,
    };
  }

  return {
    success: true,
    method: METHOD,
    validationMethod: VALIDATION_METHOD,
    sampleCount: points.length,
    successfulValidationCount,
    failedValidationCount,
    predictions,
    metrics,
    parameters,
  };
}

/* ============================================================
   EXPORTS
   ============================================================ */

module.exports = {
  VALIDATION_METHOD,
  METHOD,
  MIN_SAMPLE_COUNT,
  normalizeError,
  validateCrossValidationInput,
  generateLeaveOneOutFolds,
  calculateValidationMetrics,
  validateSingleFold,
  crossValidateKriging,
};
