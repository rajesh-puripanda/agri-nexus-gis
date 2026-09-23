"use strict";

// ============================================================
// server/services/interpolation/splineCrossValidationService.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.6.5.1 — Thin-Plate Spline LOOCV Foundation
//
// Scientific purpose:
//
//   Perform leave-one-out cross-validation (LOOCV) for the
//   existing exact thin-plate spline interpolation engine.
//
// Method:
//
//   For each observation:
//     1. Remove that observation from the training set.
//     2. Fit the existing TPS implementation to the remaining
//        observations.
//     3. Predict the omitted observation.
//     4. Compare prediction with the observed value.
//
// Error convention:
//
//   error = predicted - observed
//
// Therefore:
//
//   positive error = over-prediction
//   negative error = under-prediction
//
// This module does not:
//
//   - implement TPS mathematics
//   - build spline matrices
//   - solve linear systems
//   - introduce a smoothing parameter
//   - define scientific acceptance thresholds
//
// It delegates interpolation to the authoritative
// splineInterpolation service.
//
// ============================================================

const {
  interpolateSpline,
  isFiniteNumber,
} = require("./splineInterpolation");

const MIN_LOOCV_SAMPLE_COUNT = 4;

// ------------------------------------------------------------
// Validation helpers
// ------------------------------------------------------------

function validateLOOCVSamples(samples) {
  const errors = [];

  if (!Array.isArray(samples)) {
    return {
      valid: false,
      errors: [
        "LOOCV samples must be an array.",
      ],
    };
  }

  if (
    samples.length <
    MIN_LOOCV_SAMPLE_COUNT
  ) {
    errors.push(
      `At least ${MIN_LOOCV_SAMPLE_COUNT} samples are required for leave-one-out cross-validation.`,
    );
  }

  samples.forEach((sample, index) => {
    if (
      !sample ||
      typeof sample !== "object"
    ) {
      errors.push(
        `Sample ${index} must be an object.`,
      );
      return;
    }

    if (
      !isFiniteNumber(sample.latitude) ||
      !isFiniteNumber(sample.longitude)
    ) {
      errors.push(
        `Sample ${index} must contain finite latitude and longitude values.`,
      );
    }

    if (!isFiniteNumber(sample.value)) {
      errors.push(
        `Sample ${index} must contain a finite numeric value.`,
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ------------------------------------------------------------
// Fold construction
// ------------------------------------------------------------

function buildTrainingSamples(
  samples,
  omittedIndex,
) {
  if (!Array.isArray(samples)) {
    return null;
  }

  if (
    !Number.isInteger(omittedIndex) ||
    omittedIndex < 0 ||
    omittedIndex >= samples.length
  ) {
    return null;
  }

  return samples.filter(
    (_, index) =>
      index !== omittedIndex,
  );
}

// ------------------------------------------------------------
// Sample identifier
// ------------------------------------------------------------

function getSampleIdentifier(
  sample,
  index,
) {
  if (
    sample &&
    sample.sample_code !== undefined &&
    sample.sample_code !== null
  ) {
    return sample.sample_code;
  }

  if (
    sample &&
    sample.id !== undefined &&
    sample.id !== null
  ) {
    return sample.id;
  }

  return index;
}

// ------------------------------------------------------------
// Fold evaluation
// ------------------------------------------------------------

function evaluateLOOCVFold(
  samples,
  omittedIndex,
  options = {},
) {
  const omittedSample =
    samples?.[omittedIndex];

  if (!omittedSample) {
    return {
      success: false,
      index: omittedIndex,
      sampleCode:
        getSampleIdentifier(
          omittedSample,
          omittedIndex,
        ),
      observed: null,
      predicted: null,
      error: null,
      absoluteError: null,
      squaredError: null,
      errorType:
        "invalid_omitted_sample",
      errors: [
        "Unable to identify the omitted sample.",
      ],
    };
  }

  const trainingSamples =
    buildTrainingSamples(
      samples,
      omittedIndex,
    );

  if (!trainingSamples) {
    return {
      success: false,
      index: omittedIndex,
      sampleCode:
        getSampleIdentifier(
          omittedSample,
          omittedIndex,
        ),
      observed: omittedSample.value,
      predicted: null,
      error: null,
      absoluteError: null,
      squaredError: null,
      errorType:
        "invalid_training_set",
      errors: [
        "Unable to construct the LOOCV training set.",
      ],
    };
  }

  const target = {
    latitude:
      omittedSample.latitude,
    longitude:
      omittedSample.longitude,
  };

  const interpolationResult =
    interpolateSpline(
      trainingSamples,
      target,
      options,
    );

  if (
    !interpolationResult ||
    interpolationResult.success !== true
  ) {
    return {
      success: false,
      index: omittedIndex,
      sampleCode:
        getSampleIdentifier(
          omittedSample,
          omittedIndex,
        ),
      observed:
        omittedSample.value,
      predicted: null,
      error: null,
      absoluteError: null,
      squaredError: null,
      errorType:
        "interpolation_failure",
      errors:
        interpolationResult?.errors ??
        [
          interpolationResult?.error ??
            "LOOCV spline interpolation failed.",
        ],
      interpolationError:
        interpolationResult?.error ??
        null,
      geometry:
        interpolationResult?.geometry ??
        null,
      solverError:
        interpolationResult?.solverError ??
        null,
    };
  }

  const predicted =
    interpolationResult.prediction;

  if (!isFiniteNumber(predicted)) {
    return {
      success: false,
      index: omittedIndex,
      sampleCode:
        getSampleIdentifier(
          omittedSample,
          omittedIndex,
        ),
      observed:
        omittedSample.value,
      predicted: null,
      error: null,
      absoluteError: null,
      squaredError: null,
      errorType:
        "non_finite_prediction",
      errors: [
        "LOOCV produced a non-finite prediction.",
      ],
    };
  }

  const observed =
    omittedSample.value;

  const error =
    predicted - observed;

  const absoluteError =
    Math.abs(error);

  const squaredError =
    error * error;

  if (
    !isFiniteNumber(error) ||
    !isFiniteNumber(absoluteError) ||
    !isFiniteNumber(squaredError)
  ) {
    return {
      success: false,
      index: omittedIndex,
      sampleCode:
        getSampleIdentifier(
          omittedSample,
          omittedIndex,
        ),
      observed,
      predicted,
      error: null,
      absoluteError: null,
      squaredError: null,
      errorType:
        "non_finite_error",
      errors: [
        "LOOCV produced a non-finite prediction error.",
      ],
    };
  }

  return {
    success: true,
    index: omittedIndex,
    sampleCode:
      getSampleIdentifier(
        omittedSample,
        omittedIndex,
      ),
    observed,
    predicted,
    error,
    absoluteError,
    squaredError,
    errorType: null,
    errors: [],
  };
}

// ------------------------------------------------------------
// Error metrics
// ------------------------------------------------------------

function calculateCrossValidationMetrics(
  folds,
) {
  if (!Array.isArray(folds)) {
    return {
      valid: false,
      error:
        "LOOCV folds must be an array.",
      sampleCount: null,
      successfulFolds: 0,
      failedFolds: 0,
      meanError: null,
      meanAbsoluteError: null,
      rmse: null,
      maxAbsoluteError: null,
    };
  }

  const successfulFolds =
    folds.filter(
      (fold) =>
        fold &&
        fold.success === true &&
        isFiniteNumber(
          fold.error,
        ) &&
        isFiniteNumber(
          fold.absoluteError,
        ) &&
        isFiniteNumber(
          fold.squaredError,
        ),
    );

  const failedFolds =
    folds.length -
    successfulFolds.length;

  if (
    successfulFolds.length === 0
  ) {
    return {
      valid: false,
      error:
        "No successful LOOCV folds are available for metric calculation.",
      sampleCount: folds.length,
      successfulFolds: 0,
      failedFolds,
      meanError: null,
      meanAbsoluteError: null,
      rmse: null,
      maxAbsoluteError: null,
    };
  }

  const totalError =
    successfulFolds.reduce(
      (sum, fold) =>
        sum + fold.error,
      0,
    );

  const totalAbsoluteError =
    successfulFolds.reduce(
      (sum, fold) =>
        sum + fold.absoluteError,
      0,
    );

  const totalSquaredError =
    successfulFolds.reduce(
      (sum, fold) =>
        sum + fold.squaredError,
      0,
    );

  const maxAbsoluteError =
    successfulFolds.reduce(
      (maximum, fold) =>
        Math.max(
          maximum,
          fold.absoluteError,
        ),
      0,
    );

  const count =
    successfulFolds.length;

  const meanError =
    totalError / count;

  const meanAbsoluteError =
    totalAbsoluteError / count;

  const meanSquaredError =
    totalSquaredError / count;

  const rmse =
    Math.sqrt(meanSquaredError);

  const metricValues = [
    meanError,
    meanAbsoluteError,
    rmse,
    maxAbsoluteError,
  ];

  if (
    metricValues.some(
      (value) =>
        !isFiniteNumber(value),
    )
  ) {
    return {
      valid: false,
      error:
        "LOOCV metrics contain non-finite values.",
      sampleCount: folds.length,
      successfulFolds: count,
      failedFolds,
      meanError: null,
      meanAbsoluteError: null,
      rmse: null,
      maxAbsoluteError: null,
    };
  }

  return {
    valid: true,
    error: null,
    sampleCount: folds.length,
    successfulFolds: count,
    failedFolds,
    meanError,
    meanAbsoluteError,
    rmse,
    maxAbsoluteError,
  };
}

// ------------------------------------------------------------
// Leave-one-out cross-validation
// ------------------------------------------------------------

function performLeaveOneOutCrossValidation(
  samples,
  options = {},
) {
  const validation =
    validateLOOCVSamples(samples);

  if (!validation.valid) {
    return {
      success: false,
      error:
        "Invalid LOOCV samples.",
      errors: validation.errors,
      sampleCount:
        Array.isArray(samples)
          ? samples.length
          : null,
      folds: [],
      metrics: null,
    };
  }

  const folds = [];

  for (
    let index = 0;
    index < samples.length;
    index += 1
  ) {
    const fold =
      evaluateLOOCVFold(
        samples,
        index,
        options,
      );

    folds.push(fold);
  }

  const metrics =
    calculateCrossValidationMetrics(
      folds,
    );

  return {
    success: true,
    error: null,
    errors: [],
    method:
      "thin_plate_spline_loocv",
    sampleCount:
      samples.length,
    successfulFolds:
      metrics.successfulFolds,
    failedFolds:
      metrics.failedFolds,
    folds,
    metrics,
  };
}

// ------------------------------------------------------------
// Public alias
// ------------------------------------------------------------

const splineCrossValidation =
  performLeaveOneOutCrossValidation;

// ------------------------------------------------------------
// Exports
// ------------------------------------------------------------

module.exports = {
  MIN_LOOCV_SAMPLE_COUNT,

  validateLOOCVSamples,

  buildTrainingSamples,

  getSampleIdentifier,

  evaluateLOOCVFold,

  calculateCrossValidationMetrics,

  performLeaveOneOutCrossValidation,

  splineCrossValidation,
};