"use strict";

// ============================================================
// server/services/interpolation/nearestNeighbourInterpolation.js
// ============================================================
//
// Soil Analysis GIS
//
// Nearest-Neighbour Interpolation
//
// Scientific definition:
//   The predicted value at a target location is the observed
//   value of the geographically nearest known soil sample.
//
//   Z_hat(s0) = Z(si)
//
//   where:
//     si = arg min d(s0, sj)
//
// Responsibilities:
//   1. Validate soil sample inputs
//   2. Validate target coordinates
//   3. Calculate target-to-sample spatial distances
//   4. Identify the nearest sample
//   5. Return the nearest sample's observed value
//   6. Provide transparent interpolation diagnostics
//
// Design principles:
//   - Backend scientific calculation only
//   - Reuse spatialDistance.js
//   - No database access
//   - No GIS presentation logic
//   - No interpolation weighting
//   - Deterministic tie handling
//   - No mutation of caller inputs
//
// ============================================================

const {
  isFiniteNumber,
  validateCoordinates,
  buildTargetDistanceVector,
  findMinimumDistance,
} = require("./spatialDistance");

/* ============================================================
   CONSTANTS
   ============================================================ */

/**
 * Minimum number of samples required for
 * nearest-neighbour interpolation.
 *
 * A single known sample is sufficient because
 * the target simply receives that sample's value.
 */
const MIN_SAMPLE_COUNT = 1;

/**
 * Interpolation method identifier.
 */
const METHOD_IDENTIFIER = "nearest_neighbour";

/* ============================================================
   NUMERIC VALIDATION
   ============================================================ */

/**
 * Determine whether a value is a finite number.
 *
 * @param {*} value
 * @returns {boolean}
 */
function isFiniteNumericValue(value) {
  return isFiniteNumber(value);
}

/* ============================================================
   SAMPLE VALIDATION
   ============================================================ */

/**
 * Validate one soil sample.
 *
 * Required structure:
 *
 * {
 *   latitude: Number,
 *   longitude: Number,
 *   value: Number
 * }
 *
 * @param {*} sample
 * @returns {{
 *   valid: boolean,
 *   errors: string[]
 * }}
 */
function validateSample(sample) {
  const errors = [];

  if (!sample || typeof sample !== "object" || Array.isArray(sample)) {
    return {
      valid: false,
      errors: ["Sample must be an object."],
    };
  }

  if (!Object.prototype.hasOwnProperty.call(sample, "latitude")) {
    errors.push("Sample latitude is required.");
  } else if (!isFiniteNumericValue(sample.latitude)) {
    errors.push("Sample latitude must be a finite number.");
  }

  if (!Object.prototype.hasOwnProperty.call(sample, "longitude")) {
    errors.push("Sample longitude is required.");
  } else if (!isFiniteNumericValue(sample.longitude)) {
    errors.push("Sample longitude must be a finite number.");
  }

  if (!Object.prototype.hasOwnProperty.call(sample, "value")) {
    errors.push("Sample value is required.");
  } else if (!isFiniteNumericValue(sample.value)) {
    errors.push("Sample value must be a finite number.");
  }

      if (
    isFiniteNumericValue(sample.latitude) &&
    isFiniteNumericValue(sample.longitude)
  ) {
    const coordinatesValid = validateCoordinates(
      sample.latitude,
      sample.longitude,
    );

    if (!coordinatesValid) {
      errors.push(
        "Sample coordinates are outside the valid geographic range.",
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate all soil samples.
 *
 * @param {*} samples
 * @returns {{
 *   valid: boolean,
 *   errors: string[]
 * }}
 */
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
      `At least ${MIN_SAMPLE_COUNT} sample is required for nearest-neighbour interpolation.`,
    );
  }

  samples.forEach((sample, index) => {
    const validation = validateSample(sample);

    if (!validation.valid) {
      validation.errors.forEach((error) => {
        errors.push(`Sample ${index}: ${error}`);
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/* ============================================================
   TARGET VALIDATION
   ============================================================ */

/**
 * Validate an interpolation target.
 *
 * Required structure:
 *
 * {
 *   latitude: Number,
 *   longitude: Number
 * }
 *
 * @param {*} target
 * @returns {{
 *   valid: boolean,
 *   errors: string[]
 * }}
 */
function validateTarget(target) {
  const errors = [];

  if (!target || typeof target !== "object" || Array.isArray(target)) {
    return {
      valid: false,
      errors: ["Target must be an object."],
    };
  }

  if (!Object.prototype.hasOwnProperty.call(target, "latitude")) {
    errors.push("Target latitude is required.");
  } else if (!isFiniteNumericValue(target.latitude)) {
    errors.push("Target latitude must be a finite number.");
  }

  if (!Object.prototype.hasOwnProperty.call(target, "longitude")) {
    errors.push("Target longitude is required.");
  } else if (!isFiniteNumericValue(target.longitude)) {
    errors.push("Target longitude must be a finite number.");
  }

  if (
    isFiniteNumericValue(target.latitude) &&
    isFiniteNumericValue(target.longitude)
  ) {
    const coordinatesValid = validateCoordinates(
      target.latitude,
      target.longitude,
    );

    if (!coordinatesValid) {
      errors.push(
        "Target coordinates are outside the valid geographic range.",
      );
    }
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

/* ============================================================
   DISTANCE CALCULATION
   ============================================================ */

/**
 * Build the target-to-sample distance vector.
 *
 * This delegates all spatial-distance calculations to the
 * authoritative spatialDistance.js module.
 *
 * @param {Object} target
 * @param {Array<Object>} samples
 * @returns {number[]}
 */
function buildNearestNeighbourDistances(target, samples) {
  return buildTargetDistanceVector(target, samples);
}

/* ============================================================
   NEAREST SAMPLE SELECTION
   ============================================================ */

/**
 * Find the index of the nearest sample.
 *
 * The existing spatialDistance.js implementation is used so
 * that nearest-neighbour interpolation follows the same
 * distance calculation as the other interpolation methods.
 *
 * Ties are deterministic: the first minimum-distance sample
 * is selected.
 *
 * @param {number[]} distances
 * @returns {number}
 */
function findNearestSampleIndex(distances) {
  if (!Array.isArray(distances) || distances.length === 0) {
    return null;
  }

  let nearestIndex = 0;
  let nearestDistance = distances[0];

  if (!isFiniteNumericValue(nearestDistance)) {
    return null;
  }

  for (let index = 1; index < distances.length; index += 1) {
    const distance = distances[index];

    if (!isFiniteNumericValue(distance)) {
      return null;
    }

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  }

  return nearestIndex;
}

/**
 * Find the minimum target-to-sample distance.
 *
 * @param {number[]} distances
 * @returns {number}
 */
function findNearestSampleDistance(distances) {
  return findMinimumDistance(distances);
}

/* ============================================================
   PREDICTION
   ============================================================ */

/**
 * Calculate the nearest-neighbour prediction.
 *
 * @param {Object} nearestSample
 * @returns {number}
 */
function calculateNearestNeighbourPrediction(nearestSample) {
  return nearestSample.value;
}

/**
 * Validate a prediction.
 *
 * @param {*} prediction
 * @returns {boolean}
 */
function validatePrediction(prediction) {
  return isFiniteNumericValue(prediction);
}

/* ============================================================
   MAIN INTERPOLATION FUNCTION
   ============================================================ */

/**
 * Perform nearest-neighbour interpolation.
 *
 * Scientific formulation:
 *
 *   Z_hat(s0) = Z(si)
 *
 * where si is the sample location having the minimum
 * spatial distance from target location s0.
 *
 * @param {Array<Object>} samples
 * @param {Object} target
 *
 * @returns {{
 *   success: boolean,
 *   method?: string,
 *   prediction?: number,
 *   target?: {
 *     latitude: number,
 *     longitude: number
 *   },
 *   nearestSample?: Object,
 *   sampleCount?: number,
 *   diagnostics?: Object,
 *   error?: string,
 *   errors?: string[]
 * }}
 */
function interpolateNearestNeighbour(samples, target) {
  const sampleValidation = validateSamples(samples);

  if (!sampleValidation.valid) {
    return {
      success: false,
      error: "Invalid samples.",
      errors: sampleValidation.errors,
    };
  }

  const targetValidation = validateTarget(target);

  if (!targetValidation.valid) {
    return {
      success: false,
      error: "Invalid target.",
      errors: targetValidation.errors,
    };
  }

  let distances;

  try {
    distances = buildNearestNeighbourDistances(target, samples);
  } catch (error) {
    return {
      success: false,
      error: "Failed to calculate spatial distances.",
      errors: [error.message],
    };
  }

  if (!Array.isArray(distances) || distances.length !== samples.length) {
    return {
      success: false,
      error: "Invalid distance vector returned by spatial distance service.",
    };
  }

  if (!distances.every(isFiniteNumericValue)) {
    return {
      success: false,
      error: "Spatial distance calculation returned a non-finite value.",
    };
  }

  const nearestIndex = findNearestSampleIndex(distances);

  if (
    !Number.isInteger(nearestIndex) ||
    nearestIndex < 0 ||
    nearestIndex >= samples.length
  ) {
    return {
      success: false,
      error: "Unable to identify the nearest sample.",
    };
  }

  const nearestDistance = findNearestSampleDistance(distances);

  if (!isFiniteNumericValue(nearestDistance)) {
    return {
      success: false,
      error: "Nearest sample distance is not finite.",
    };
  }

  const nearestSample = samples[nearestIndex];

  const prediction =
    calculateNearestNeighbourPrediction(nearestSample);

  if (!validatePrediction(prediction)) {
    return {
      success: false,
      error: "Nearest-neighbour prediction is not finite.",
    };
  }

  return {
    success: true,
    method: METHOD_IDENTIFIER,
    prediction,
    target: {
      latitude: target.latitude,
      longitude: target.longitude,
    },
    nearestSample: {
      index: nearestIndex,
      latitude: nearestSample.latitude,
      longitude: nearestSample.longitude,
      value: nearestSample.value,
      distanceMetres: nearestDistance,
    },
    sampleCount: samples.length,
    diagnostics: {
      interpolationType: "nearest_neighbour",
      distanceMetric: "local_euclidean",
      weighting: "none",
      smoothing: false,
      tieHandling: "first_minimum_distance",
    },
  };
}

/* ============================================================
   ALIAS
   ============================================================ */

/**
 * Alias matching the conventional interpolation naming style.
 */
const nearestNeighbourInterpolation =
  interpolateNearestNeighbour;

/* ============================================================
   EXPORTS
   ============================================================ */

module.exports = {
  MIN_SAMPLE_COUNT,
  METHOD_IDENTIFIER,
  isFiniteNumericValue,
  validateSample,
  validateSamples,
  validateTarget,
  buildNearestNeighbourDistances,
  findNearestSampleIndex,
  findNearestSampleDistance,
  calculateNearestNeighbourPrediction,
  validatePrediction,
  interpolateNearestNeighbour,
  nearestNeighbourInterpolation,
};