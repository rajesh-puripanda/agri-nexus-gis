"use strict";

// ============================================================
// server/services/interpolation/idwCrossValidationService.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.8.2  IDW Cross-Validation Diagnostics
//
// Responsibilities:
//   1. Validate IDW LOOCV observations
//   2. Build leave-one-out training sets
//   3. Predict each held-out observation using existing IDW
//   4. Calculate fold errors
//   5. Calculate common cross-validation metrics
//   6. Preserve failed-fold diagnostics
//
// Scientific method:
//   Leave-one-out cross-validation (LOOCV)
//
//   For held-out observation i:
//
//     Training set = all observations except i
//
//     Z_hat_i = IDW prediction at x_i
//
//     e_i = Z_hat_i - Z_i
//
// Metrics:
//   meanError
//   meanAbsoluteError
//   RMSE
//   maxAbsoluteError
//
// Important:
//   - This module does not modify IDW mathematics.
//   - Existing IDW distance calculation is reused.
//   - Existing IDW power validation is reused.
//   - No acceptance threshold is applied.
//   - No method ranking or method selection is performed.
//   - Cross-validation is diagnostic only.
//   - Failed folds are excluded from metric calculation.
//   - Failed-fold diagnostics remain available.
//
// ============================================================

const {
  interpolateIDW,
  validateSamples,
  validateSample,
  buildIDWDistances,
  calculateIDWPrediction,
  validatePrediction,
  DEFAULT_POWER,
  MIN_POWER,
  MAX_POWER,
  MIN_SAMPLE_COUNT,
} = require("./idwInterpolation");

const MIN_LOOCV_SAMPLE_COUNT = 2;

const VALIDATION_METHOD = "leave_one_out";

const METHOD_IDENTIFIER = "idw_loocv";

// ============================================================
// BASIC NUMERIC VALIDATION
// ============================================================

function isFiniteNumericValue(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

// ============================================================
// LOOCV INPUT VALIDATION
// ============================================================

function validateLOOCVSamples(samples) {
  const errors = [];

  if (!Array.isArray(samples)) {
    return {
      valid: false,
      errors: ["Samples must be an array."],
    };
  }

  if (
    samples.length <
    MIN_LOOCV_SAMPLE_COUNT
  ) {
    errors.push(
      `At least ${MIN_LOOCV_SAMPLE_COUNT} samples are required for IDW leave-one-out cross-validation.`,
    );
  }

  samples.forEach((sample, index) => {
    const result =
      validateSample(
        sample,
        index,
      );

    if (!result.valid) {
      errors.push(...result.errors);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================
// TRAINING SAMPLE CONSTRUCTION
// ============================================================

function buildTrainingSamples(
  samples,
  heldOutIndex,
) {
  if (!Array.isArray(samples)) {
    return [];
  }

  if (
    !Number.isInteger(heldOutIndex) ||
    heldOutIndex < 0 ||
    heldOutIndex >= samples.length
  ) {
    return [];
  }

  return samples.filter(
    (_, index) =>
      index !== heldOutIndex,
  );
}

// ============================================================
// SAMPLE IDENTIFIER
// ============================================================

function getSampleIdentifier(
  sample,
  index,
) {
  if (
    sample &&
    sample.sample_code !== undefined &&
    sample.sample_code !== null &&
    String(sample.sample_code).trim() !== ""
  ) {
    return String(sample.sample_code);
  }

  if (
    sample &&
    sample.sampleCode !== undefined &&
    sample.sampleCode !== null &&
    String(sample.sampleCode).trim() !== ""
  ) {
    return String(sample.sampleCode);
  }

  if (
    sample &&
    sample.id !== undefined &&
    sample.id !== null &&
    String(sample.id).trim() !== ""
  ) {
    return String(sample.id);
  }

  return `sample_${index}`;
}

// ============================================================
// ERROR NORMALIZATION
// ============================================================

function normalizeError(
  predicted,
  observed,
) {
  const predictedValue =
    Number(predicted);

  const observedValue =
    Number(observed);

  if (
    !Number.isFinite(predictedValue) ||
    !Number.isFinite(observedValue)
  ) {
    return null;
  }

  return (
    predictedValue -
    observedValue
  );
}

// ============================================================
// SINGLE LOOCV FOLD
// ============================================================

function evaluateLOOCVFold(
  samples,
  heldOutIndex,
  options = {},
) {
  if (!Array.isArray(samples)) {
    return {
      success: false,
      index: heldOutIndex,
      sampleCode: null,
      observed: null,
      predicted: null,
      error: null,
      absoluteError: null,
      squaredError: null,
      errorType:
        "invalid_samples",
      errors: [
        "Samples must be an array.",
      ],
    };
  }

  const heldOutSample =
    samples[heldOutIndex];

  if (!heldOutSample) {
    return {
      success: false,
      index: heldOutIndex,
      sampleCode: null,
      observed: null,
      predicted: null,
      error: null,
      absoluteError: null,
      squaredError: null,
      errorType:
        "invalid_held_out_sample",
      errors: [
        `Held-out sample at index ${heldOutIndex} does not exist.`,
      ],
    };
  }

  const trainingSamples =
    buildTrainingSamples(
      samples,
      heldOutIndex,
    );

  if (
    trainingSamples.length <
    MIN_SAMPLE_COUNT
  ) {
    return {
      success: false,
      index: heldOutIndex,
      sampleCode:
        getSampleIdentifier(
          heldOutSample,
          heldOutIndex,
        ),
      observed:
        Number(heldOutSample.value),
      predicted: null,
      error: null,
      absoluteError: null,
      squaredError: null,
      errorType:
        "insufficient_training_samples",
      errors: [
        `IDW requires at least ${MIN_SAMPLE_COUNT} training sample.`,
      ],
    };
  }

  const observed =
    Number(heldOutSample.value);

  if (!Number.isFinite(observed)) {
    return {
      success: false,
      index: heldOutIndex,
      sampleCode:
        getSampleIdentifier(
          heldOutSample,
          heldOutIndex,
        ),
      observed: null,
      predicted: null,
      error: null,
      absoluteError: null,
      squaredError: null,
      errorType:
        "invalid_observed_value",
      errors: [
        "Held-out observed value must be numeric.",
      ],
    };
  }

  const target = {
    latitude:
      Number(
        heldOutSample.latitude,
      ),
    longitude:
      Number(
        heldOutSample.longitude,
      ),
  };

  const power =
    options.power === undefined ||
    options.power === null ||
    options.power === ""
      ? DEFAULT_POWER
      : Number(options.power);

  if (
    !Number.isFinite(power) ||
    power < MIN_POWER ||
    power > MAX_POWER
  ) {
    return {
      success: false,
      index: heldOutIndex,
      sampleCode:
        getSampleIdentifier(
          heldOutSample,
          heldOutIndex,
        ),
      observed,
      predicted: null,
      error: null,
      absoluteError: null,
      squaredError: null,
      errorType:
        "invalid_power",
      errors: [
        `Power must be between ${MIN_POWER} and ${MAX_POWER}.`,
      ],
    };
  }

  let prediction = null;

  try {
    const distances =
      buildIDWDistances(
        target,
        trainingSamples,
      );

    prediction =
      calculateIDWPrediction(
        trainingSamples,
        distances,
        power,
      );
  } catch (error) {
    return {
      success: false,
      index: heldOutIndex,
      sampleCode:
        getSampleIdentifier(
          heldOutSample,
          heldOutIndex,
        ),
      observed,
      predicted: null,
      error: null,
      absoluteError: null,
      squaredError: null,
      errorType:
        "prediction_error",
      errors: [
        error instanceof Error
          ? error.message
          : String(error),
      ],
    };
  }

  if (
    !validatePrediction(
      prediction,
    )
  ) {
    return {
      success: false,
      index: heldOutIndex,
      sampleCode:
        getSampleIdentifier(
          heldOutSample,
          heldOutIndex,
        ),
      observed,
      predicted: null,
      error: null,
      absoluteError: null,
      squaredError: null,
      errorType:
        "invalid_prediction",
      errors: [
        "IDW returned an invalid prediction.",
      ],
    };
  }

  const error =
    normalizeError(
      prediction,
      observed,
    );

  if (!isFiniteNumericValue(error)) {
    return {
      success: false,
      index: heldOutIndex,
      sampleCode:
        getSampleIdentifier(
          heldOutSample,
          heldOutIndex,
        ),
      observed,
      predicted:
        Number(prediction),
      error: null,
      absoluteError: null,
      squaredError: null,
      errorType:
        "invalid_error",
      errors: [
        "Unable to calculate a finite LOOCV error.",
      ],
    };
  }

  const absoluteError =
    Math.abs(error);

  const squaredError =
    error * error;

  return {
    success: true,
    index: heldOutIndex,
    sampleCode:
      getSampleIdentifier(
        heldOutSample,
        heldOutIndex,
      ),
    observed,
    predicted:
      Number(prediction),
    error,
    absoluteError,
    squaredError,
    errorType: null,
    errors: [],
    power,
    trainingSampleCount:
      trainingSamples.length,
  };
}

// ============================================================
// CROSS-VALIDATION METRICS
// ============================================================

function calculateCrossValidationMetrics(
  folds,
) {
  if (!Array.isArray(folds)) {
    return {
      valid: false,
      error:
        "Folds must be an array.",
      sampleCount: 0,
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
        isFiniteNumericValue(
          fold.error,
        ) &&
        isFiniteNumericValue(
          fold.absoluteError,
        ) &&
        isFiniteNumericValue(
          fold.squaredError,
        ),
    );

  const failedFolds =
    folds.filter(
      (fold) =>
        !fold ||
        fold.success !== true,
    );

  if (
    successfulFolds.length === 0
  ) {
    return {
      valid: false,
      error:
        "No successful LOOCV folds are available for metric calculation.",
      sampleCount: folds.length,
      successfulFolds: 0,
      failedFolds:
        failedFolds.length,
      meanError: null,
      meanAbsoluteError: null,
      rmse: null,
      maxAbsoluteError: null,
    };
  }

  let errorSum = 0;

  let absoluteErrorSum = 0;

  let squaredErrorSum = 0;

  let maxAbsoluteError = 0;

  successfulFolds.forEach(
    (fold) => {
      errorSum += fold.error;

      absoluteErrorSum +=
        fold.absoluteError;

      squaredErrorSum +=
        fold.squaredError;

      if (
        fold.absoluteError >
        maxAbsoluteError
      ) {
        maxAbsoluteError =
          fold.absoluteError;
      }
    },
  );

  const count =
    successfulFolds.length;

  const meanError =
    errorSum / count;

  const meanAbsoluteError =
    absoluteErrorSum / count;

  const meanSquaredError =
    squaredErrorSum / count;

  const rmse =
    Math.sqrt(meanSquaredError);

  return {
    valid:
      Number.isFinite(
        meanError,
      ) &&
      Number.isFinite(
        meanAbsoluteError,
      ) &&
      Number.isFinite(rmse) &&
      Number.isFinite(
        maxAbsoluteError,
      ),
    error: null,
    sampleCount: folds.length,
    successfulFolds: count,
    failedFolds:
      failedFolds.length,
    meanError,
    meanAbsoluteError,
    rmse,
    maxAbsoluteError,
  };
}

// ============================================================
// FULL LEAVE-ONE-OUT CROSS-VALIDATION
// ============================================================

function performLeaveOneOutCrossValidation(
  samples,
  options = {},
) {
  const validation =
    validateLOOCVSamples(
      samples,
    );

  if (!validation.valid) {
    return {
      success: false,
      status: "failed",
      method: METHOD_IDENTIFIER,
      validationMethod:
        VALIDATION_METHOD,
      sampleCount:
        Array.isArray(samples)
          ? samples.length
          : null,
      minimumSampleCount:
        MIN_LOOCV_SAMPLE_COUNT,
      successfulFolds: 0,
      failedFolds: 0,
      folds: [],
      metrics: null,
      error:
        validation.errors.join(" "),
      errors: validation.errors,
    };
  }

  const folds = [];

  for (
    let index = 0;
    index < samples.length;
    index += 1
  ) {
    folds.push(
      evaluateLOOCVFold(
        samples,
        index,
        options,
      ),
    );
  }

  const metrics =
    calculateCrossValidationMetrics(
      folds,
    );

  return {
    success: true,
    status: "complete",
    method: METHOD_IDENTIFIER,
    validationMethod:
      VALIDATION_METHOD,
    sampleCount:
      samples.length,
    minimumSampleCount:
      MIN_LOOCV_SAMPLE_COUNT,
    successfulFolds:
      metrics.successfulFolds,
    failedFolds:
      metrics.failedFolds,
    folds,
    metrics,
    error: null,
    errors: [],
  };
}

// ============================================================
// PUBLIC ALIAS
// ============================================================

function idwCrossValidation(
  samples,
  options = {},
) {
  return performLeaveOneOutCrossValidation(
    samples,
    options,
  );
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  MIN_LOOCV_SAMPLE_COUNT,

  VALIDATION_METHOD,

  METHOD_IDENTIFIER,

  DEFAULT_POWER,

  MIN_POWER,

  MAX_POWER,

  isFiniteNumericValue,

  validateLOOCVSamples,

  buildTrainingSamples,

  getSampleIdentifier,

  normalizeError,

  evaluateLOOCVFold,

  calculateCrossValidationMetrics,

  performLeaveOneOutCrossValidation,

  idwCrossValidation,
};
