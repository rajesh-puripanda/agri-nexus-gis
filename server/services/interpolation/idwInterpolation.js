"use strict";

// ============================================================
// server/services/interpolation/idwInterpolation.js
// ============================================================
//
// Soil Analysis GIS
//
// IDW Interpolation Engine
//
// Responsibilities:
//   1. Validate IDW samples and target
//   2. Calculate spatial distances
//   3. Calculate IDW prediction
//   4. Provide a stable IDW interpolation contract
//
// Scientific method:
//   Inverse Distance Weighting (IDW)
//
//   w_i = 1 / d_i^p
//
//   Z(x_0) = SUM(w_i * Z_i) / SUM(w_i)
//
// Notes:
//   - This module contains interpolation mathematics only.
//   - No database access.
//   - No HTTP/API logic.
//   - No GIS presentation logic.
//   - Distance calculation intentionally preserves the
//     original interpolationService.js implementation.
//
// ============================================================

const ZERO_DISTANCE_TOLERANCE = 1e-12;

const MIN_SAMPLE_COUNT = 1;

const METHOD_IDENTIFIER = "idw";

const DEFAULT_POWER = 2;

const MIN_POWER = 0.5;

const MAX_POWER = 10;

// ============================================================
// BASIC VALIDATION
// ============================================================

function isFiniteNumericValue(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function validateSample(sample, index = 0) {
  const errors = [];

  if (!sample || typeof sample !== "object") {
    errors.push(`Sample ${index} must be an object.`);
    return {
      valid: false,
      errors,
    };
  }

  const latitude = Number(sample.latitude);
  const longitude = Number(sample.longitude);
  const value = Number(sample.value);

  if (!Number.isFinite(latitude)) {
    errors.push(`Sample ${index} latitude must be numeric.`);
  } else if (latitude < -90 || latitude > 90) {
    errors.push(
      `Sample ${index} latitude must be between -90 and 90.`,
    );
  }

  if (!Number.isFinite(longitude)) {
    errors.push(`Sample ${index} longitude must be numeric.`);
  } else if (longitude < -180 || longitude > 180) {
    errors.push(
      `Sample ${index} longitude must be between -180 and 180.`,
    );
  }

  if (!Number.isFinite(value)) {
    errors.push(`Sample ${index} value must be numeric.`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateSamples(samples) {
  const errors = [];

  if (!Array.isArray(samples)) {
    return {
      valid: false,
      errors: ["Samples must be an array."],
    };
  }

  if (samples.length < MIN_SAMPLE_COUNT) {
    errors.push(
      `At least ${MIN_SAMPLE_COUNT} sample is required.`,
    );
  }

  samples.forEach((sample, index) => {
    const result = validateSample(sample, index);

    if (!result.valid) {
      errors.push(...result.errors);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateTarget(target) {
  const errors = [];

  if (!target || typeof target !== "object") {
    errors.push("Target must be an object.");

    return {
      valid: false,
      errors,
    };
  }

  const latitude = Number(target.latitude);
  const longitude = Number(target.longitude);

  if (!Number.isFinite(latitude)) {
    errors.push("Target latitude must be numeric.");
  } else if (latitude < -90 || latitude > 90) {
    errors.push(
      "Target latitude must be between -90 and 90.",
    );
  }

  if (!Number.isFinite(longitude)) {
    errors.push("Target longitude must be numeric.");
  } else if (longitude < -180 || longitude > 180) {
    errors.push(
      "Target longitude must be between -180 and 180.",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================
// DISTANCE
// ============================================================
//
// Original interpolationService.js distance calculation.
//
// This deliberately remains unchanged during the extraction
// refactor so existing IDW numerical behavior is preserved.
//
// The result is an angular/localized distance measure rather
// than metres.
//
// ============================================================

function calculateDistance(
  latitude1,
  longitude1,
  latitude2,
  longitude2,
) {
  const averageLatitude =
    ((latitude1 + latitude2) / 2) *
    (Math.PI / 180);

  const deltaLatitude =
    latitude1 - latitude2;

  const deltaLongitude =
    (longitude1 - longitude2) *
    Math.cos(averageLatitude);

  return Math.sqrt(
    deltaLatitude * deltaLatitude +
      deltaLongitude * deltaLongitude,
  );
}

// ============================================================
// DISTANCE VECTOR
// ============================================================

function buildIDWDistances(target, samples) {
  if (
    !target ||
    !Array.isArray(samples)
  ) {
    return [];
  }

  return samples.map((sample) =>
    calculateDistance(
      Number(target.latitude),
      Number(target.longitude),
      Number(sample.latitude),
      Number(sample.longitude),
    ),
  );
}

// ============================================================
// IDW POWER
// ============================================================

function validatePower(power) {
  const numericPower = Number(power);

  return (
    Number.isFinite(numericPower) &&
    numericPower >= MIN_POWER &&
    numericPower <= MAX_POWER
  );
}

// ============================================================
// IDW PREDICTION
// ============================================================

function calculateIDWPrediction(
  samples,
  distances,
  power = DEFAULT_POWER,
) {
  if (
    !Array.isArray(samples) ||
    !Array.isArray(distances) ||
    samples.length === 0 ||
    samples.length !== distances.length
  ) {
    return null;
  }

  if (!validatePower(power)) {
    return null;
  }

  let weightedValueSum = 0;

  let weightSum = 0;

  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];

    const distance = distances[index];

    const value = Number(sample.value);

    if (
      !Number.isFinite(distance) ||
      !Number.isFinite(value)
    ) {
      return null;
    }

    // Exact sample location.
    //
    // If the interpolation target coincides with a sample,
    // that sample's observed value is returned directly.
    if (
      Math.abs(distance) <=
      ZERO_DISTANCE_TOLERANCE
    ) {
      return value;
    }

    const weight =
      1 / Math.pow(distance, power);

    if (!Number.isFinite(weight)) {
      return null;
    }

    weightedValueSum += weight * value;

    weightSum += weight;
  }

  if (
    !Number.isFinite(weightSum) ||
    weightSum <= 0
  ) {
    return null;
  }

  const prediction =
    weightedValueSum / weightSum;

  return Number.isFinite(prediction)
    ? prediction
    : null;
}

// ============================================================
// PREDICTION VALIDATION
// ============================================================

function validatePrediction(prediction) {
  return (
    prediction !== null &&
    prediction !== undefined &&
    Number.isFinite(Number(prediction))
  );
}

// ============================================================
// HIGH-LEVEL IDW INTERPOLATION
// ============================================================

function interpolateIDW(
  samples,
  target,
  options = {},
) {
  const sampleValidation =
    validateSamples(samples);

  if (!sampleValidation.valid) {
    throw new Error(
      sampleValidation.errors.join(" "),
    );
  }

  const targetValidation =
    validateTarget(target);

  if (!targetValidation.valid) {
    throw new Error(
      targetValidation.errors.join(" "),
    );
  }

  const power =
    options.power === undefined ||
    options.power === null ||
    options.power === ""
      ? DEFAULT_POWER
      : Number(options.power);

  if (!validatePower(power)) {
    throw new Error(
      `Power must be between ${MIN_POWER} and ${MAX_POWER}.`,
    );
  }

  const distances =
    buildIDWDistances(
      target,
      samples,
    );

  const prediction =
    calculateIDWPrediction(
      samples,
      distances,
      power,
    );

  if (!validatePrediction(prediction)) {
    return {
      success: false,
      method: METHOD_IDENTIFIER,
      prediction: null,
      target: {
        latitude: Number(target.latitude),
        longitude: Number(target.longitude),
      },
      sampleCount: samples.length,
      power,
    };
  }

  return {
    success: true,
    method: METHOD_IDENTIFIER,
    prediction,
    target: {
      latitude: Number(target.latitude),
      longitude: Number(target.longitude),
    },
    sampleCount: samples.length,
    power,
  };
}

// ============================================================
// PUBLIC ALIAS
// ============================================================

function idwInterpolation(
  samples,
  target,
  options = {},
) {
  return interpolateIDW(
    samples,
    target,
    options,
  );
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  ZERO_DISTANCE_TOLERANCE,

  MIN_SAMPLE_COUNT,

  METHOD_IDENTIFIER,

  DEFAULT_POWER,

  MIN_POWER,

  MAX_POWER,

  isFiniteNumericValue,

  validateSample,

  validateSamples,

  validateTarget,

  calculateDistance,

  buildIDWDistances,

  validatePower,

  calculateIDWPrediction,

  validatePrediction,

  interpolateIDW,

  idwInterpolation,
};