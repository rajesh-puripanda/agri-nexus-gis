"use strict";

// ============================================================
// server/services/interpolation/experimentalVariogramService.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.4.2  Scientific Estimation Input Construction
//
// Responsibilities:
//   1. Validate soil observations
//   2. Extract interpolation coordinates and values
//   3. Build the authoritative spatial distance matrix
//   4. Build the authoritative experimental semivariogram
//   5. Expose construction diagnostics
//
// Does NOT:
//   - calculate spatial distances directly
//   - calculate semivariance directly
//   - estimate variogram parameters
//   - perform Kriging
//   - modify interpolationService.js
//
// ============================================================

const {
  buildDistanceMatrix,
} = require("./spatialDistance");

const {
  calculateExperimentalSemivariogram,
} = require("./variogram");

// ============================================================
// VALIDATION
// ============================================================

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function isValidObservation(point) {
  if (!point || typeof point !== "object") {
    return false;
  }

  const latitude = Number(point.latitude);
  const longitude = Number(point.longitude);
  const value = Number(point.value);

  return (
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    Number.isFinite(value)
  );
}

// ============================================================
// EXTRACT VALID OBSERVATIONS
// ============================================================

function extractValidObservations(points) {
  if (!Array.isArray(points)) {
    return {
      observations: [],
      invalidCount: 0,
    };
  }

  const observations = [];
  let invalidCount = 0;

  for (const point of points) {
    if (!isValidObservation(point)) {
      invalidCount += 1;
      continue;
    }

    observations.push({
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
      value: Number(point.value),
    });
  }

  return {
    observations,
    invalidCount,
  };
}

// ============================================================
// BUILD EXPERIMENTAL VARIOGRAM
// ============================================================

function buildExperimentalVariogram({
  points,
  options = {},
} = {}) {
  if (!Array.isArray(points)) {
    return {
      success: false,
      experimental: null,
      diagnostics: {
        sampleCount: 0,
        validSampleCount: 0,
        invalidSampleCount: 0,
        distanceMetric: "local_euclidean",
        distanceUnit: "metres",
      },
      error: "points must be an array.",
    };
  }

  const {
    observations,
    invalidCount,
  } = extractValidObservations(points);

  const diagnostics = {
    sampleCount: points.length,
    validSampleCount: observations.length,
    invalidSampleCount: invalidCount,
    distanceMetric: "local_euclidean",
    distanceUnit: "metres",
  };

  if (observations.length < 2) {
    return {
      success: false,
      experimental: null,
      diagnostics,
      error:
        "At least two valid soil observations are required to construct an experimental semivariogram.",
    };
  }

  try {
    const distanceMatrix =
      buildDistanceMatrix(observations);

    const experimental =
      calculateExperimentalSemivariogram(
        observations,
        distanceMatrix,
        options,
      );

    return {
      success: true,
      experimental,
      diagnostics,
    };
  } catch (error) {
    return {
      success: false,
      experimental: null,
      diagnostics,
      error:
        error?.message ??
        "Unable to construct experimental semivariogram.",
    };
  }
}

// ============================================================
// PUBLIC API
// ============================================================

module.exports = {
  isFiniteNumber,
  isValidObservation,
  extractValidObservations,
  buildExperimentalVariogram,
};
